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
exports.AppointmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const booking_validation_service_1 = require("./booking-validation.service");
let AppointmentService = class AppointmentService {
    constructor(prisma, bookingValidationService) {
        this.prisma = prisma;
        this.bookingValidationService = bookingValidationService;
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
};
exports.AppointmentService = AppointmentService;
exports.AppointmentService = AppointmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        booking_validation_service_1.BookingValidationService])
], AppointmentService);
//# sourceMappingURL=appointment.service.js.map