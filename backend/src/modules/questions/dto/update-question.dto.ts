import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionStatus } from '@prisma/client';
import { CreateOptionDto } from './create-question.dto';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}
