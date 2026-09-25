import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController, MeController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'super-secret-jwt-key-change-in-production-tracnghiemnoibo-2026'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '1d') as any,
        },
      }),
    }),
    EmailModule,
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
