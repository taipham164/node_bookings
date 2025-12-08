import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFlagDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsString()
  @IsNotEmpty()
  flag!: string;
}
