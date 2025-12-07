import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreatePageDto {
  @IsString()
  shopId: string;

  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsString()
  html: string;

  @IsOptional()
  @IsBoolean()
  isHome?: boolean;
}
