import { IsString, IsOptional } from 'class-validator';

export class UpdateWorkingHoursDto {
  @IsString()
  @IsOptional()
  startTime?: string; // "HH:mm" format

  @IsString()
  @IsOptional()
  endTime?: string; // "HH:mm" format
}
