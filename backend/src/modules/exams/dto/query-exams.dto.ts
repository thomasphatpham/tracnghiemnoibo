import { IsEnum, IsOptional } from 'class-validator';
import { ExamStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryExamsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ExamStatus, { message: 'Trạng thái kỳ thi không hợp lệ (DRAFT, PUBLISHED, CLOSED)' })
  status?: ExamStatus;
}
