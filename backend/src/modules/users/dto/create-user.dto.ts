import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role, UserStatus } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString()
  @MinLength(3, { message: 'Tên đăng nhập tối thiểu 3 ký tự' })
  username: string;

  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password?: string;

  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò người dùng không hợp lệ' })
  role?: Role = Role.EMPLOYEE;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái người dùng không hợp lệ' })
  status?: UserStatus = UserStatus.ACTIVE;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
