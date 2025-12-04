import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateBarberDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  squareTeamMemberId?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
