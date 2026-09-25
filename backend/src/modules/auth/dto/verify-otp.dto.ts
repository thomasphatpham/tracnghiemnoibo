import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP gồm đúng 6 chữ số' })
  otp: string;
}
