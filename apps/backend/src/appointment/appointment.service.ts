import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SquareService } from '../square/square.service';
import { PaymentService } from '../payment/payment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Appointment, AppointmentStatus } from '@prisma/client';
import { BookingValidationService } from './booking-validation.service';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SquareService))
    private readonly squareService: SquareService,
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
   * Mark an appointment as no-show and create a no-show charge
   * @param appointmentId - The appointment ID
   * @returns The updated appointment with no-show charge
   */
  async markNoShow(appointmentId: string): Promise<Appointment> {
    // Load the appointment with all necessary relations
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        shop: true,
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
    const policy = await this.prisma.noShowPolicy.findFirst({
      where: { shopId: appointment.shopId },
    });

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

  /**
   * Create a booking with Square integration
   * This method orchestrates the full booking flow:
   * 1. Validates entities exist
   * 2. Creates/finds Square customer
   * 3. Creates Square booking
   * 4. Creates local appointment with squareBookingId
   */
  async createBooking(createBookingDto: CreateBookingDto): Promise<Appointment> {
    try {
      this.logger.log(`Creating booking for customer ${createBookingDto.customerId}`);

      // 1. Load and validate all required entities
      const [shop, service, barber, customer] = await Promise.all([
        this.prisma.shop.findUnique({ where: { id: createBookingDto.shopId } }),
        this.prisma.service.findUnique({ where: { id: createBookingDto.serviceId } }),
        createBookingDto.barberId
          ? this.prisma.barber.findUnique({ where: { id: createBookingDto.barberId } })
          : null,
        this.prisma.customer.findUnique({ where: { id: createBookingDto.customerId } }),
      ]);

      // Validate entities exist
      if (!shop) {
        throw new NotFoundException(`Shop with ID ${createBookingDto.shopId} not found`);
      }
      if (!service) {
        throw new NotFoundException(`Service with ID ${createBookingDto.serviceId} not found`);
      }
      if (createBookingDto.barberId && !barber) {
        throw new NotFoundException(`Barber with ID ${createBookingDto.barberId} not found`);
      }
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${createBookingDto.customerId} not found`);
      }

      // Validate entities belong to the same shop
      if (service.shopId !== createBookingDto.shopId) {
        throw new BadRequestException('Service does not belong to the specified shop');
      }
      if (barber && barber.shopId !== createBookingDto.shopId) {
        throw new BadRequestException('Barber does not belong to the specified shop');
      }
      if (customer.shopId !== createBookingDto.shopId) {
        throw new BadRequestException('Customer does not belong to the specified shop');
      }

      // Validate required Square IDs
      if (!shop.squareLocationId) {
        throw new BadRequestException('Shop is not linked to Square location');
      }
      if (!service.squareCatalogObjectId) {
        throw new BadRequestException('Service is not linked to Square catalog');
      }
      if (createBookingDto.barberId && barber && !barber.squareTeamMemberId) {
        throw new BadRequestException('Barber is not linked to Square team member');
      }

      // Validate start time
      const startAt = new Date(createBookingDto.startAt);
      if (startAt < new Date()) {
        throw new BadRequestException('Booking cannot be scheduled in the past');
      }

      // 2. Find or create Square customer
      this.logger.log(`Finding or creating Square customer for ${customer.firstName} ${customer.lastName}`);
      let squareCustomerId = customer.squareCustomerId;
      if (!squareCustomerId) {
        // TODO: Implement findOrCreateSquareCustomer method in SquareService
        this.logger.warn('Square customer creation not implemented yet');
        squareCustomerId = 'placeholder-customer-id';
      }

      // 3. Create Square booking
      this.logger.log(`Creating Square booking at ${createBookingDto.startAt}`);
      // TODO: Implement createSquareBooking method in SquareService
      const bookingId = 'placeholder-booking-id';
      this.logger.warn('Square booking creation not implemented yet');

      // Calculate end time
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000);

      // 4. Create local appointment with squareBookingId
      this.logger.log(`Creating local appointment with Square booking ID: ${bookingId}`);
      const appointment = await this.prisma.appointment.create({
        data: {
          shopId: createBookingDto.shopId,
          serviceId: createBookingDto.serviceId,
          barberId: createBookingDto.barberId || barber?.id!,
          customerId: createBookingDto.customerId,
          startAt,
          endAt,
          squareBookingId: bookingId,
          status: 'SCHEDULED',
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
              squareCustomerId: true,
            },
          },
        },
      });

      this.logger.log(`Booking created successfully: appointment ${appointment.id}, Square booking ${bookingId}`);
      return appointment;
    } catch (error) {
      this.logger.error('Failed to create booking:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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

    // TODO: Fix Prisma client generation - paymentRecord model not found
    // return this.prisma.paymentRecord.findMany({
    //   where: { appointmentId },
    //   orderBy: { createdAt: 'desc' },
    // });
    this.logger.warn('Payment records query not implemented - Prisma client needs regeneration');
    return [];
  }
}
