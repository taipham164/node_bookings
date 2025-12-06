import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BarberService } from './barber.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { Barber } from '@prisma/client';

@Controller('barbers')
export class BarberController {
  constructor(private readonly barberService: BarberService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBarberDto: CreateBarberDto): Promise<Barber> {
    return this.barberService.create(createBarberDto);
  }

  @Get()
  async findAll(): Promise<Barber[]> {
    return this.barberService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Barber> {
    return this.barberService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBarberDto: UpdateBarberDto,
  ): Promise<Barber> {
    return this.barberService.update(id, updateBarberDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.barberService.remove(id);
  }
}
