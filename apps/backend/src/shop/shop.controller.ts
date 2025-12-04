import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Shop } from '@prisma/client';

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createShopDto: CreateShopDto): Promise<Shop> {
    return this.shopService.create(createShopDto);
  }

  @Get()
  async findAll(): Promise<Shop[]> {
    return this.shopService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Shop> {
    return this.shopService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateShopDto: UpdateShopDto,
  ): Promise<Shop> {
    return this.shopService.update(id, updateShopDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.shopService.remove(id);
  }
}
