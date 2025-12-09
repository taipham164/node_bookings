import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopThemeDto } from './dto/update-shop-theme.dto';
import { ShopTheme } from '@prisma/client';

@Injectable()
export class ShopThemeService {
  constructor(private prisma: PrismaService) {}

  async getThemeByShop(shopId: string): Promise<ShopTheme> {
    // Try to find existing theme
    let theme = await this.prisma.shopTheme.findUnique({
      where: { shopId },
    });

    // If none exists, create with sensible defaults
    if (!theme) {
      theme = await this.prisma.shopTheme.create({
        data: {
          shopId,
          brandName: 'My Shop',
          tagline: 'Quality service you can trust',
          primaryColor: '#111827',
          accentColor: '#f59e0b',
          background: 'light',
          logoUrl: '',
        },
      });
    }

    return theme;
  }

  async updateTheme(
    shopId: string,
    dto: UpdateShopThemeDto,
  ): Promise<ShopTheme> {
    // Upsert: update if exists, create if not
    const theme = await this.prisma.shopTheme.upsert({
      where: { shopId },
      update: dto,
      create: {
        shopId,
        brandName: dto.brandName || 'My Shop',
        tagline: dto.tagline || 'Quality service you can trust',
        primaryColor: dto.primaryColor || '#111827',
        accentColor: dto.accentColor || '#f59e0b',
        background: dto.background || 'light',
        logoUrl: dto.logoUrl || '',
      },
    });

    return theme;
  }
}
