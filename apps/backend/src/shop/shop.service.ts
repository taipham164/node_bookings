import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Shop } from '@prisma/client';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Shop[]> {
    return this.prisma.shop.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Shop> {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        barbers: true,
        services: true,
        customers: true,
        appointments: true,
        noShowPolicy: true,
      },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${id} not found`);
    }

    return shop;
  }

  async create(createShopDto: CreateShopDto): Promise<Shop> {
    return this.prisma.shop.create({
      data: createShopDto,
    });
  }

  async update(id: string, updateShopDto: UpdateShopDto): Promise<Shop> {
    // Check if shop exists
    await this.findOne(id);

    return this.prisma.shop.update({
      where: { id },
      data: updateShopDto,
    });
  }

  async remove(id: string): Promise<Shop> {
    // Check if shop exists
    await this.findOne(id);

    return this.prisma.shop.delete({
      where: { id },
    });
  }
}
