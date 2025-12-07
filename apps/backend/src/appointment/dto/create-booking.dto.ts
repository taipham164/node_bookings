import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEmail } from 'class-validator';

/**
 * DTO for creating a booking with Square integration
 * Simpler than CreateAppointmentDto - endAt and squareBookingId are calculated/generated
 */
export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsString()
  @IsOptional()
  barberId?: string;

  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsDateString()
  @IsNotEmpty()
  startAt!: string; // ISO datetime string

  // Optional customer details for auto-creation/sync with Square
  @IsString()
  @IsOptional()
  customerFirstName?: string;

  @IsString()
  @IsOptional()
  customerLastName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;
}
