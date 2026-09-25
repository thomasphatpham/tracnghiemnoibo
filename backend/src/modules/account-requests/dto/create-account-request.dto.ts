import { IsNotEmpty, IsString, IsEmail, IsOptional, Matches } from 'class-validator';

export class CreateAccountRequestDto {
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'Tên đăng nhập / Mã nhân viên không được để trống' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Tên đăng nhập chỉ bao gồm chữ cái, chữ số, dấu gạch dưới hoặc gạch ngang',
  })
  username: string;

  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'Vui lòng chọn phòng ban' })
  @IsString()
  departmentId: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
