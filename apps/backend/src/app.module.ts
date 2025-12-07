import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ShopModule } from './shop/shop.module';
import { ServiceModule } from './service/service.module';
import { BarberModule } from './barber/barber.module';
import { CustomerModule } from './customer/customer.module';
import { AppointmentModule } from './appointment/appointment.module';
import { SquareModule } from './square/square.module';
import { AvailabilityModule } from './availability/availability.module';
import { NoShowPolicyModule } from './no-show-policy/no-show-policy.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ShopModule,
    ServiceModule,
    BarberModule,
    CustomerModule,
    AppointmentModule,
    SquareModule,
    AvailabilityModule,
    NoShowPolicyModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}