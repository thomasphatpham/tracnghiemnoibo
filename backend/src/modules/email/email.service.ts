import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = this.configService.get<number>('SMTP_PORT', 1025);
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASS', '');
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);

    const transportOptions: nodemailer.TransportOptions = {
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    } as any;

    this.transporter = nodemailer.createTransport(transportOptions);
  }

  async sendOtpEmail(to: string, otp: string, minutes: number = 10): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM', 'no-reply@tracnghiem.local');
    const subject = `[Hệ Thống Thi Trắc Nghiệm] Mã xác thực OTP khôi phục mật khẩu: ${otp}`;
    const text = `Xin chào,\n\nMã xác thực OTP của bạn là: ${otp}\nMã này có hiệu lực trong vòng ${minutes} phút.\nNếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #1e3a8a; text-align: center;">Mã Xác Thực OTP</h2>
        <p>Xin chào,</p>
        <p>Bạn đã gửi yêu cầu đặt lại mật khẩu cho tài khoản tại <strong>Hệ Thống Thi Trắc Nghiệm Trực Tuyến Nội Bộ</strong>.</p>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">Mã xác thực có hiệu lực trong vòng <strong>${minutes} phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
      </div>
    `;

    // Always log OTP to server console for easy testing during development
    this.logger.log(`📬 [OTP Dispatch] Recipient: ${to} | Code: [${otp}] (Valid ${minutes}m)`);

    try {
      await this.transporter.sendMail({ from, to, subject, text, html });
      this.logger.log(`✅ Email OTP sent successfully to ${to}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`⚠️ Could not send email via SMTP (${err.message}). The OTP code [${otp}] is printed above.`);
      return false;
    }
  }
}
