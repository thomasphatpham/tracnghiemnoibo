import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionStatus } from '@prisma/client';

export class CreateOptionDto {
  @IsNotEmpty({ message: 'Mã đáp án không được để trống' })
  @IsIn(['A', 'B', 'C', 'D'], { message: 'Mã đáp án phải là A, B, C hoặc D' })
  key: string;

  @IsNotEmpty({ message: 'Nội dung đáp án không được để trống' })
  @IsString()
  content: string;

  @IsBoolean({ message: 'Trường isCorrect phải là kiểu boolean (true/false)' })
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsNotEmpty({ message: 'Mã câu hỏi không được để trống' })
  @IsString()
  code: string;

  @IsNotEmpty({ message: 'Nội dung câu hỏi không được để trống' })
  @IsString()
  content: string;

  @IsNotEmpty({ message: 'Phòng ban không được để trống' })
  @IsString()
  departmentId: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(QuestionStatus, { message: 'Trạng thái câu hỏi không hợp lệ' })
  status?: QuestionStatus = QuestionStatus.ACTIVE;

  @IsArray({ message: 'Danh sách đáp án phải là một mảng' })
  @ArrayMinSize(4, { message: 'Câu hỏi trắc nghiệm phải có đủ 4 đáp án (A, B, C, D)' })
  @ArrayMaxSize(4, { message: 'Câu hỏi trắc nghiệm phải có tối đa 4 đáp án (A, B, C, D)' })
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}
