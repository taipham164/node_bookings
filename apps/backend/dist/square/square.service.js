"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SquareService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SquareService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const square_1 = require("square");
const bigint_helpers_1 = require("../util/bigint-helpers");
let SquareService = SquareService_1 = class SquareService {
    constructor(configService, prismaService) {
        this.configService = configService;
        this.prismaService = prismaService;
        this.logger = new common_1.Logger(SquareService_1.name);
        const accessToken = this.configService.get('SQUARE_ACCESS_TOKEN');
        const environment = this.configService.get('SQUARE_ENVIRONMENT', 'sandbox');
        const locationId = this.configService.get('SQUARE_LOCATION_ID');
        if (!locationId) {
            throw new Error('SQUARE_LOCATION_ID is required');
        }
        this.locationId = locationId;
        if (!accessToken) {
            throw new Error('SQUARE_ACCESS_TOKEN is required');
        }
        const squareEnvironment = environment.toLowerCase() === 'production'
            ? square_1.Environment.Production
            : square_1.Environment.Sandbox;
        this.squareClient = new square_1.Client({
            accessToken,
            environment: squareEnvironment,
            userAgentDetail: 'tyler_platform_nestjs'
        });
        this.logger.log(`Square client initialized for ${environment} environment`);
    }
    /**
     * Fetch all APPOINTMENTS_SERVICE items from Square Catalog
     */
    async fetchServicesFromSquare() {
        try {
            this.logger.log('Fetching services from Square Catalog...');
            const { result } = await this.squareClient.catalogApi.listCatalog();
            const objects = result.objects || [];
            // Filter for APPOINTMENTS_SERVICE items that are not deleted
            const serviceItems = objects.filter((obj) => {
                if (obj.type !== 'ITEM' || !obj.itemData || obj.isDeleted) {
                    return false;
                }
                const itemData = obj.itemData;
                return itemData.productType === 'APPOINTMENTS_SERVICE';
            });
            this.logger.log(`Found ${serviceItems.length} service items in Square Catalog`);
            // Transform Square items to our format
            const services = [];
            for (const item of serviceItems) {
                const itemData = item.itemData;
                const variations = itemData.variations || [];
                // Only include items that have at least one bookable variation
                const bookableVariations = variations.filter((variation) => variation.itemVariationData?.availableForBooking === true);
                if (bookableVariations.length === 0) {
                    continue;
                }
                // Get the primary variation for basic info
                const primaryVariation = bookableVariations[0];
                const variationData = primaryVariation.itemVariationData;
                if (!variationData)
                    continue;
                // Extract duration from service duration or default to 60 minutes
                const durationMinutes = (0, bigint_helpers_1.durationMsToMinutes)(variationData.serviceDuration);
                // Extract price in cents using safe BigInt conversion
                const priceCents = (0, bigint_helpers_1.monetaryAmountToCents)(variationData.priceMoney?.amount);
                services.push({
                    id: item.id,
                    name: itemData.name || 'Unnamed Service',
                    durationMinutes,
                    priceCents,
                    squareCatalogObjectId: item.id,
                    description: itemData.description,
                    variations: bookableVariations.map((variation) => ({
                        id: variation.id,
                        name: variation.itemVariationData?.name || itemData.name || 'Unnamed Variation',
                        priceCents: (0, bigint_helpers_1.monetaryAmountToCents)(variation.itemVariationData?.priceMoney?.amount),
                        availableForBooking: variation.itemVariationData?.availableForBooking || false,
                    })),
                });
            }
            this.logger.log(`Processed ${services.length} bookable services`);
            return services;
        }
        catch (error) {
            this.logger.error('Failed to fetch services from Square:', error);
            throw new common_1.BadRequestException('Failed to fetch services from Square Catalog');
        }
    }
    /**
     * Fetch all active team members from Square
     */
    async fetchBarbersFromSquare() {
        try {
            this.logger.log('Fetching team members from Square...');
            const { result } = await this.squareClient.teamApi.searchTeamMembers({
                query: {
                    filter: {
                        locationIds: [this.locationId],
                        status: 'ACTIVE'
                    }
                }
            });
            const teamMembers = result.teamMembers || [];
            this.logger.log(`Found ${teamMembers.length} active team members in Square`);
            // Transform Square team members to our format
            const barbers = teamMembers.map((member) => ({
                id: member.id,
                givenName: member.givenName,
                familyName: member.familyName,
                displayName: member.givenName && member.familyName
                    ? `${member.givenName} ${member.familyName}`.trim()
                    : member.givenName || member.familyName || `Team Member ${member.id}`,
                emailAddress: member.emailAddress,
                phoneNumber: member.phoneNumber,
                status: member.status,
            }));
            this.logger.log(`Processed ${barbers.length} team members for sync`);
            return barbers;
        }
        catch (error) {
            this.logger.error('Failed to fetch team members from Square:', error);
            throw new common_1.BadRequestException('Failed to fetch team members from Square');
        }
    }
    /**
     * Sync team members from Square to the database as barbers
     */
    async syncBarbersToDb() {
        const result = {
            created: 0,
            updated: 0,
            skipped: 0,
            total: 0,
            errors: [],
        };
        try {
            // Find the shop that matches our Square location
            let shop = await this.prismaService.shop.findFirst({
                where: { squareLocationId: this.locationId },
            });
            if (!shop) {
                // Fallback: use the first available shop
                shop = await this.prismaService.shop.findFirst();
                if (!shop) {
                    throw new Error('No shop found in database. Please create a shop first.');
                }
                this.logger.warn(`No shop found with Square location ID ${this.locationId}. Using shop: ${shop.name}`);
            }
            const squareBarbers = await this.fetchBarbersFromSquare();
            result.total = squareBarbers.length;
            this.logger.log(`Syncing ${squareBarbers.length} team members to barbers table...`);
            for (const squareBarber of squareBarbers) {
                try {
                    // Check if barber already exists by squareTeamMemberId and shopId
                    const existingBarber = await this.prismaService.barber.findFirst({
                        where: {
                            squareTeamMemberId: squareBarber.id,
                            shopId: shop.id,
                        },
                    });
                    if (existingBarber) {
                        // Update existing barber
                        await this.prismaService.barber.update({
                            where: { id: existingBarber.id },
                            data: {
                                displayName: squareBarber.displayName,
                                active: squareBarber.status === 'ACTIVE',
                                updatedAt: new Date(),
                            },
                        });
                        result.updated++;
                        this.logger.debug(`Updated barber: ${squareBarber.displayName}`);
                    }
                    else {
                        // Create new barber
                        await this.prismaService.barber.create({
                            data: {
                                displayName: squareBarber.displayName,
                                squareTeamMemberId: squareBarber.id,
                                active: squareBarber.status === 'ACTIVE',
                                shopId: shop.id,
                            },
                        });
                        result.created++;
                        this.logger.debug(`Created barber: ${squareBarber.displayName}`);
                    }
                }
                catch (error) {
                    const errorMsg = `Failed to sync barber ${squareBarber.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    this.logger.error(errorMsg);
                    result.errors.push(errorMsg);
                    result.skipped++;
                }
            }
            this.logger.log(`Barber sync completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to sync barbers:', error);
            throw new common_1.BadRequestException(`Failed to sync barbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Sync services from Square to the database
     */
    async syncServicesToDb() {
        const result = {
            created: 0,
            updated: 0,
            skipped: 0,
            total: 0,
            errors: [],
        };
        try {
            // First, we need to find a shop that matches our Square location
            // For now, we'll try to find by squareLocationId or use the first shop
            let shop = await this.prismaService.shop.findFirst({
                where: { squareLocationId: this.locationId },
            });
            if (!shop) {
                // Fallback: use the first available shop
                shop = await this.prismaService.shop.findFirst();
                if (!shop) {
                    throw new Error('No shop found in database. Please create a shop first.');
                }
                this.logger.warn(`No shop found with Square location ID ${this.locationId}. Using shop: ${shop.name}`);
            }
            const squareServices = await this.fetchServicesFromSquare();
            result.total = squareServices.length;
            this.logger.log(`Syncing ${squareServices.length} services to database...`);
            for (const squareService of squareServices) {
                try {
                    // Check if service already exists by squareCatalogObjectId
                    const existingService = await this.prismaService.service.findFirst({
                        where: {
                            squareCatalogObjectId: squareService.squareCatalogObjectId,
                            shopId: shop.id,
                        },
                    });
                    if (existingService) {
                        // Update existing service
                        await this.prismaService.service.update({
                            where: { id: existingService.id },
                            data: {
                                name: squareService.name,
                                durationMinutes: squareService.durationMinutes,
                                priceCents: squareService.priceCents,
                                updatedAt: new Date(),
                            },
                        });
                        result.updated++;
                        this.logger.debug(`Updated service: ${squareService.name}`);
                    }
                    else {
                        // Create new service
                        await this.prismaService.service.create({
                            data: {
                                name: squareService.name,
                                durationMinutes: squareService.durationMinutes,
                                priceCents: squareService.priceCents,
                                squareCatalogObjectId: squareService.squareCatalogObjectId,
                                shopId: shop.id,
                            },
                        });
                        result.created++;
                        this.logger.debug(`Created service: ${squareService.name}`);
                    }
                }
                catch (error) {
                    const errorMsg = `Failed to sync service ${squareService.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    this.logger.error(errorMsg);
                    result.errors.push(errorMsg);
                    result.skipped++;
                }
            }
            this.logger.log(`Sync completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to sync services:', error);
            throw new common_1.BadRequestException(`Failed to sync services: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Search availability using Square Bookings API
     */
    async searchAvailability(options) {
        try {
            this.logger.log(`Searching availability for service ${options.serviceVariationId} on ${options.date}`);
            // Create date range for the specified date
            const startDate = new Date(`${options.date}T00:00:00.000Z`);
            const endDate = new Date(`${options.date}T23:59:59.999Z`);
            // Build segment filter
            const segmentFilter = {
                serviceVariationId: options.serviceVariationId,
            };
            // Add team member filter if specified
            if (options.teamMemberId) {
                segmentFilter.teamMemberIdFilter = {
                    any: [options.teamMemberId],
                };
            }
            // Build search request
            const searchRequest = {
                query: {
                    filter: {
                        locationId: options.locationId,
                        segmentFilters: [segmentFilter],
                        startAtRange: {
                            startAt: startDate.toISOString(),
                            endAt: endDate.toISOString(),
                        },
                    },
                },
            };
            this.logger.debug('Square availability search request:', JSON.stringify(searchRequest, null, 2));
            // Call Square API with pagination
            let allAvailabilities = [];
            let cursor = undefined;
            let pageCount = 0;
            const maxPages = 10; // Prevent infinite loops
            do {
                pageCount++;
                const requestWithCursor = cursor ? { ...searchRequest, cursor } : searchRequest;
                try {
                    const { result } = await this.squareClient.bookingsApi.searchAvailability(requestWithCursor);
                    if (result.availabilities && result.availabilities.length > 0) {
                        allAvailabilities = allAvailabilities.concat(result.availabilities);
                        this.logger.debug(`Page ${pageCount}: Found ${result.availabilities.length} slots, total: ${allAvailabilities.length}`);
                    }
                    cursor = result.cursor;
                    // Break if no more results or reached max pages
                    if (!result.availabilities || result.availabilities.length === 0 || pageCount >= maxPages) {
                        break;
                    }
                }
                catch (pageError) {
                    this.logger.error(`Error fetching availability page ${pageCount}:`, pageError);
                    break;
                }
            } while (cursor);
            this.logger.log(`Found ${allAvailabilities.length} total availability slots`);
            return allAvailabilities;
        }
        catch (error) {
            this.logger.error('Failed to search availability from Square:', error);
            throw new common_1.BadRequestException('Failed to search availability from Square');
        }
    }
    /**
     * Get Square client for advanced usage
     */
    getSquareClient() {
        return this.squareClient;
    }
    /**
     * Get configured location ID
     */
    getLocationId() {
        return this.locationId;
    }
};
exports.SquareService = SquareService;
exports.SquareService = SquareService = SquareService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], SquareService);
//# sourceMappingURL=square.service.js.map