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
    if (value === undefined || value === null) return value;
    if (typeof value !== 'string') {
      throw new TypeError(`HTML field must be a string, received ${typeof value}`);
    }
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
