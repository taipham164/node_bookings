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
var AppointmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const square_service_1 = require("../square/square.service");
const payment_service_1 = require("../payment/payment.service");
const booking_validation_service_1 = require("./booking-validation.service");
let AppointmentService = AppointmentService_1 = class AppointmentService {
    constructor(prisma, squareService, bookingValidationService) {
        this.prisma = prisma;
        this.squareService = squareService;
        this.paymentService = paymentService;
        this.bookingValidationService = bookingValidationService;
        this.logger = new common_1.Logger(AppointmentService_1.name);
    }
    async findAll() {
        return this.prisma.appointment.findMany({
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        squareLocationId: true,
                    },
                },
                barber: {
                    select: {
                        id: true,
                        displayName: true,
                        squareTeamMemberId: true,
                    },
                },
                service: {
                    select: {
                        id: true,
                        name: true,
                        durationMinutes: true,
                        priceCents: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                startAt: 'desc',
            },
        });
    }
    async findOne(id) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        squareLocationId: true,
                    },
                },
                barber: {
                    select: {
                        id: true,
                        displayName: true,
                        squareTeamMemberId: true,
                        active: true,
                    },
                },
                service: {
                    select: {
                        id: true,
                        name: true,
                        durationMinutes: true,
                        priceCents: true,
                        squareCatalogObjectId: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                        squareCustomerId: true,
                    },
                },
                noShowCharges: {
                    select: {
                        id: true,
                        amountCents: true,
                        squarePaymentId: true,
                        chargedAt: true,
                    },
                },
            },
        });
        if (!appointment) {
            throw new common_1.NotFoundException(`Appointment with ID ${id} not found`);
        }
        return appointment;
    }
    async create(createAppointmentDto) {
        // Run comprehensive booking validation before creating the appointment
        await this.bookingValidationService.validateBookingRequest({
            shopId: createAppointmentDto.shopId,
            serviceId: createAppointmentDto.serviceId,
            customerId: createAppointmentDto.customerId,
            barberId: createAppointmentDto.barberId,
            startAt: createAppointmentDto.startAt,
        });
        // Validate appointment times
        const startAt = new Date(createAppointmentDto.startAt);
        const endAt = new Date(createAppointmentDto.endAt);
        if (startAt >= endAt) {
            throw new common_1.BadRequestException('End time must be after start time');
        }
        if (startAt < new Date()) {
            throw new common_1.BadRequestException('Appointment cannot be scheduled in the past');
        }
        // All validations passed, create the appointment
        return this.prisma.appointment.create({
            data: {
                ...createAppointmentDto,
                startAt,
                endAt,
            },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        squareLocationId: true,
                    },
                },
                barber: {
                    select: {
                        id: true,
                        displayName: true,
                        squareTeamMemberId: true,
                    },
                },
                service: {
                    select: {
                        id: true,
                        name: true,
                        durationMinutes: true,
                        priceCents: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });
    }
    async update(id, updateAppointmentDto) {
        // Check if appointment exists
        await this.findOne(id);
        // If updating related entities, validate they exist and belong to the same shop
        if (updateAppointmentDto.shopId || updateAppointmentDto.barberId ||
            updateAppointmentDto.serviceId || updateAppointmentDto.customerId) {
            const appointment = await this.prisma.appointment.findUnique({
                where: { id },
                include: { shop: true, barber: true, service: true, customer: true },
            });
            const shopId = updateAppointmentDto.shopId || appointment.shopId;
            if (updateAppointmentDto.barberId) {
                const barber = await this.prisma.barber.findUnique({
                    where: { id: updateAppointmentDto.barberId }
                });
                if (!barber || barber.shopId !== shopId) {
                    throw new common_1.BadRequestException('Barber does not exist or belong to the specified shop');
                }
            }
            if (updateAppointmentDto.serviceId) {
                const service = await this.prisma.service.findUnique({
                    where: { id: updateAppointmentDto.serviceId }
                });
                if (!service || service.shopId !== shopId) {
                    throw new common_1.BadRequestException('Service does not exist or belong to the specified shop');
                }
            }
            if (updateAppointmentDto.customerId) {
                const customer = await this.prisma.customer.findUnique({
                    where: { id: updateAppointmentDto.customerId }
                });
                if (!customer || customer.shopId !== shopId) {
                    throw new common_1.BadRequestException('Customer does not exist or belong to the specified shop');
                }
            }
        }
        // Validate appointment times if provided
        if (updateAppointmentDto.startAt || updateAppointmentDto.endAt) {
            const appointment = await this.prisma.appointment.findUnique({ where: { id } });
            const startAt = updateAppointmentDto.startAt ? new Date(updateAppointmentDto.startAt) : appointment.startAt;
            const endAt = updateAppointmentDto.endAt ? new Date(updateAppointmentDto.endAt) : appointment.endAt;
            if (startAt >= endAt) {
                throw new common_1.BadRequestException('End time must be after start time');
            }
        }
        const updateData = { ...updateAppointmentDto };
        if (updateAppointmentDto.startAt) {
            updateData.startAt = new Date(updateAppointmentDto.startAt);
        }
        if (updateAppointmentDto.endAt) {
            updateData.endAt = new Date(updateAppointmentDto.endAt);
        }
        return this.prisma.appointment.update({
            where: { id },
            data: updateData,
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        squareLocationId: true,
                    },
                },
                barber: {
                    select: {
                        id: true,
                        displayName: true,
                        squareTeamMemberId: true,
                    },
                },
                service: {
                    select: {
                        id: true,
                        name: true,
                        durationMinutes: true,
                        priceCents: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });
    }
    async remove(id) {
        // Check if appointment exists
        await this.findOne(id);
        return this.prisma.appointment.delete({
            where: { id },
        });
    }
    /**
     * Create a booking with Square integration
     * This method orchestrates the full booking flow:
     * 1. Validates entities exist
     * 2. Creates/finds Square customer
     * 3. Creates Square booking
     * 4. Creates local appointment with squareBookingId
     */
    async createBooking(createBookingDto) {
        try {
            this.logger.log(`Creating booking for customer ${createBookingDto.customerId}`);
            // 1. Load and validate all required entities
            const [shop, service, barber, customer] = await Promise.all([
                this.prisma.shop.findUnique({ where: { id: createBookingDto.shopId } }),
                this.prisma.service.findUnique({ where: { id: createBookingDto.serviceId } }),
                createBookingDto.barberId
                    ? this.prisma.barber.findUnique({ where: { id: createBookingDto.barberId } })
                    : null,
                this.prisma.customer.findUnique({ where: { id: createBookingDto.customerId } }),
            ]);
            // Validate entities exist
            if (!shop) {
                throw new common_1.NotFoundException(`Shop with ID ${createBookingDto.shopId} not found`);
            }
            if (!service) {
                throw new common_1.NotFoundException(`Service with ID ${createBookingDto.serviceId} not found`);
            }
            if (createBookingDto.barberId && !barber) {
                throw new common_1.NotFoundException(`Barber with ID ${createBookingDto.barberId} not found`);
            }
            if (!customer) {
                throw new common_1.NotFoundException(`Customer with ID ${createBookingDto.customerId} not found`);
            }
            // Validate entities belong to the same shop
            if (service.shopId !== createBookingDto.shopId) {
                throw new common_1.BadRequestException('Service does not belong to the specified shop');
            }
            if (barber && barber.shopId !== createBookingDto.shopId) {
                throw new common_1.BadRequestException('Barber does not belong to the specified shop');
            }
            if (customer.shopId !== createBookingDto.shopId) {
                throw new common_1.BadRequestException('Customer does not belong to the specified shop');
            }
            // Validate required Square IDs
            if (!shop.squareLocationId) {
                throw new common_1.BadRequestException('Shop is not linked to Square location');
            }
            if (!service.squareCatalogObjectId) {
                throw new common_1.BadRequestException('Service is not linked to Square catalog');
            }
            if (createBookingDto.barberId && barber && !barber.squareTeamMemberId) {
                throw new common_1.BadRequestException('Barber is not linked to Square team member');
            }
            // Validate start time
            const startAt = new Date(createBookingDto.startAt);
            if (startAt < new Date()) {
                throw new common_1.BadRequestException('Booking cannot be scheduled in the past');
            }
            // 2. Find or create Square customer
            this.logger.log(`Finding or creating Square customer for ${customer.firstName} ${customer.lastName}`);
            const squareCustomerId = await this.squareService.findOrCreateSquareCustomer({
                firstName: createBookingDto.customerFirstName || customer.firstName,
                lastName: createBookingDto.customerLastName || customer.lastName,
                phone: createBookingDto.customerPhone || customer.phone,
                email: createBookingDto.customerEmail || customer.email || undefined,
                existingSquareCustomerId: customer.squareCustomerId || undefined,
            });
            // Update local customer with Square customer ID if not already set
            if (!customer.squareCustomerId || customer.squareCustomerId !== squareCustomerId) {
                this.logger.log(`Updating customer ${customer.id} with Square customer ID: ${squareCustomerId}`);
                await this.prisma.customer.update({
                    where: { id: customer.id },
                    data: { squareCustomerId },
                });
            }
            // 3. Create Square booking
            this.logger.log(`Creating Square booking at ${createBookingDto.startAt}`);
            const { bookingId, booking } = await this.squareService.createSquareBooking({
                locationId: shop.squareLocationId,
                customerId: squareCustomerId,
                serviceVariationId: service.squareCatalogObjectId,
                teamMemberId: barber?.squareTeamMemberId || undefined,
                startAt: createBookingDto.startAt,
            });
            // Calculate end time
            const endAt = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000);
            // 4. Create local appointment with squareBookingId
            this.logger.log(`Creating local appointment with Square booking ID: ${bookingId}`);
            const appointment = await this.prisma.appointment.create({
                data: {
                    shopId: createBookingDto.shopId,
                    serviceId: createBookingDto.serviceId,
                    barberId: createBookingDto.barberId || barber?.id,
                    customerId: createBookingDto.customerId,
                    startAt,
                    endAt,
                    squareBookingId: bookingId,
                    status: 'SCHEDULED',
                },
                include: {
                    shop: {
                        select: {
                            id: true,
                            name: true,
                            squareLocationId: true,
                        },
                    },
                    barber: {
                        select: {
                            id: true,
                            displayName: true,
                            squareTeamMemberId: true,
                        },
                    },
                    service: {
                        select: {
                            id: true,
                            name: true,
                            durationMinutes: true,
                            priceCents: true,
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                            email: true,
                            squareCustomerId: true,
                        },
                    },
                },
            });
            this.logger.log(`Booking created successfully: appointment ${appointment.id}, Square booking ${bookingId}`);
            return appointment;
        }
        catch (error) {
            this.logger.error('Failed to create booking:', error);
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
};

    async chargeDeposit(appointmentId, cardId, depositCents) {
        const appointment = await this.findOne(appointmentId);
        if (!appointment.customer.squareCustomerId) {
            throw new common_1.BadRequestException('Customer has no Square customer ID');
        }
        // Charge the card
        const chargeResult = await this.paymentService.chargeCustomerCard({
            amountCents: depositCents,
            currency: 'USD',
            customerId: appointment.customerId,
            squareCustomerId: appointment.customer.squareCustomerId,
            cardId,
            appointmentId,
        });
        return chargeResult;
    }
    /**
     * Charge a no-show fee for an appointment
     * This can be called when a customer doesn't show up
     */
    async chargeNoShowFee(appointmentId, cardId) {
        const appointment = await this.findOne(appointmentId);
        // Get the no-show policy for the shop
        const noShowPolicy = await this.prisma.noShowPolicy.findFirst({
            where: {
                shopId: appointment.shopId,
                enabled: true,
            },
        });
        if (!noShowPolicy) {
            throw new common_1.NotFoundException('No active no-show policy found for this shop');
        }
        if (!appointment.customer.squareCustomerId) {
            throw new common_1.BadRequestException('Customer has no Square customer ID');
        }
        // Charge the no-show fee
        const chargeResult = await this.paymentService.chargeCustomerCard({
            amountCents: noShowPolicy.feeCents,
            currency: 'USD',
            customerId: appointment.customerId,
            squareCustomerId: appointment.customer.squareCustomerId,
            cardId,
            appointmentId,
        });
        // Update appointment status to NO_SHOW
        await this.update(appointmentId, { status: 'NO_SHOW' });
        return chargeResult;
    }
    /**
     * Charge the full service price for an appointment
     * This can be called when the service is completed
     */
    async chargeFullAmount(appointmentId, cardId) {
        const appointment = await this.findOne(appointmentId);
        if (!appointment.customer.squareCustomerId) {
            throw new common_1.BadRequestException('Customer has no Square customer ID');
        }
        // Charge the full service price
        const chargeResult = await this.paymentService.chargeCustomerCard({
            amountCents: appointment.service.priceCents,
            currency: 'USD',
            customerId: appointment.customerId,
            squareCustomerId: appointment.customer.squareCustomerId,
            cardId,
            appointmentId,
        });
        return chargeResult;
    }
    /**
     * Add a payment to an appointment
     * Helper method to link an existing payment record to an appointment
     */
    async addPaymentToAppointment(appointmentId, paymentRecordId) {
        return this.paymentService.addPaymentToAppointment(appointmentId, paymentRecordId);
    }
    /**
     * Get all payments for an appointment
     */
    async getAppointmentPayments(appointmentId) {
        const appointment = await this.findOne(appointmentId);
        return this.prisma.paymentRecord.findMany({
            where: { appointmentId },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.AppointmentService = AppointmentService;
exports.AppointmentService = AppointmentService = AppointmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        square_service_1.SquareService,
        payment_service_1.PaymentService,
        booking_validation_service_1.BookingValidationService])
], AppointmentService);
//# sourceMappingURL=appointment.service.js.map