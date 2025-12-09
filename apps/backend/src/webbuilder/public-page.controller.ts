import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PageService } from './page.service';

@Controller('public/pages')
export class PublicPageController {
  constructor(private readonly pageService: PageService) {}

  @Get('home')
  async findHomePage(@Query('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('shopId query parameter is required');
    }
    return this.pageService.findHomePage(shopId);
  }

  @Get('by-slug/:slug')
  async findBySlug(
    @Param('slug') slug: string,
    @Query('shopId') shopId: string,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId query parameter is required');
    }
    return this.pageService.findBySlug(shopId, slug);
  }
}