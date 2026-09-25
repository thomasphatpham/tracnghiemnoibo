import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async login(loginDto: LoginDto, deviceInfo?: string) {
    const { usernameOrEmail, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail.trim() },
          { email: usernameOrEmail.trim().toLowerCase() },
        ],
      },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    // Check account status
    if (user.status === UserStatus.LOCKED) {
      throw new UnauthorizedException('Tài khoản đã bị quản trị viên khóa.');
    }

    // Check temporary lockout
    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      throw new UnauthorizedException(
        `Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${minutesRemaining} phút.`,
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const maxAttempts = this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5);
      const lockoutMinutes = this.configService.get<number>('LOGIN_LOCKOUT_MINUTES', 15);
      const newFailedCount = user.failedLoginCount + 1;

      let lockUntil: Date | null = null;
      if (newFailedCount >= maxAttempts) {
        lockUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: newFailedCount,
          lockedUntil: lockUntil,
        },
      });

      if (lockUntil) {
        throw new UnauthorizedException(
          `Bạn đã nhập sai mật khẩu ${newFailedCount} lần. Tài khoản tạm khóa trong ${lockoutMinutes} phút.`,
        );
      }

      const remainingAttempts = maxAttempts - newFailedCount;
      throw new UnauthorizedException(
        `Mật khẩu không chính xác. Bạn còn ${remainingAttempts} lần thử trước khi tài khoản bị tạm khóa.`,
      );
    }

    // Reset failed count on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // SINGLE ACTIVE SESSION POLICY:
    // Revoke all previous active sessions for this user
    await this.prisma.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    // Create a new session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: sessionTokenHash,
        deviceInfo: deviceInfo || 'Web Browser',
        expiresAt: sessionExpiresAt,
      },
    });

    // Generate JWT
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      sessionId: session.id,
    };

    const accessToken = this.jwtService.sign(payload);

    // Audit Log: LOGIN
    await this.prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'User',
          entityId: user.id,
          details: {
            username: user.username,
            deviceInfo: deviceInfo || 'Web Browser',
          },
        },
      })
      .catch((e) => this.logger.warn(`Failed to log LOGIN: ${e.message}`));

    return {
      message: 'Đăng nhập thành công',
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        position: user.position,
        role: user.role,
        status: user.status,
        departmentId: user.departmentId,
        department: user.department,
      },
    };
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, userId },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    // Audit Log: LOGOUT
    await this.prisma.auditLog
      .create({
        data: {
          userId,
          action: 'LOGOUT',
          entity: 'User',
          entityId: userId,
        },
      })
      .catch((e) => this.logger.warn(`Failed to log LOGOUT: ${e.message}`));

    return { message: 'Đăng xuất thành công' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return safe message without revealing email existence
      return { message: 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi đến email của bạn.' };
    }

    if (user.status === UserStatus.LOCKED) {
      throw new BadRequestException('Tài khoản đã bị khóa, không thể gửi yêu cầu đặt lại mật khẩu.');
    }

    // Invalidate old unexpired OTPs
    await this.prisma.passwordResetOtp.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const otpExpiresMinutes = this.configService.get<number>('OTP_EXPIRES_MINUTES', 10);
    const expiresAt = new Date(Date.now() + otpExpiresMinutes * 60 * 1000);

    await this.prisma.passwordResetOtp.create({
      data: {
        email,
        otpHash,
        expiresAt,
      },
    });

    await this.emailService.sendOtpEmail(email, rawOtp, otpExpiresMinutes);

    return { message: 'Mã xác thực OTP đã được gửi đến email của bạn.' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const maxOtpAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 3);

    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn.');
    }

    if (otpRecord.attempts >= maxOtpAttempts) {
      throw new BadRequestException('Mã OTP đã bị vô hiệu hóa do thử sai quá số lần quy định.');
    }

    const isMatch = await bcrypt.compare(dto.otp, otpRecord.otpHash);
    if (!isMatch) {
      await this.prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      const remaining = maxOtpAttempts - (otpRecord.attempts + 1);
      throw new BadRequestException(
        remaining > 0
          ? `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`
          : 'Mã OTP không chính xác. Mã đã bị vô hiệu hóa.',
      );
    }

    return { valid: true, message: 'Xác thực OTP thành công.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    await this.verifyOtp({ email, otp: dto.otp });

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản tương ứng.');
    }

    // Mark OTP as used
    await this.prisma.passwordResetOtp.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update user and unlock
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Revoke all sessions so the user must log in with new password
    await this.prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng.');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Audit Log: CHANGE_PASSWORD
    await this.prisma.auditLog
      .create({
        data: {
          userId,
          action: 'CHANGE_PASSWORD',
          entity: 'User',
          entityId: userId,
        },
      })
      .catch((e) => this.logger.warn(`Failed to log CHANGE_PASSWORD: ${e.message}`));

    return { message: 'Đổi mật khẩu thành công.' };
  }
}
