import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Client, Environment, CatalogObject } from 'square';
import { ConfigService } from '@nestjs/config';
import { CatalogService } from './catalog.service';

interface SquareServiceItem {
  id: string;
  name: string;
  description?: string;
  durationMins: number;
  priceCents: number;
  squareItemId: string;
}

interface SyncResult {
  created: number;
  updated: number;
  deactivated: number;
  total: number;
  errors: string[];
}

@Injectable()
export class CatalogSyncService {
  private readonly logger = new Logger(CatalogSyncService.name);
  private readonly squareClient: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
  ) {
    const accessToken = this.configService.get<string>('SQUARE_ACCESS_TOKEN');
    const environment = this.configService.get<string>('SQUARE_ENVIRONMENT', 'sandbox');

    if (!accessToken) {
      throw new Error('SQUARE_ACCESS_TOKEN is required');
    }

    const squareEnvironment = environment.toLowerCase() === 'production'
      ? Environment.Production
      : Environment.Sandbox;

    this.squareClient = new Client({
      accessToken,
      environment: squareEnvironment,
      userAgentDetail: 'catalog_module_nestjs'
    });

    this.logger.log(`Square client initialized for catalog sync in ${environment} environment`);
  }

  /**
   * Fetch APPOINTMENTS_SERVICE items from Square Catalog
   */
  async fetchServicesFromSquare(): Promise<SquareServiceItem[]> {
    try {
      this.logger.log('Fetching APPOINTMENTS_SERVICE items from Square Catalog...');

      const { result } = await this.squareClient.catalogApi.listCatalog();
      const objects = result.objects || [];

      // Filter for APPOINTMENTS_SERVICE items that are not deleted
      const serviceItems = objects.filter((obj: CatalogObject) => {
        if (obj.type !== 'ITEM' || !obj.itemData || obj.isDeleted) {
          return false;
        }

        const itemData = obj.itemData as any;
        return itemData.productType === 'APPOINTMENTS_SERVICE';
      });

      this.logger.log(`Found ${serviceItems.length} APPOINTMENTS_SERVICE items in Square Catalog`);

      // Transform Square items to our format
      const services: SquareServiceItem[] = [];

      for (const item of serviceItems) {
        const itemData = item.itemData as any;
        const variations = itemData.variations || [];

        // Only include items that have at least one bookable variation
        const bookableVariations = variations.filter((variation: any) =>
          variation.itemVariationData?.availableForBooking === true
        );

        if (bookableVariations.length === 0) {
          continue;
        }

        // Get the primary variation for basic info
        const primaryVariation = bookableVariations[0];
        const variationData = primaryVariation.itemVariationData;

        if (!variationData) continue;

        // Extract duration from appointment_segments (in milliseconds, convert to minutes)
        let durationMins = 60; // default
        if (variationData.serviceDuration) {
          const durationMs = typeof variationData.serviceDuration === 'bigint'
            ? Number(variationData.serviceDuration)
            : parseInt(String(variationData.serviceDuration), 10);
          durationMins = Math.round(durationMs / 60000); // ms to minutes
        }

        // Extract price in cents
        let priceCents = 0;
        if (variationData.priceMoney?.amount) {
          const amount = variationData.priceMoney.amount;
          priceCents = typeof amount === 'bigint'
            ? Number(amount)
            : parseInt(String(amount), 10);
        }

        services.push({
          id: item.id!,
          name: itemData.name || 'Unnamed Service',
          description: itemData.description,
          durationMins,
          priceCents,
          squareItemId: item.id!,
        });
      }

      this.logger.log(`Processed ${services.length} bookable appointment services`);
      return services;
    } catch (error) {
      this.logger.error('Failed to fetch services from Square:', error);
      throw new BadRequestException('Failed to fetch services from Square Catalog');
    }
  }

  /**
   * Sync services from Square to the local database for a specific shop
   */
  async syncFromSquare(shopId: string): Promise<SyncResult> {
    const result: SyncResult = {
      created: 0,
      updated: 0,
      deactivated: 0,
      total: 0,
      errors: [],
    };

    try {
      // Verify shop exists
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
      });

      if (!shop) {
        throw new BadRequestException(`Shop with ID ${shopId} not found`);
      }

      // Fetch services from Square
      const squareServices = await this.fetchServicesFromSquare();
      result.total = squareServices.length;

      this.logger.log(`Syncing ${squareServices.length} services for shop ${shop.name}...`);

      // Track Square item IDs that were returned
      const squareItemIds = new Set<string>();

      // Upsert each service
      for (const squareService of squareServices) {
        try {
          squareItemIds.add(squareService.squareItemId);

          // Check if service already exists
          const existingService = await this.prisma.service.findFirst({
            where: {
              squareItemId: squareService.squareItemId,
            },
          });

          if (existingService) {
            // Update existing service
            await this.prisma.service.update({
              where: { id: existingService.id },
              data: {
                name: squareService.name,
                description: squareService.description,
                durationMins: squareService.durationMins,
                priceCents: squareService.priceCents,
                shopId: shopId,
                active: true, // Reactivate if it was deactivated
              },
            });
            result.updated++;
            this.logger.debug(`Updated service: ${squareService.name}`);
          } else {
            // Create new service
            await this.prisma.service.create({
              data: {
                name: squareService.name,
                description: squareService.description,
                durationMins: squareService.durationMins,
                priceCents: squareService.priceCents,
                squareItemId: squareService.squareItemId,
                shopId: shopId,
                active: true,
              },
            });
            result.created++;
            this.logger.debug(`Created service: ${squareService.name}`);
          }
        } catch (error) {
          const errorMsg = `Failed to sync service ${squareService.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Deactivate services that are no longer in Square
      const localServices = await this.prisma.service.findMany({
        where: { shopId },
      });

      for (const localService of localServices) {
        if (!squareItemIds.has(localService.squareItemId)) {
          await this.prisma.service.update({
            where: { id: localService.id },
            data: { active: false },
          });
          result.deactivated++;
          this.logger.debug(`Deactivated service: ${localService.name}`);
        }
      }

      // Clear cache for this shop
      this.catalogService.clearCache();

      this.logger.log(
        `Sync completed: ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated`
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to sync services from Square:', error);
      throw new BadRequestException(
        `Failed to sync services from Square: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
