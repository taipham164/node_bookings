import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ShopModule } from './shop/shop.module';
import { ServiceModule } from './service/service.module';
import { BarberModule } from './barber/barber.module';
import { CustomerModule } from './customer/customer.module';
import { AppointmentModule } from './appointment/appointment.module';

@Module({
  imports: [PrismaModule, ShopModule, ServiceModule, BarberModule, CustomerModule, AppointmentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}