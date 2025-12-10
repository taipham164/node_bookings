import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMins!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsString()
  @IsNotEmpty()
  squareItemId!: string;
}
