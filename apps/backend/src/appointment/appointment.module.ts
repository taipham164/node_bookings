import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { BookingValidationService } from './booking-validation.service';
import { SquareModule } from '../square/square.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [SquareModule,PaymentModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, BookingValidationService],
  exports: [AppointmentService, BookingValidationService],
})
export class AppointmentModule {}
