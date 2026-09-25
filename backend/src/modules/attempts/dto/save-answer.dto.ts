import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class SaveAnswerDto {
  @IsInt({ message: 'Thứ tự câu hỏi (position) phải là số nguyên' })
  @Min(1, { message: 'Position tối thiểu là 1' })
  position: number;

  @IsOptional()
  @IsString({ message: 'selectedOptionKey phải là chuỗi (A, B, C, D) hoặc null' })
  selectedOptionKey?: string | null;
}
