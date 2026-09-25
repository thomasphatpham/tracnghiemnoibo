import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsNotEmpty({ message: 'Mã phòng ban không được để trống' })
  @IsString()
  @MaxLength(20, { message: 'Mã phòng ban tối đa 20 ký tự' })
  code: string;

  @IsNotEmpty({ message: 'Tên phòng ban không được để trống' })
  @IsString()
  @MaxLength(100, { message: 'Tên phòng ban tối đa 100 ký tự' })
  name: string;
}
