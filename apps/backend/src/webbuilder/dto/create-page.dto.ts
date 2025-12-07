import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeHtml } from '../utils/html-sanitizer';

export class CreatePageDto {
  @IsString()
  shopId!: string;

  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  @Transform(({ value }) => sanitizeHtml(value))
  html!: string;

  @IsOptional()
  @IsBoolean()
  isHome?: boolean;
}
