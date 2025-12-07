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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingValidationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const square_service_1 = require("../square/square.service");
let BookingValidationService = class BookingValidationService {
    constructor(prisma, squareService) {
        this.prisma = prisma;
        this.squareService = squareService;
    }
    /**
     * Validates all aspects of a booking request before creation
     * @throws BadRequestException if entity relationships are invalid
     * @throws ConflictException if there's a scheduling conflict
     * @throws NotFoundException if required entities don't exist
     */
    async validateBookingRequest(params) {
        const { shopId, serviceId, customerId, barberId, startAt } = params;
        // Step 1: Verify all entities exist and get their details
        const [shop, service, customer, barber] = await Promise.all([
            this.prisma.shop.findUnique({ where: { id: shopId } }),
            this.prisma.service.findUnique({ where: { id: serviceId } }),
            this.prisma.customer.findUnique({ where: { id: customerId } }),
            barberId ? this.prisma.barber.findUnique({ where: { id: barberId } }) : null,
        ]);
        // Step 2: Validate entity existence
        if (!shop) {
            throw new common_1.NotFoundException(`Shop with ID ${shopId} not found`);
        }
        if (!service) {
            throw new common_1.NotFoundException(`Service with ID ${serviceId} not found`);
        }
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${customerId} not found`);
        }
        if (barberId && !barber) {
            throw new common_1.NotFoundException(`Barber with ID ${barberId} not found`);
        }
        // Step 3: Validate entity relationships (all must belong to same shop)
        if (service.shopId !== shopId) {
            throw new common_1.BadRequestException(`Service does not belong to shop ${shopId}. Service belongs to shop ${service.shopId}`);
        }
        if (customer.shopId !== shopId) {
            throw new common_1.BadRequestException(`Customer does not belong to shop ${shopId}. Customer belongs to shop ${customer.shopId}`);
        }
        if (barber && barber.shopId !== shopId) {
            throw new common_1.BadRequestException(`Barber does not belong to shop ${shopId}. Barber belongs to shop ${barber.shopId}`);
        }
        // Step 4: Calculate end time based on service duration
        const startAtDate = new Date(startAt);
        const endAtDate = new Date(startAtDate.getTime() + service.durationMinutes * 60 * 1000);
        // Step 5: Check for barber double-booking
        if (barberId) {
            await this.validateBarberAvailability(barberId, startAtDate, endAtDate);
        }
        // Step 6: Check for customer double-booking
        await this.validateCustomerAvailability(customerId, startAtDate, endAtDate);
        // Step 7: Validate slot against Square availability
        await this.validateSquareAvailability({
            shop,
            service,
            barber,
            startAt: startAtDate,
        });
    }
    /**
     * Validates that a barber is available for the requested time slot
     * @throws ConflictException if barber is already booked
     */
    async validateBarberAvailability(barberId, startAt, endAt) {
        // Find overlapping appointments for the barber
        // An appointment overlaps if:
        // - It starts before the requested end time AND
        // - It ends after the requested start time
        const conflictingAppointment = await this.prisma.appointment.findFirst({
            where: {
                barberId,
                status: {
                    in: ['SCHEDULED', 'COMPLETED'],
                },
                AND: [
                    { startAt: { lt: endAt } },
                    { endAt: { gt: startAt } },
                ],
            },
            include: {
                barber: {
                    select: { displayName: true },
                },
                customer: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
        if (conflictingAppointment) {
            const barberName = conflictingAppointment.barber.displayName;
            const conflictStart = conflictingAppointment.startAt.toISOString();
            const conflictEnd = conflictingAppointment.endAt.toISOString();
            throw new common_1.ConflictException(`Barber "${barberName}" is already booked from ${conflictStart} to ${conflictEnd}`);
        }
    }
    /**
     * Validates that a customer doesn't have overlapping appointments
     * @throws ConflictException if customer has a conflicting appointment
     */
    async validateCustomerAvailability(customerId, startAt, endAt) {
        const conflictingAppointment = await this.prisma.appointment.findFirst({
            where: {
                customerId,
                status: {
                    in: ['SCHEDULED', 'COMPLETED'],
                },
                AND: [
                    { startAt: { lt: endAt } },
                    { endAt: { gt: startAt } },
                ],
            },
            include: {
                service: {
                    select: { name: true },
                },
            },
        });
        if (conflictingAppointment) {
            const serviceName = conflictingAppointment.service.name;
            const conflictStart = conflictingAppointment.startAt.toISOString();
            const conflictEnd = conflictingAppointment.endAt.toISOString();
            throw new common_1.ConflictException(`Customer already has an appointment (${serviceName}) from ${conflictStart} to ${conflictEnd}`);
        }
    }
    /**
     * Validates that the requested slot is available according to Square
     * @throws ConflictException if slot is not available in Square
     */
    async validateSquareAvailability(options) {
        const { shop, service, barber, startAt } = options;
        // Only validate if we have the necessary Square IDs
        if (!shop.squareLocationId || !service.squareCatalogObjectId) {
            // Skip Square validation if Square IDs are not set
            return;
        }
        const isAvailable = await this.squareService.verifySlotIsAvailable({
            locationId: shop.squareLocationId,
            serviceVariationId: service.squareCatalogObjectId,
            teamMemberId: barber?.squareTeamMemberId,
            startAt: startAt.toISOString(),
        });
        if (!isAvailable) {
            throw new common_1.ConflictException('The selected time slot is no longer available according to Square booking system');
        }
    }
};
exports.BookingValidationService = BookingValidationService;
exports.BookingValidationService = BookingValidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        square_service_1.SquareService])
], BookingValidationService);
//# sourceMappingURL=booking-validation.service.js.map