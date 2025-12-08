import { IsString, IsNotEmpty } from 'class-validator';

export class CreateShopDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  squareLocationId!: string;

  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}
