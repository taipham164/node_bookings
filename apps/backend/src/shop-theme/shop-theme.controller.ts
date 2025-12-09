import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ShopThemeService } from './shop-theme.service';
import { UpdateShopThemeDto } from './dto/update-shop-theme.dto';

@Controller('shop-theme')
export class ShopThemeController {
  constructor(private readonly shopThemeService: ShopThemeService) {}

  @Get(':shopId')
  async getTheme(@Param('shopId') shopId: string) {
    return this.shopThemeService.getThemeByShop(shopId);
  }

  @Put(':shopId')
  async updateTheme(
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopThemeDto,
  ) {
    return this.shopThemeService.updateTheme(shopId, dto);
  }
}
