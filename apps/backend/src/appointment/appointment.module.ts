import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { BookingValidationService } from './booking-validation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SquareModule } from '../square/square.module';

@Module({
  imports: [PrismaModule, SquareModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, BookingValidationService],
  exports: [AppointmentService, BookingValidationService],
})
export class AppointmentModule {}
