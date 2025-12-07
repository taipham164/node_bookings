import { IsNotEmpty, IsString } from 'class-validator';

export class SaveCardDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsString()
  @IsNotEmpty()
  paymentNonce!: string;
}
