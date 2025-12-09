import { Module, forwardRef } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SquareModule } from '../square/square.module';
import { PaymentModule } from '../payment/payment.module';
import { CustomerModule } from '../customer/customer.module';
import { BookingValidationService } from './booking-validation.service';

@Module({
  imports: [PrismaModule, forwardRef(() => SquareModule), PaymentModule, CustomerModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, BookingValidationService],
  exports: [AppointmentService, BookingValidationService],
})
export class AppointmentModule {}
