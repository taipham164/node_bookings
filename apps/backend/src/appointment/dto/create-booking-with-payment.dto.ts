import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEmail, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerInfoDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

/**
 * DTO for creating a booking with payment in a single operation
 * This combines customer creation, payment processing, and booking creation
 */
export class CreateBookingWithPaymentDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsString()
  @IsOptional()
  barberId?: string;

  @IsDateString()
  @IsNotEmpty()
  startAt!: string; // ISO datetime string

  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customer!: CustomerInfoDto;

  @IsString()
  @IsNotEmpty()
  paymentNonce!: string; // Square Web Payments nonce from client-side tokenization

  @IsString()
  @IsIn(['FULL', 'DEPOSIT'])
  paymentMode!: 'FULL' | 'DEPOSIT'; // Whether to charge full price or deposit
}
