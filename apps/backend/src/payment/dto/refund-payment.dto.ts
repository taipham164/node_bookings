import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentRecordId!: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  amountCents?: number; // Optional: full refund if not specified
}
