import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateBookingWithPaymentDto } from './dto/create-booking-with-payment.dto';
import { Appointment } from '@prisma/client';

@Controller('appointments')
export class AppointmentController {
  private readonly logger = new Logger(AppointmentController.name);

  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    return this.appointmentService.create(createAppointmentDto);
  }

  @Get()
  async findAll(): Promise<Appointment[]> {
    return this.appointmentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Appointment> {
    return this.appointmentService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    return this.appointmentService.update(id, updateAppointmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.appointmentService.remove(id);
  }

  /**
   * POST /api/appointments/:id/no-show
   * Mark an appointment as no-show and create a no-show charge
   */
  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  async markNoShow(@Param('id') id: string): Promise<Appointment> {
    return this.appointmentService.markNoShow(id);
  }

  /**
   * Create a booking with Square integration
   * This endpoint creates both a Square booking and a local appointment record
   */
  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(@Body() createBookingDto: CreateBookingDto): Promise<{
    success: boolean;
    data: Appointment;
  }> {
    this.logger.log(`Creating booking for shop ${createBookingDto.shopId}, service ${createBookingDto.serviceId}`);

    try {
      const appointment = await this.appointmentService.createBooking(createBookingDto);

      return {
        success: true,
        data: appointment,
      };
    } catch (error) {
      this.logger.error('Booking creation failed:', error);
      throw error; // Let NestJS handle the HTTP status based on the exception type
    }
  }

  /**
   * Create a booking with payment in a single operation
   * This endpoint handles customer creation, payment processing, and booking creation
   *
   * POST /api/appointments/bookings-with-payment
   *
   * Request body:
   * {
   *   shopId: string;
   *   serviceId: string;
   *   barberId?: string;
   *   startAt: string; // ISO datetime
   *   customer: {
   *     firstName: string;
   *     lastName: string;
   *     phone: string;
   *     email?: string;
   *   };
   *   paymentNonce: string; // Square Web Payments nonce from client-side tokenization
   *   paymentMode: 'FULL' | 'DEPOSIT';
   * }
   */
  @Post('bookings-with-payment')
  @HttpCode(HttpStatus.CREATED)
  async createBookingWithPayment(@Body() dto: CreateBookingWithPaymentDto) {
    this.logger.log(
      `Creating booking with payment for shop ${dto.shopId}, service ${dto.serviceId}, customer ${dto.customer.firstName} ${dto.customer.lastName}`
    );

    try {
      const result = await this.appointmentService.createBookingWithPayment(dto);
      return result;
    } catch (error) {
      this.logger.error('Booking with payment creation failed:', error);
      throw error; // Let NestJS handle the HTTP status based on the exception type
    }
  }
}
