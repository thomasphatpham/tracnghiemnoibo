import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Get,
  Patch,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Headers('user-agent') userAgent: string) {
    return this.authService.login(loginDto, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id, user.sessionId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        position: true,
        role: true,
        status: true,
        departmentId: true,
        department: {
          select: { id: true, code: true, name: true, status: true },
        },
        createdAt: true,
      },
    });
    return { user };
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: any,
    @Body() body: { fullName?: string; position?: string; departmentId?: string },
  ) {
    const dataToUpdate: any = {};

    if (body.fullName !== undefined) {
      dataToUpdate.fullName = body.fullName.trim();
    }
    if (body.position !== undefined) {
      dataToUpdate.position = body.position.trim();
    }

    // BUSINESS RULE (Phase 0 Decision):
    // Employee can ONLY set department on first-time setup (status === REQUIRE_SETUP)
    // Once ACTIVE, Employee CANNOT change department - only Admin can!
    if (body.departmentId) {
      if (user.role === 'EMPLOYEE' && user.status !== UserStatus.REQUIRE_SETUP) {
        throw new BadRequestException(
          'Nhân viên không được tự thay đổi phòng ban sau khi đã hoàn tất thiết lập ban đầu. Vui lòng liên hệ Quản trị viên.',
        );
      }

      // Validate department exists and is active
      const dep = await this.prisma.department.findUnique({
        where: { id: body.departmentId },
      });
      if (!dep || dep.status !== 'ACTIVE') {
        throw new BadRequestException('Phòng ban đã chọn không tồn tại hoặc không còn hiệu lực.');
      }
      dataToUpdate.departmentId = body.departmentId;

      // If user was in REQUIRE_SETUP, activate them
      if (user.status === UserStatus.REQUIRE_SETUP) {
        dataToUpdate.status = UserStatus.ACTIVE;
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        position: true,
        role: true,
        status: true,
        departmentId: true,
        department: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return {
      message: 'Cập nhật thông tin thành công.',
      user: updatedUser,
    };
  }
}
