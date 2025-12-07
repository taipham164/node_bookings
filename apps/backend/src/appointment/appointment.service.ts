import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment } from '@prisma/client';
import { BookingValidationService } from './booking-validation.service';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly bookingValidationService: BookingValidationService,
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

  async findOne(id: string) {
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
    // Run comprehensive booking validation before creating the appointment
    await this.bookingValidationService.validateBookingRequest({
      shopId: createAppointmentDto.shopId,
      serviceId: createAppointmentDto.serviceId,
      customerId: createAppointmentDto.customerId,
      barberId: createAppointmentDto.barberId,
      startAt: createAppointmentDto.startAt,
    });

    // Validate appointment times
    const startAt = new Date(createAppointmentDto.startAt);
    const endAt = new Date(createAppointmentDto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('End time must be after start time');
    }

    if (startAt < new Date()) {
      throw new BadRequestException('Appointment cannot be scheduled in the past');
    }

    // All validations passed, create the appointment
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
   * Charge a deposit for an appointment
   * This can be called when booking requires a deposit
   */
  async chargeDeposit(appointmentId: string, cardId: string, depositCents: number) {
    const appointment = await this.findOne(appointmentId);

    if (!appointment.customer.squareCustomerId) {
      throw new BadRequestException('Customer has no Square customer ID');
    }

    // Charge the card
    const chargeResult = await this.paymentService.chargeCustomerCard({
      amountCents: depositCents,
      currency: 'USD',
      customerId: appointment.customerId,
      squareCustomerId: appointment.customer.squareCustomerId,
      cardId,
      appointmentId,
    });

    return chargeResult;
  }

  /**
   * Charge a no-show fee for an appointment
   * This can be called when a customer doesn't show up
   */
  async chargeNoShowFee(appointmentId: string, cardId: string) {
    const appointment = await this.findOne(appointmentId);

    // Get the no-show policy for the shop
    const noShowPolicy = await this.prisma.noShowPolicy.findFirst({
      where: {
        shopId: appointment.shopId,
        enabled: true,
      },
    });

    if (!noShowPolicy) {
      throw new NotFoundException('No active no-show policy found for this shop');
    }

    if (!appointment.customer.squareCustomerId) {
      throw new BadRequestException('Customer has no Square customer ID');
    }

    // Charge the no-show fee
    const chargeResult = await this.paymentService.chargeCustomerCard({
      amountCents: noShowPolicy.feeCents,
      currency: 'USD',
      customerId: appointment.customerId,
      squareCustomerId: appointment.customer.squareCustomerId,
      cardId,
      appointmentId,
    });

    // Update appointment status to NO_SHOW
    await this.update(appointmentId, { status: 'NO_SHOW' });

    return chargeResult;
  }

  /**
   * Charge the full service price for an appointment
   * This can be called when the service is completed
   */
  async chargeFullAmount(appointmentId: string, cardId: string) {
    const appointment = await this.findOne(appointmentId);

    if (!appointment.customer.squareCustomerId) {
      throw new BadRequestException('Customer has no Square customer ID');
    }

    // Charge the full service price
    const chargeResult = await this.paymentService.chargeCustomerCard({
      amountCents: appointment.service.priceCents,
      currency: 'USD',
      customerId: appointment.customerId,
      squareCustomerId: appointment.customer.squareCustomerId,
      cardId,
      appointmentId,
    });

    return chargeResult;
  }

  /**
   * Add a payment to an appointment
   * Helper method to link an existing payment record to an appointment
   */
  async addPaymentToAppointment(appointmentId: string, paymentRecordId: string) {
    return this.paymentService.addPaymentToAppointment(appointmentId, paymentRecordId);
  }

  /**
   * Get all payments for an appointment
   */
  async getAppointmentPayments(appointmentId: string) {
    const appointment = await this.findOne(appointmentId);

    return this.prisma.paymentRecord.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
