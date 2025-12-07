import { Module, forwardRef } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
<<<<<<< HEAD
import { SquareModule } from '../square/square.module';

@Module({
  imports: [forwardRef(() => SquareModule)],
=======
import { PrismaModule } from '../prisma/prisma.module';
import { SquareModule } from '../square/square.module';
import { BookingValidationService } from './booking-validation.service';

@Module({
  imports: [PrismaModule, SquareModule],
>>>>>>> main
  controllers: [AppointmentController],
  providers: [AppointmentService, BookingValidationService],
  exports: [AppointmentService, BookingValidationService],
})
export class AppointmentModule {}
