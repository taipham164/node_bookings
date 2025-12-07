import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PageService } from './page.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Controller('api/pages')
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Get()
  async findAll(@Query('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('shopId query parameter is required');
    }
    return this.pageService.findAll(shopId);
  }

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

  @Post()
  async createPage(@Body() createPageDto: CreatePageDto) {
    return this.pageService.createPage(createPageDto);
  }

  @Put(':id')
  async updatePage(
    @Param('id') id: string,
    @Body() updatePageDto: UpdatePageDto,
  ) {
    return this.pageService.updatePage(id, updatePageDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePage(@Param('id') id: string) {
    await this.pageService.deletePage(id);
  }

  @Post(':shopId/home/:pageId')
  async setHomePage(
    @Param('shopId') shopId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.pageService.setHomePage(shopId, pageId);
  }
}
