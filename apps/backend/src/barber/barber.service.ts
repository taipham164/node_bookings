import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { Barber } from '@prisma/client';

@Injectable()
export class BarberService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Barber[]> {
    return this.prisma.barber.findMany({
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            squareLocationId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Barber> {
    const barber = await this.prisma.barber.findUnique({
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
            service: {
              select: {
                id: true,
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            startAt: 'desc',
          },
          take: 10, // Limit to recent 10 appointments
        },
      },
    });

    if (!barber) {
      throw new NotFoundException(`Barber with ID ${id} not found`);
    }

    return barber;
  }

  async create(createBarberDto: CreateBarberDto): Promise<Barber> {
    // Verify shop exists
    const shop = await this.prisma.shop.findUnique({
      where: { id: createBarberDto.shopId },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${createBarberDto.shopId} not found`);
    }

    return this.prisma.barber.create({
      data: createBarberDto,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            squareLocationId: true,
          },
        },
      },
    });
  }

  async update(id: string, updateBarberDto: UpdateBarberDto): Promise<Barber> {
    // Check if barber exists
    await this.findOne(id);

    // If shopId is being updated, verify the new shop exists
    if (updateBarberDto.shopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: updateBarberDto.shopId },
      });

      if (!shop) {
        throw new NotFoundException(`Shop with ID ${updateBarberDto.shopId} not found`);
      }
    }

    return this.prisma.barber.update({
      where: { id },
      data: updateBarberDto,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            squareLocationId: true,
          },
        },
      },
    });
  }

  async remove(id: string): Promise<Barber> {
    // Check if barber exists
    await this.findOne(id);

    return this.prisma.barber.delete({
      where: { id },
    });
  }
}
