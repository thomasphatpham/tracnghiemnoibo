import { IsEnum, IsOptional, IsString } from 'class-validator';
import { QuestionStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryQuestionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}
