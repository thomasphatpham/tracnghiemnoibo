import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DepartmentStatus } from '@prisma/client';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tên phòng ban tối đa 100 ký tự' })
  name?: string;

  @IsOptional()
  @IsEnum(DepartmentStatus, { message: 'Trạng thái phòng ban không hợp lệ' })
  status?: DepartmentStatus;
}
