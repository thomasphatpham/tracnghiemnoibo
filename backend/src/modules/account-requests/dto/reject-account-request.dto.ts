import { IsOptional, IsString } from 'class-validator';

export class RejectAccountRequestDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
