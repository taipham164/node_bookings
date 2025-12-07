import { IsInt, IsBoolean, Min, IsOptional } from 'class-validator';

export class UpdateNoShowPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  feeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  graceMinutes?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
