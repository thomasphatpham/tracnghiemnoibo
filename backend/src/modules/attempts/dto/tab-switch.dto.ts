import { IsOptional, IsString } from 'class-validator';

export class TabSwitchDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
