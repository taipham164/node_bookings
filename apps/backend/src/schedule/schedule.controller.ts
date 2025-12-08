import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { CreateTimeOffDto } from './dto/create-timeoff.dto';
import { UpdateTimeOffDto } from './dto/update-timeoff.dto';

@Controller('api/schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // Working Hours Endpoints

  @Get('working-hours')
  async getWorkingHours(
    @Query('shopId') shopId: string,
    @Query('barberId') barberId: string,
  ) {
    if (!shopId || !barberId) {
      throw new BadRequestException('shopId and barberId are required');
    }
    return this.scheduleService.findWorkingHours(shopId, barberId);
  }

  @Post('working-hours')
  @HttpCode(HttpStatus.CREATED)
  async setWorkingHours(@Body() dto: CreateWorkingHoursDto) {
    return this.scheduleService.setWorkingHours(dto);
  }

  @Put('working-hours/:id')
  async updateWorkingHours(
    @Param('id') id: string,
    @Body() dto: UpdateWorkingHoursDto,
  ) {
    return this.scheduleService.updateWorkingHours(id, dto);
  }

  @Delete('working-hours/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkingHours(@Param('id') id: string): Promise<void> {
    await this.scheduleService.deleteWorkingHours(id);
  }

  // Time Off Endpoints

  @Get('timeoff')
  async getTimeOff(
    @Query('shopId') shopId: string,
    @Query('barberId') barberId: string,
  ) {
    if (!shopId || !barberId) {
      throw new BadRequestException('shopId and barberId are required');
    }
    return this.scheduleService.findTimeOff(shopId, barberId);
  }

  @Post('timeoff')
  @HttpCode(HttpStatus.CREATED)
  async createTimeOff(@Body() dto: CreateTimeOffDto) {
    return this.scheduleService.createTimeOff(dto);
  }

  @Put('timeoff/:id')
  async updateTimeOff(@Param('id') id: string, @Body() dto: UpdateTimeOffDto) {
    return this.scheduleService.updateTimeOff(id, dto);
  }

  @Delete('timeoff/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTimeOff(@Param('id') id: string): Promise<void> {
    await this.scheduleService.deleteTimeOff(id);
  }

  // Availability Check Endpoint

  @Get('is-working')
  async isWorking(
    @Query('shopId') shopId: string,
    @Query('barberId') barberId: string,
    @Query('at') at: string,
    @Query('shopTimeZone') shopTimeZone?: string,
  ) {
    if (!shopId || !barberId || !at) {
      throw new BadRequestException('shopId, barberId, and at are required');
    }

    const atDate = new Date(at);
    if (isNaN(atDate.getTime())) {
      throw new BadRequestException('Invalid date format for "at" parameter');
    }

    const working = await this.scheduleService.isBarberWorkingAt({
      shopId,
      barberId,
      at: atDate,
      shopTimeZone,
    });

    return { working };
  }
}
