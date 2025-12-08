import { IsString, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpsertServiceDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  shopId: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  durationMins: number;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsString()
  squareItemId: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
