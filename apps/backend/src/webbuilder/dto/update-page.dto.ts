import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeHtml } from '../utils/html-sanitizer';

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value !== 'string' || value === undefined) return value;
    return sanitizeHtml(value);
  })
  html?: string;

  @IsOptional()
  @IsBoolean()
  isHome?: boolean;

  @IsOptional()
  @IsString()
  slug?: string;
}
