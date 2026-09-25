import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CandidateScope } from '@prisma/client';
import { CreateExamDepartmentRuleDto } from './create-exam.dto';

export class UpdateExamDto {
  @IsOptional()
  @IsString({ message: 'Tên kỳ thi phải là chuỗi' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Mô tả kỳ thi phải là chuỗi' })
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Thời gian mở kỳ thi phải là chuỗi định dạng ISO hợp lệ' })
  openAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Thời gian kết thúc kỳ thi phải là chuỗi định dạng ISO hợp lệ' })
  closeAt?: string;

  @IsOptional()
  @IsInt({ message: 'Thời lượng làm bài phải là số nguyên' })
  @Min(1, { message: 'Thời lượng làm bài tối thiểu là 1 phút' })
  durationMinutes?: number;

  @IsOptional()
  @IsInt({ message: 'Tổng số câu hỏi phải là số nguyên' })
  @Min(1, { message: 'Tổng số câu hỏi tối thiểu là 1 câu' })
  totalQuestions?: number;

  @IsOptional()
  @IsInt({ message: 'Số câu đúng để đạt phải là số nguyên' })
  @Min(0, { message: 'Số câu đúng để đạt không thể nhỏ hơn 0' })
  passingCorrectAnswers?: number;

  @IsOptional()
  @IsArray({ message: 'Cấu hình phân bổ câu hỏi phòng ban phải là một mảng' })
  @ArrayMinSize(1, { message: 'Kỳ thi phải cấu hình tỷ lệ câu hỏi cho ít nhất một phòng ban' })
  @ValidateNested({ each: true })
  @Type(() => CreateExamDepartmentRuleDto)
  departmentRules?: CreateExamDepartmentRuleDto[];

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  autosaveEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  tabDetectionEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxTabSwitches?: number;

  @IsOptional()
  @IsBoolean()
  autoSubmitOnViolate?: boolean;

  @IsOptional()
  @IsBoolean()
  showScoreAfterSubmit?: boolean;

  @IsOptional()
  @IsBoolean()
  showCorrectAnswersAfterSubmit?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @IsEnum(CandidateScope, { message: 'Phạm vi thí sinh không hợp lệ' })
  candidateScope?: CandidateScope;

  @IsOptional()
  @IsArray({ message: 'Danh sách phòng ban được gán phải là mảng chuỗi' })
  @IsString({ each: true, message: 'Mỗi departmentId phải là chuỗi' })
  assignedDepartmentIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Danh sách thí sinh được gán phải là mảng chuỗi' })
  @IsString({ each: true, message: 'Mỗi userId phải là chuỗi' })
  assignedUserIds?: string[];
}
