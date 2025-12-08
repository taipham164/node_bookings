import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogSyncService } from './catalog.sync.service';
import { UpsertServiceDto } from './dto/upsert-service.dto';
import { Service } from '@prisma/client';

@Controller('api/catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly catalogSyncService: CatalogSyncService,
  ) {}

  /**
   * GET /api/catalog/services?shopId=abc
   * Get all services for a shop
   */
  @Get('services')
  async getServices(@Query('shopId') shopId: string): Promise<Service[]> {
    if (!shopId) {
      throw new BadRequestException('shopId query parameter is required');
    }
    return this.catalogService.findAllServices(shopId);
  }

  /**
   * GET /api/catalog/services/:id
   * Get a specific service by ID
   */
  @Get('services/:id')
  async getServiceById(@Param('id') id: string): Promise<Service> {
    return this.catalogService.findServiceById(id);
  }

  /**
   * POST /api/catalog/sync?shopId=abc
   * Sync services from Square for a shop
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncServices(@Query('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('shopId query parameter is required');
    }
    return this.catalogSyncService.syncFromSquare(shopId);
  }

  /**
   * POST /api/catalog/upsert
   * Upsert a service (create or update)
   */
  @Post('upsert')
  @HttpCode(HttpStatus.CREATED)
  async upsertService(@Body() dto: UpsertServiceDto): Promise<Service> {
    return this.catalogService.upsertService(dto);
  }
}
