import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role, UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò người dùng không hợp lệ' })
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái người dùng không hợp lệ' })
  status?: UserStatus;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
