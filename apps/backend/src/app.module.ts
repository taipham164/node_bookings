import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ShopModule } from './shop/shop.module';

@Module({
  imports: [PrismaModule, ShopModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}