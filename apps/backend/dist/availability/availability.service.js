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
var AvailabilityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const square_service_1 = require("../square/square.service");
let AvailabilityService = AvailabilityService_1 = class AvailabilityService {
    constructor(prismaService, squareService) {
        this.prismaService = prismaService;
        this.squareService = squareService;
        this.logger = new common_1.Logger(AvailabilityService_1.name);
    }
    async getAvailability(params) {
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
                throw new common_1.NotFoundException(`Shop with ID ${params.shopId} not found`);
            }
            if (!service) {
                throw new common_1.NotFoundException(`Service with ID ${params.serviceId} not found`);
            }
            if (params.barberId && !barber) {
                throw new common_1.NotFoundException(`Barber with ID ${params.barberId} not found`);
            }
            // Validate service belongs to shop
            if (service.shopId !== params.shopId) {
                throw new common_1.BadRequestException('Service does not belong to the specified shop');
            }
            // Validate barber belongs to shop (if specified)
            if (barber && barber.shopId !== params.shopId) {
                throw new common_1.BadRequestException('Barber does not belong to the specified shop');
            }
            // Validate service has Square catalog object ID
            if (!service.squareCatalogObjectId) {
                throw new common_1.BadRequestException('Service is not linked to Square catalog');
            }
            // Validate shop has Square location ID
            if (!shop.squareLocationId) {
                throw new common_1.BadRequestException('Shop is not linked to Square location');
            }
            // Call Square availability API
            const availabilities = await this.squareService.searchAvailability({
                locationId: shop.squareLocationId,
                serviceVariationId: service.squareCatalogObjectId,
                teamMemberId: barber?.squareTeamMemberId || undefined,
                date: params.date,
            });
            // Transform to normalized format
            const slots = await Promise.all(availabilities.map(async (availability) => ({
                startAt: availability.startAt,
                endAt: this.calculateEndTime(availability.startAt, service.durationMinutes),
                barberId: await this.findBarberIdBySquareTeamMemberId(availability.appointmentSegments?.[0]?.teamMemberId),
            })));
            this.logger.log(`Found ${slots.length} availability slots`);
            return slots;
        }
        catch (error) {
            this.logger.error('Failed to get availability:', error);
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to get availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    calculateEndTime(startAt, durationMinutes) {
        const startTime = new Date(startAt);
        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
        return endTime.toISOString();
    }
    async findBarberIdBySquareTeamMemberId(squareTeamMemberId) {
        if (!squareTeamMemberId) {
            return undefined;
        }
        const barber = await this.prismaService.barber.findFirst({
            where: { squareTeamMemberId },
        });
        return barber?.id;
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = AvailabilityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        square_service_1.SquareService])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map