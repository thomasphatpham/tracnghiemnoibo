import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CandidateScope } from '@prisma/client';

export class CreateExamDepartmentRuleDto {
  @IsNotEmpty({ message: 'Phòng ban không được để trống' })
  @IsString({ message: 'departmentId phải là chuỗi' })
  departmentId: string;

  @IsNumber({}, { message: 'Tỷ lệ % phải là một số hợp lệ' })
  @Min(0, { message: 'Tỷ lệ % không thể nhỏ hơn 0' })
  @Max(100, { message: 'Tỷ lệ % không thể vượt quá 100' })
  percentage: number;

  @IsOptional()
  @IsInt({ message: 'Số câu phân bổ phải là số nguyên' })
  @Min(0, { message: 'Số câu phân bổ không thể nhỏ hơn 0' })
  allocatedCount?: number;
}

export class CreateExamDto {
  @IsNotEmpty({ message: 'Tên kỳ thi không được để trống' })
  @IsString({ message: 'Tên kỳ thi phải là chuỗi' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Mô tả kỳ thi phải là chuỗi' })
  description?: string;

  @IsNotEmpty({ message: 'Thời gian mở kỳ thi không được để trống' })
  @IsDateString({}, { message: 'Thời gian mở kỳ thi phải là chuỗi định dạng ISO hợp lệ' })
  openAt: string;

  @IsNotEmpty({ message: 'Thời gian kết thúc kỳ thi không được để trống' })
  @IsDateString({}, { message: 'Thời gian kết thúc kỳ thi phải là chuỗi định dạng ISO hợp lệ' })
  closeAt: string;

  @IsInt({ message: 'Thời lượng làm bài phải là số nguyên' })
  @Min(1, { message: 'Thời lượng làm bài tối thiểu là 1 phút' })
  durationMinutes: number;

  @IsInt({ message: 'Tổng số câu hỏi phải là số nguyên' })
  @Min(1, { message: 'Tổng số câu hỏi tối thiểu là 1 câu' })
  totalQuestions: number;

  @IsInt({ message: 'Số câu đúng để đạt phải là số nguyên' })
  @Min(0, { message: 'Số câu đúng để đạt không thể nhỏ hơn 0' })
  passingCorrectAnswers: number;

  @IsArray({ message: 'Cấu hình phân bổ câu hỏi phòng ban phải là một mảng' })
  @ArrayMinSize(1, { message: 'Kỳ thi phải cấu hình tỷ lệ câu hỏi cho ít nhất một phòng ban' })
  @ValidateNested({ each: true })
  @Type(() => CreateExamDepartmentRuleDto)
  departmentRules: CreateExamDepartmentRuleDto[];

  @IsOptional()
  @IsBoolean({ message: 'shuffleQuestions phải là kiểu boolean' })
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'shuffleOptions phải là kiểu boolean' })
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'autosaveEnabled phải là kiểu boolean' })
  autosaveEnabled?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'tabDetectionEnabled phải là kiểu boolean' })
  tabDetectionEnabled?: boolean;

  @IsOptional()
  @IsInt({ message: 'Số lần chuyển tab tối đa phải là số nguyên' })
  @Min(0, { message: 'Số lần chuyển tab tối đa không thể nhỏ hơn 0' })
  maxTabSwitches?: number;

  @IsOptional()
  @IsBoolean({ message: 'autoSubmitOnViolate phải là kiểu boolean' })
  autoSubmitOnViolate?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'showScoreAfterSubmit phải là kiểu boolean' })
  showScoreAfterSubmit?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'showCorrectAnswersAfterSubmit phải là kiểu boolean' })
  showCorrectAnswersAfterSubmit?: boolean;

  @IsOptional()
  @IsInt({ message: 'Số lượt thi tối đa phải là số nguyên' })
  @Min(1, { message: 'Số lượt thi tối đa tối thiểu là 1' })
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
