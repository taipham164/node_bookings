import { IsString, IsNotEmpty, IsOptional, IsISO8601 } from 'class-validator';

export class CreateTimeOffDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  barberId!: string;

  @IsISO8601()
  @IsNotEmpty()
  startAt!: string; // ISO 8601 date-time string

  @IsISO8601()
  @IsNotEmpty()
  endAt!: string; // ISO 8601 date-time string (exclusive)

  @IsString()
  @IsOptional()
  reason?: string;
}
