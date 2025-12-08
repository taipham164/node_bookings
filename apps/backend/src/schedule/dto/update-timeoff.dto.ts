import { IsString, IsOptional, IsISO8601 } from 'class-validator';

export class UpdateTimeOffDto {
  @IsISO8601()
  @IsOptional()
  startAt?: string; // ISO 8601 date-time string

  @IsISO8601()
  @IsOptional()
  endAt?: string; // ISO 8601 date-time string (exclusive)

  @IsString()
  @IsOptional()
  reason?: string;
}
