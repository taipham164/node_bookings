import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment, AppointmentStatus } from '@prisma/client';
import { SquareService } from '../square/square.service';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SquareService))
    private readonly squareService: SquareService,
  ) {}

  async findAll(): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            squareLocationId: true,
          },
        },
        barber: {
          select: {
            id: true,
            displayName: true,
            squareTeamMemberId: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            priceCents: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        startAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            squareLocationId: true,
          },
        },
        barber: {
          select: {
            id: true,
            displayName: true,
            squareTeamMemberId: true,
            active: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            priceCents: true,
            squareCatalogObjectId: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            squareCustomerId: true,
          },
        },
        noShowCharges: {
          select: {
            id: true,
            amountCents: true,
            squarePaymentId: true,
            chargedAt: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async create(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    // Validate that all related entities exist
    const [shop, barber, service, customer] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: createAppointmentDto.shopId } }),
      this.prisma.barber.findUnique({ where: { id: createAppointmentDto.barberId } }),
      this.prisma.service.findUnique({ where: { id: createAppointmentDto.serviceId } }),
      this.prisma.customer.findUnique({ where: { id: createAppointmentDto.customerId } }),
    ]);

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${createAppointmentDto.shopId} not found`);
    }
    if (!barber) {
      throw new NotFoundException(`Barber with ID ${createAppointmentDto.barberId} not found`);
    }
    if (!service) {
      throw new NotFoundException(`Service with ID ${createAppointmentDto.serviceId} not found`);
    }
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${createAppointmentDto.customerId} not found`);
    }

    // Validate that barber and service belong to the same shop
    if (barber.shopId !== createAppointmentDto.shopId) {
      throw new BadRequestException('Barber does not belong to the specified shop');
    }
    if (service.shopId !== createAppointmentDto.shopId) {
      throw new BadRequestException('Service does not belong to the specified shop');
    }
    if (customer.shopId !== createAppointmentDto.shopId) {
      throw new BadRequestException('Customer does not belong to the specified shop');
    }

    // Validate appointment times
    const startAt = new Date(createAppointmentDto.startAt);
    const endAt = new Date(createAppointmentDto.endAt);
    
    if (startAt >= endAt) {
      throw new BadRequestException('End time must be after start time');
    }
    
    if (startAt < new Date()) {
      throw new BadRequestException('Appointment cannot be scheduled in the past');
    }

    return this.prisma.appointment.create({
      data: {
        ...createAppointmentDto,
        startAt,
        endAt,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            squareLocationId: true,
          },
        },
        barber: {
          select: {
            id: true,
            displayName: true,
            squareTeamMemberId: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            priceCents: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<Appointment> {
    // Check if appointment exists
    await this.findOne(id);

    // If updating related entities, validate they exist and belong to the same shop
    if (updateAppointmentDto.shopId || updateAppointmentDto.barberId || 
        updateAppointmentDto.serviceId || updateAppointmentDto.customerId) {
      
      const appointment = await this.prisma.appointment.findUnique({
        where: { id },
        include: { shop: true, barber: true, service: true, customer: true },
      });

      const shopId = updateAppointmentDto.shopId || appointment!.shopId;
      
      if (updateAppointmentDto.barberId) {
        const barber = await this.prisma.barber.findUnique({ 
          where: { id: updateAppointmentDto.barberId } 
        });
        if (!barber || barber.shopId !== shopId) {
          throw new BadRequestException('Barber does not exist or belong to the specified shop');
        }
      }
      
      if (updateAppointmentDto.serviceId) {
        const service = await this.prisma.service.findUnique({ 
          where: { id: updateAppointmentDto.serviceId } 
        });
        if (!service || service.shopId !== shopId) {
          throw new BadRequestException('Service does not exist or belong to the specified shop');
        }
      }
      
      if (updateAppointmentDto.customerId) {
        const customer = await this.prisma.customer.findUnique({ 
          where: { id: updateAppointmentDto.customerId } 
        });
        if (!customer || customer.shopId !== shopId) {
          throw new BadRequestException('Customer does not exist or belong to the specified shop');
        }
      }
    }

    // Validate appointment times if provided
    if (updateAppointmentDto.startAt || updateAppointmentDto.endAt) {
      const appointment = await this.prisma.appointment.findUnique({ where: { id } });
      const startAt = updateAppointmentDto.startAt ? new Date(updateAppointmentDto.startAt) : appointment!.startAt;
      const endAt = updateAppointmentDto.endAt ? new Date(updateAppointmentDto.endAt) : appointment!.endAt;
      
      if (startAt >= endAt) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    const updateData: any = { ...updateAppointmentDto };
    if (updateAppointmentDto.startAt) {
      updateData.startAt = new Date(updateAppointmentDto.startAt);
    }
    if (updateAppointmentDto.endAt) {
      updateData.endAt = new Date(updateAppointmentDto.endAt);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            squareLocationId: true,
          },
        },
        barber: {
          select: {
            id: true,
            displayName: true,
            squareTeamMemberId: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            priceCents: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string): Promise<Appointment> {
    // Check if appointment exists
    await this.findOne(id);

    return this.prisma.appointment.delete({
      where: { id },
    });
  }

  /**
   * Mark an appointment as no-show and create a no-show charge
   * @param appointmentId - The appointment ID
   * @returns The updated appointment with no-show charge
   */
  async markNoShow(appointmentId: string): Promise<Appointment> {
    // Load the appointment with all necessary relations
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        shop: {
          include: {
            noShowPolicy: true,
          },
        },
        customer: true,
        service: true,
        barber: true,
        noShowCharges: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    // Check if already marked as no-show
    if (appointment.status === AppointmentStatus.NO_SHOW) {
      throw new BadRequestException('Appointment is already marked as no-show');
    }

    // Load the shop's no-show policy
    const policy = appointment.shop.noShowPolicy;

    // Determine the charge amount
    let amountCents = 0;
    let shouldCharge = false;

    if (policy && policy.enabled) {
      // Check if the grace period has passed
      const now = new Date();
      const graceDeadline = new Date(appointment.startAt.getTime() + policy.graceMinutes * 60 * 1000);

      if (now < graceDeadline) {
        throw new BadRequestException(
          `Too early to mark as no-show. Grace period ends at ${graceDeadline.toISOString()}`,
        );
      }

      amountCents = policy.feeCents;
      shouldCharge = policy.feeCents > 0;
    }

    // Update the appointment status to NO_SHOW
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.NO_SHOW,
      },
    });

    this.logger.log(`Appointment ${appointmentId} marked as NO_SHOW`);

    // Create the no-show charge record
    let noShowCharge = await this.prisma.noShowCharge.create({
      data: {
        appointmentId,
        amountCents,
        squarePaymentId: null,
      },
    });

    this.logger.log(`Created no-show charge for appointment ${appointmentId} with amount ${amountCents} cents`);

    // If we should charge and have Square integration info, attempt to charge
    if (shouldCharge && appointment.customer.squareCustomerId && appointment.shop.squareLocationId) {
      try {
        this.logger.log(`Attempting to charge no-show fee via Square for appointment ${appointmentId}`);

        const paymentResult = await this.squareService.chargeNoShowFee({
          amountCents,
          currency: 'USD',
          customerSquareId: appointment.customer.squareCustomerId,
          shopSquareLocationId: appointment.shop.squareLocationId,
        });

        if (paymentResult && paymentResult.squarePaymentId) {
          // Update the no-show charge with the Square payment ID
          noShowCharge = await this.prisma.noShowCharge.update({
            where: { id: noShowCharge.id },
            data: {
              squarePaymentId: paymentResult.squarePaymentId,
            },
          });

          this.logger.log(
            `Successfully charged no-show fee. Square Payment ID: ${paymentResult.squarePaymentId}`,
          );
        } else {
          this.logger.warn(`No-show fee charge returned null - card on file may not be available`);
        }
      } catch (error) {
        // Log the error but don't throw - we don't want to block marking as no-show
        this.logger.error(
          `Failed to charge no-show fee for appointment ${appointmentId}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    } else if (shouldCharge) {
      this.logger.warn(
        `No-show fee configured but missing Square integration data (customerSquareId: ${!!appointment.customer.squareCustomerId}, locationId: ${!!appointment.shop.squareLocationId})`,
      );
    }

    // Return the updated appointment with all relations
    return this.findOne(appointmentId);
  }
}
