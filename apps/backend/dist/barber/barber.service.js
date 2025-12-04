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
exports.BarberService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BarberService = class BarberService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.barber.findMany({
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        squareLocationId: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findOne(id) {
        const barber = await this.prisma.barber.findUnique({
            where: { id },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        squareLocationId: true,
                    },
                },
                appointments: {
                    select: {
                        id: true,
                        startAt: true,
                        endAt: true,
                        status: true,
                        service: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        customer: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: {
                        startAt: 'desc',
                    },
                    take: 10, // Limit to recent 10 appointments
                },
            },
        });
        if (!barber) {
            throw new common_1.NotFoundException(`Barber with ID ${id} not found`);
        }
        return barber;
    }
    async create(createBarberDto) {
        // Verify shop exists
        const shop = await this.prisma.shop.findUnique({
            where: { id: createBarberDto.shopId },
        });
        if (!shop) {
            throw new common_1.NotFoundException(`Shop with ID ${createBarberDto.shopId} not found`);
        }
        return this.prisma.barber.create({
            data: createBarberDto,
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
    }
    async update(id, updateBarberDto) {
        // Check if barber exists
        await this.findOne(id);
        // If shopId is being updated, verify the new shop exists
        if (updateBarberDto.shopId) {
            const shop = await this.prisma.shop.findUnique({
                where: { id: updateBarberDto.shopId },
            });
            if (!shop) {
                throw new common_1.NotFoundException(`Shop with ID ${updateBarberDto.shopId} not found`);
            }
        }
        return this.prisma.barber.update({
            where: { id },
            data: updateBarberDto,
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
    }
    async remove(id) {
        // Check if barber exists
        await this.findOne(id);
        return this.prisma.barber.delete({
            where: { id },
        });
    }
};
exports.BarberService = BarberService;
exports.BarberService = BarberService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BarberService);
//# sourceMappingURL=barber.service.js.map