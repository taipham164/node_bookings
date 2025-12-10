import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SquareService } from '../square/square.service';

interface ValidateBookingParams {
  shopId: string;
  serviceId: string;
  customerId: string;
  barberId?: string;
  startAt: string; // ISO 8601 format
}

@Injectable()
export class BookingValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly squareService: SquareService,
  ) {}

  /**
   * Validates all aspects of a booking request before creation
   * @throws BadRequestException if entity relationships are invalid
   * @throws ConflictException if there's a scheduling conflict
   * @throws NotFoundException if required entities don't exist
   */
  async validateBookingRequest(params: ValidateBookingParams): Promise<void> {
    const { shopId, serviceId, customerId, barberId, startAt } = params;

    // Step 1: Verify all entities exist and get their details
    const [shop, service, customer, barber] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: shopId } }),
      this.prisma.service.findUnique({ where: { id: serviceId } }),
      this.prisma.customer.findUnique({ where: { id: customerId } }),
      barberId ? this.prisma.barber.findUnique({ where: { id: barberId } }) : null,
    ]);

    // Step 2: Validate entity existence
    if (!shop) {
      throw new NotFoundException(`Shop with ID ${shopId} not found`);
    }
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }
    if (barberId && !barber) {
      throw new NotFoundException(`Barber with ID ${barberId} not found`);
    }

    // Step 3: Validate entity relationships (all must belong to same shop)
    if (service.shopId !== shopId) {
      throw new BadRequestException(
        `Service does not belong to shop ${shopId}. Service belongs to shop ${service.shopId}`
      );
    }
    if (customer.shopId !== shopId) {
      throw new BadRequestException(
        `Customer does not belong to shop ${shopId}. Customer belongs to shop ${customer.shopId}`
      );
    }
    if (barber && barber.shopId !== shopId) {
      throw new BadRequestException(
        `Barber does not belong to shop ${shopId}. Barber belongs to shop ${barber.shopId}`
      );
    }

    // Step 4: Calculate end time based on service duration
    const startAtDate = new Date(startAt);
    const endAtDate = new Date(startAtDate.getTime() + service.durationMins * 60 * 1000);

    // Step 5: Check for barber double-booking
    if (barberId) {
      await this.validateBarberAvailability(barberId, startAtDate, endAtDate);
    }

    // Step 6: Check for customer double-booking
    await this.validateCustomerAvailability(customerId, startAtDate, endAtDate);

    // Step 7: Validate slot against Square availability
    await this.validateSquareAvailability({
      shop,
      service,
      barber,
      startAt: startAtDate,
    });
  }

  /**
   * Validates that a barber is available for the requested time slot
   * @throws ConflictException if barber is already booked
   */
  private async validateBarberAvailability(
    barberId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<void> {
    // Find overlapping appointments for the barber
    // An appointment overlaps if:
    // - It starts before the requested end time AND
    // - It ends after the requested start time
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        barberId,
        status: {
          in: ['SCHEDULED', 'COMPLETED'],
        },
        AND: [
          { startAt: { lt: endAt } },
          { endAt: { gt: startAt } },
        ],
      },
      include: {
        barber: {
          select: { displayName: true },
        },
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (conflictingAppointment) {
      const barberName = conflictingAppointment.barber.displayName;
      const conflictStart = conflictingAppointment.startAt.toISOString();
      const conflictEnd = conflictingAppointment.endAt.toISOString();

      throw new ConflictException(
        `Barber "${barberName}" is already booked from ${conflictStart} to ${conflictEnd}`
      );
    }
  }

  /**
   * Validates that a customer doesn't have overlapping appointments
   * @throws ConflictException if customer has a conflicting appointment
   */
  private async validateCustomerAvailability(
    customerId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<void> {
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        customerId,
        status: {
          in: ['SCHEDULED', 'COMPLETED'],
        },
        AND: [
          { startAt: { lt: endAt } },
          { endAt: { gt: startAt } },
        ],
      },
      include: {
        service: {
          select: { name: true },
        },
      },
    });

    if (conflictingAppointment) {
      const serviceName = conflictingAppointment.service.name;
      const conflictStart = conflictingAppointment.startAt.toISOString();
      const conflictEnd = conflictingAppointment.endAt.toISOString();

      throw new ConflictException(
        `Customer already has an appointment (${serviceName}) from ${conflictStart} to ${conflictEnd}`
      );
    }
  }

  /**
   * Validates that the requested slot is available according to Square
   * @throws ConflictException if slot is not available in Square
   */
  private async validateSquareAvailability(options: {
    shop: any;
    service: any;
    barber: any | null;
    startAt: Date;
  }): Promise<void> {
    const { shop, service, barber, startAt } = options;

    // Only validate if we have the necessary Square IDs
    if (!shop.squareLocationId || !service.squareItemId) {
      // Skip Square validation if Square IDs are not set
      return;
    }

    const isAvailable = await this.squareService.verifySlotIsAvailable({
      locationId: shop.squareLocationId,
      serviceVariationId: service.squareItemId,
      teamMemberId: barber?.squareTeamMemberId,
      startAt: startAt.toISOString(),
    });

    if (!isAvailable) {
      throw new ConflictException(
        'The selected time slot is no longer available according to Square booking system'
      );
    }
  }
}
