import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { CreateTimeOffDto } from './dto/create-timeoff.dto';
import { UpdateTimeOffDto } from './dto/update-timeoff.dto';

interface IsBarberWorkingAtParams {
  shopId: string;
  barberId: string;
  at: Date; // in UTC
  shopTimeZone?: string; // optional, can be "America/Los_Angeles"
}

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  // Working Hours Methods
  async findWorkingHours(shopId: string, barberId: string) {
    return this.prisma.barberWorkingHours.findMany({
      where: {
        shopId,
        barberId,
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });
  }

  async setWorkingHours(dto: CreateWorkingHoursDto) {
    // Upsert logic: one record per dayOfWeek per barber
    // Check if a record already exists for this barber and day
    const existing = await this.prisma.barberWorkingHours.findFirst({
      where: {
        shopId: dto.shopId,
        barberId: dto.barberId,
        dayOfWeek: dto.dayOfWeek,
      },
    });

    if (existing) {
      // Update existing record
      return this.prisma.barberWorkingHours.update({
        where: { id: existing.id },
        data: {
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
      });
    }

    // Create new record
    return this.prisma.barberWorkingHours.create({
      data: dto,
    });
  }

  async updateWorkingHours(id: string, dto: UpdateWorkingHoursDto) {
    // Check if the record exists
    const existing = await this.prisma.barberWorkingHours.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Working hours with ID ${id} not found`);
    }

    return this.prisma.barberWorkingHours.update({
      where: { id },
      data: dto,
    });
  }

  async deleteWorkingHours(id: string): Promise<void> {
    // Check if the record exists
    const existing = await this.prisma.barberWorkingHours.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Working hours with ID ${id} not found`);
    }

    await this.prisma.barberWorkingHours.delete({
      where: { id },
    });
  }

  // Time Off Methods
  async findTimeOff(shopId: string, barberId: string) {
    return this.prisma.barberTimeOff.findMany({
      where: {
        shopId,
        barberId,
      },
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async createTimeOff(dto: CreateTimeOffDto) {
    return this.prisma.barberTimeOff.create({
      data: {
        shopId: dto.shopId,
        barberId: dto.barberId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        reason: dto.reason,
      },
    });
  }

  async updateTimeOff(id: string, dto: UpdateTimeOffDto) {
    // Check if the record exists
    const existing = await this.prisma.barberTimeOff.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Time off record with ID ${id} not found`);
    }

    return this.prisma.barberTimeOff.update({
      where: { id },
      data: {
        ...(dto.startAt && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt && { endAt: new Date(dto.endAt) }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
      },
    });
  }

  async deleteTimeOff(id: string): Promise<void> {
    // Check if the record exists
    const existing = await this.prisma.barberTimeOff.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Time off record with ID ${id} not found`);
    }

    await this.prisma.barberTimeOff.delete({
      where: { id },
    });
  }

  /**
   * Checks if a barber is working at a specific time.
   *
   * This method:
   * 1. Converts the UTC time to the shop's local time zone
   * 2. Checks if there are working hours defined for that day of the week
   * 3. Verifies the time falls within the working hours
   * 4. Ensures there's no time-off block covering this time
   *
   * Note: endAt in BarberTimeOff is treated as exclusive (startAt <= at < endAt)
   *
   * @param params - Object containing shopId, barberId, at (UTC Date), and optional shopTimeZone
   * @returns Promise<boolean> - true if barber is working, false otherwise
   */
  async isBarberWorkingAt(params: IsBarberWorkingAtParams): Promise<boolean> {
    const { shopId, barberId, at, shopTimeZone } = params;

    // Convert UTC time to local time
    let localDate: Date;
    let dayOfWeek: number;
    let localTimeString: string;

    if (shopTimeZone) {
      // Convert to shop timezone using Intl.DateTimeFormat
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: shopTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(at);
      const year = parts.find((p) => p.type === 'year')?.value || '';
      const month = parts.find((p) => p.type === 'month')?.value || '';
      const day = parts.find((p) => p.type === 'day')?.value || '';
      const hour = parts.find((p) => p.type === 'hour')?.value || '';
      const minute = parts.find((p) => p.type === 'minute')?.value || '';

      // Create a date object in the local timezone
      localDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);

      // Get day of week for the local time
      const localDateForDayOfWeek = new Date(
        at.toLocaleString('en-US', { timeZone: shopTimeZone })
      );
      dayOfWeek = localDateForDayOfWeek.getDay(); // 0 = Sunday, 6 = Saturday

      localTimeString = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    } else {
      // No timezone conversion, treat as local time
      localDate = at;
      dayOfWeek = at.getDay();
      const hours = at.getHours().toString().padStart(2, '0');
      const minutes = at.getMinutes().toString().padStart(2, '0');
      localTimeString = `${hours}:${minutes}`;
    }

    // 1. Check if there are working hours for this day
    const workingHours = await this.prisma.barberWorkingHours.findFirst({
      where: {
        shopId,
        barberId,
        dayOfWeek,
      },
    });

    if (!workingHours) {
      return false; // No working hours defined for this day
    }

    // 2. Check if the time is within working hours
    if (
      localTimeString < workingHours.startTime ||
      localTimeString >= workingHours.endTime
    ) {
      return false; // Outside working hours
    }

    // 3. Check for time-off blocks
    const timeOffBlocks = await this.prisma.barberTimeOff.findMany({
      where: {
        shopId,
        barberId,
        AND: [
          { startAt: { lte: at } }, // Time off started before or at this time
          { endAt: { gt: at } }, // Time off ends after this time (exclusive)
        ],
      },
    });

    if (timeOffBlocks.length > 0) {
      return false; // Barber is on time off
    }

    return true; // Barber is working
  }
}
