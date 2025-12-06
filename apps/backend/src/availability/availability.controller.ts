import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';

interface AvailabilitySlot {
  startAt: string; // ISO string
  endAt: string;   // ISO string
  barberId?: string;
}

interface AvailabilityResponse {
  success: boolean;
  data: {
    shopId: string;
    serviceId: string;
    barberId?: string;
    date: string;
    slots: AvailabilitySlot[];
  };
}

@Controller('availability')
export class AvailabilityController {
  private readonly logger = new Logger(AvailabilityController.name);

  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  async getAvailability(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetAvailabilityDto,
  ): Promise<AvailabilityResponse> {
    this.logger.log(`Getting availability for shop ${query.shopId}, service ${query.serviceId}, date ${query.date}`);
    
    try {
      const slots = await this.availabilityService.getAvailability({
        shopId: query.shopId,
        serviceId: query.serviceId,
        barberId: query.barberId,
        date: query.date,
      });

      return {
        success: true,
        data: {
          shopId: query.shopId,
          serviceId: query.serviceId,
          barberId: query.barberId,
          date: query.date,
          slots,
        },
      };
    } catch (error) {
      this.logger.error('Availability request failed:', error);
      throw error; // Let NestJS handle the HTTP status based on the exception type
    }
  }
}
