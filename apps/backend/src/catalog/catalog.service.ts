import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Service } from '@prisma/client';
import { UpsertServiceDto } from './dto/upsert-service.dto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all services for a shop with caching
   */
  async findAllServices(shopId: string): Promise<Service[]> {
    const cacheKey = `services_${shopId}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Cache hit for services: ${shopId}`);
      return cached.data;
    }

    // Fetch from database
    this.logger.debug(`Cache miss for services: ${shopId}`);
    const services = await this.prisma.service.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });

    // Update cache
    this.cache.set(cacheKey, {
      data: services,
      timestamp: Date.now(),
    });

    return services;
  }

  /**
   * Find a service by ID
   */
  async findServiceById(id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            squareLocationId: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  /**
   * Upsert a service (create or update)
   */
  async upsertService(dto: UpsertServiceDto): Promise<Service> {
    // Verify shop exists
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${dto.shopId} not found`);
    }

    // Check if service exists by squareItemId
    const existingService = await this.prisma.service.findFirst({
      where: {
        squareItemId: dto.squareItemId,
      },
    });

    let service: Service;

    if (existingService) {
      // Update existing service
      service = await this.prisma.service.update({
        where: { id: existingService.id },
        data: {
          name: dto.name,
          description: dto.description,
          durationMins: dto.durationMins,
          priceCents: dto.priceCents,
          active: dto.active ?? true,
          shopId: dto.shopId,
        },
      });
      this.logger.debug(`Updated service: ${service.name}`);
    } else {
      // Create new service
      service = await this.prisma.service.create({
        data: {
          name: dto.name,
          description: dto.description,
          durationMins: dto.durationMins,
          priceCents: dto.priceCents,
          squareItemId: dto.squareItemId,
          active: dto.active ?? true,
          shopId: dto.shopId,
        },
      });
      this.logger.debug(`Created service: ${service.name}`);
    }

    // Invalidate cache for this shop
    this.invalidateCache(dto.shopId);

    return service;
  }

  /**
   * Invalidate cache for a shop
   */
  private invalidateCache(shopId: string): void {
    const cacheKey = `services_${shopId}`;
    this.cache.delete(cacheKey);
    this.logger.debug(`Cache invalidated for shop: ${shopId}`);
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('All cache cleared');
  }
}
