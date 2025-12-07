import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from '@prisma/client';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

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

  /**
   * Find or create a customer by phone number
   * This is useful for booking flows where we need to ensure a customer exists
   */
  async findOrCreateByPhone(params: {
    shopId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    squareCustomerId?: string;
  }): Promise<Customer> {
    const { shopId, firstName, lastName, phone, email, squareCustomerId } = params;

    this.logger.log(`Finding or creating customer with phone ${phone} for shop ${shopId}`);

    // Try to find existing customer by phone and shop
    let customer = await this.prisma.customer.findFirst({
      where: {
        shopId,
        phone,
      },
    });

    if (customer) {
      this.logger.log(`Found existing customer: ${customer.id}`);

      // Update Square customer ID if provided and not already set
      if (squareCustomerId && !customer.squareCustomerId) {
        customer = await this.prisma.customer.update({
          where: { id: customer.id },
          data: { squareCustomerId },
        });
        this.logger.log(`Updated customer ${customer.id} with Square ID ${squareCustomerId}`);
      }

      return customer;
    }

    // Create new customer
    this.logger.log(`Creating new customer: ${firstName} ${lastName}`);
    customer = await this.prisma.customer.create({
      data: {
        shopId,
        firstName,
        lastName,
        phone,
        email,
        squareCustomerId,
      },
    });

    this.logger.log(`Created customer: ${customer.id}`);
    return customer;
  }
}
