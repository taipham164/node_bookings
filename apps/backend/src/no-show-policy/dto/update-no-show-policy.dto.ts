import { IsInt, IsBoolean, Min } from 'class-validator';

export class UpdateNoShowPolicyDto {
  @IsInt()
  @Min(0)
  feeCents: number;

  @IsInt()
  @Min(0)
  graceMinutes: number;

  @IsBoolean()
  enabled: boolean;
}
