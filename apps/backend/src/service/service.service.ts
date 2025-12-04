import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from '@prisma/client';

@Injectable()
export class ServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Service[]> {
    return this.prisma.service.findMany({
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            squareLocationId: true,
          },
        },
        appointments: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
            status: true,
          },
          orderBy: {
            startAt: 'desc',
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    // Verify shop exists
    const shop = await this.prisma.shop.findUnique({
      where: { id: createServiceDto.shopId },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${createServiceDto.shopId} not found`);
    }

    return this.prisma.service.create({
      data: createServiceDto,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    // Check if service exists
    await this.findOne(id);

    // If shopId is being updated, verify the new shop exists
    if (updateServiceDto.shopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: updateServiceDto.shopId },
      });

      if (!shop) {
        throw new NotFoundException(`Shop with ID ${updateServiceDto.shopId} not found`);
      }
    }

    return this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string): Promise<Service> {
    // Check if service exists
    await this.findOne(id);

    return this.prisma.service.delete({
      where: { id },
    });
  }
}
