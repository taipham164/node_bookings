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
}
