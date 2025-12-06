import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class ChargeCardDto {
  @IsNumber()
  @Min(1)
  amountCents: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;
}
