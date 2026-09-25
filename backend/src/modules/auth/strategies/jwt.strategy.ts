import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  sessionId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-jwt-key-change-in-production-tracnghiemnoibo-2026'),
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: userId, sessionId } = payload;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại.');
    }

    if (user.status === UserStatus.LOCKED) {
      throw new UnauthorizedException('Tài khoản đã bị khóa bởi quản trị viên.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${minutesRemaining} phút.`);
    }

    // Validate Single Active Session
    if (sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException(
          'Phiên làm việc đã bị thu hồi bởi lượt đăng nhập mới trên thiết bị/trình duyệt khác.',
        );
      }
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      position: user.position,
      role: user.role,
      status: user.status,
      departmentId: user.departmentId,
      department: user.department,
      sessionId,
    };
  }
}
