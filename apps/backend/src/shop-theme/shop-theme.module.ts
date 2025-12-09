import { Module } from '@nestjs/common';
import { ShopThemeController } from './shop-theme.controller';
import { ShopThemeService } from './shop-theme.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShopThemeController],
  providers: [ShopThemeService],
  exports: [ShopThemeService],
})
export class ShopThemeModule {}
