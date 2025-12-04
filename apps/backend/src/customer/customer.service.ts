import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Customer[]> {
    return this.prisma.customer.findMany({
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

  async findOne(id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({
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
                durationMinutes: true,
                priceCents: true,
              },
            },
            barber: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          orderBy: {
            startAt: 'desc',
          },
          take: 20, // Recent 20 appointments
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Verify shop exists
    const shop = await this.prisma.shop.findUnique({
      where: { id: createCustomerDto.shopId },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${createCustomerDto.shopId} not found`);
    }

    return this.prisma.customer.create({
      data: createCustomerDto,
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

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    // Check if customer exists
    await this.findOne(id);

    // If shopId is being updated, verify the new shop exists
    if (updateCustomerDto.shopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: updateCustomerDto.shopId },
      });

      if (!shop) {
        throw new NotFoundException(`Shop with ID ${updateCustomerDto.shopId} not found`);
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
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

  async remove(id: string): Promise<Customer> {
    // Check if customer exists
    await this.findOne(id);

    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
