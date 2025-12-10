import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SquareService } from '../square/square.service';

interface AvailabilitySlot {
  startAt: string; // ISO string
  endAt: string;   // ISO string
  barberId?: string;
}

interface GetAvailabilityParams {
  shopId: string;
  serviceId: string;
  barberId?: string;
  date: string; // YYYY-MM-DD
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly squareService: SquareService,
  ) {}

  async getAvailability(params: GetAvailabilityParams): Promise<AvailabilitySlot[]> {
    try {
      this.logger.log(`Fetching availability for service ${params.serviceId} on ${params.date}`);
      
      // Load required entities from database
      const [shop, service, barber] = await Promise.all([
        this.prismaService.shop.findUnique({ where: { id: params.shopId } }),
        this.prismaService.service.findUnique({ where: { id: params.serviceId } }),
        params.barberId 
          ? this.prismaService.barber.findUnique({ where: { id: params.barberId } })
          : null,
      ]);

      // Validate entities exist
      if (!shop) {
        throw new NotFoundException(`Shop with ID ${params.shopId} not found`);
      }
      if (!service) {
        throw new NotFoundException(`Service with ID ${params.serviceId} not found`);
      }
      if (params.barberId && !barber) {
        throw new NotFoundException(`Barber with ID ${params.barberId} not found`);
      }

      // Validate service belongs to shop
      if (service.shopId !== params.shopId) {
        throw new BadRequestException('Service does not belong to the specified shop');
      }

      // Validate barber belongs to shop (if specified)
      if (barber && barber.shopId !== params.shopId) {
        throw new BadRequestException('Barber does not belong to the specified shop');
      }

      // Validate service has Square catalog object ID
      if (!service.squareItemId) {
        throw new BadRequestException('Service is not linked to Square catalog');
      }

      // Validate shop has Square location ID
      if (!shop.squareLocationId) {
        throw new BadRequestException('Shop is not linked to Square location');
      }

      // Call Square availability API
      const availabilities = await this.squareService.searchAvailability({
        locationId: shop.squareLocationId,
        serviceVariationId: service.squareItemId,
        teamMemberId: barber?.squareTeamMemberId || undefined,
        date: params.date,
      });

      // Transform to normalized format
      const slots: AvailabilitySlot[] = await Promise.all(
        availabilities.map(async (availability: any) => ({
          startAt: availability.startAt,
          endAt: this.calculateEndTime(availability.startAt, service.durationMins),
          barberId: await this.findBarberIdBySquareTeamMemberId(availability.appointmentSegments?.[0]?.teamMemberId),
        }))
      );

      this.logger.log(`Found ${slots.length} availability slots`);
      return slots;
    } catch (error) {
      this.logger.error('Failed to get availability:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateEndTime(startAt: string, durationMins: number): string {
    const startTime = new Date(startAt);
    const endTime = new Date(startTime.getTime() + durationMins * 60 * 1000);
    return endTime.toISOString();
  }

  private async findBarberIdBySquareTeamMemberId(squareTeamMemberId?: string): Promise<string | undefined> {
    if (!squareTeamMemberId) {
      return undefined;
    }

    const barber = await this.prismaService.barber.findFirst({
      where: { squareTeamMemberId },
    });

    return barber?.id;
  }
}
