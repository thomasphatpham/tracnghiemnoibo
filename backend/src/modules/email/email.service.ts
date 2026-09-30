import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { join } from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = this.configService.get<number>('SMTP_PORT', 1025);
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASS', '');
    const secureEnv = this.configService.get<string>('SMTP_SECURE', 'false');
    const secure = secureEnv === 'true';

    const transportOptions: nodemailer.TransportOptions = {
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: false
      }
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

  async sendAccountApprovalEmail(to: string, fullName: string, username: string, defaultPassword: string): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM', 'kythuatsdtc@gmail.com');
    const subject = `Tài khoản hệ thống của nhân viên đã được phê duyệt`;
    const text = `Kính gửi ${fullName},\n\nYêu cầu cấp tài khoản của nhân viên đã được phê duyệt.\n\nThông tin đăng nhập:\n- Tên đăng nhập: ${username}\n- Mật khẩu: ${defaultPassword}\n\nVui lòng đổi mật khẩu sau khi đăng nhập lần đầu tiên để bảo mật.`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        
        <div style="background-color: #FFFFFF; padding: 25px 20px; text-align: center;">
          <img src="cid:bank_logo" alt="Bank Logo" style="width: 80px; height: auto; margin-bottom: 10px;">
          <h2 style="color: #003366; margin: 0; font-size: 20px; font-weight: 600; text-transform: uppercase;">Ngân Hàng Trắc Nghiệm</h2>
        </div>
        
        <div style="padding: 30px 25px; color: #374151; line-height: 1.6;">
          <h3 style="color: #003366; margin-top: 0; font-size: 18px; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Thông Báo Cấp Tài Khoản Thành Công</h3>
          <p>Kính gửi <strong>${fullName}</strong>,</p>
          <p>Yêu cầu đăng ký tài khoản của nhân viên trên <strong>Hệ Thống Thi Trắc Nghiệm Nội Bộ SDTC</strong> đã được Phòng Kỹ Thuật phê duyệt.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #003366; padding: 20px; margin: 25px 0; border-radius: 0 6px 6px 0;">
            <p style="margin: 0 0 12px 0; font-size: 15px;"><strong>Tên đăng nhập:</strong> <span style="color: #003366; font-size: 16px;">${username}</span></p>
            <p style="margin: 0; font-size: 15px;"><strong>Mật khẩu truy cập:</strong> <span style="color: #003366; font-weight: bold; font-size: 16px; background-color: #e0e7ff; padding: 4px 8px; border-radius: 4px;">${defaultPassword}</span></p>
          </div>
          
          <div style="background-color: #fff1f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #be123c; margin: 0; font-size: 14px;">
              <strong>⚠️ LƯU Ý BẢO MẬT QUAN TRỌNG:</strong><br>
              Vì lý do an toàn thông tin, nhân viên vui lòng tiến hành <strong>đổi mật khẩu ngay lập tức</strong> sau khi đăng nhập thành công lần đầu tiên. Tuyệt đối không cung cấp mật khẩu này cho bất kỳ ai.
            </p>
          </div>
          
          <p style="margin-bottom: 0;">Trân trọng,<br><strong>Phòng Kỹ Thuật SDTC</strong></p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 5px 0;">Đây là email tự động từ hệ thống. Vui lòng không trả lời email này.</p>
          <p style="margin: 0;">© ${new Date().getFullYear()} Bản quyền thuộc về Ngân Hàng SAIGONBANK. Thông tin bảo mật nội bộ.</p>
        </div>
      </div>
    `;

    this.logger.log(`📬 [Approval Dispatch] Recipient: ${to} | Username: ${username}`);

try {
      // SỬA: Đính kèm hình ảnh và gán Content ID
      await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
        // attachments: [
        //   {
        //     filename: 'logo.png',
        //     path: join(process.cwd(), 'public', 'logo.png'),
        //     cid: 'bank_logo'
        //   }
        // ]
      });
      this.logger.log(`✅ Email approval sent successfully to ${to}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`⚠️ Could not send approval email via SMTP (${err.message}).`);
      return false;
    }
  }
}
