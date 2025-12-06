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
exports.CustomerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CustomerService = class CustomerService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.customer.findMany({
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
        const customer = await this.prisma.customer.findUnique({
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
                                durationMinutes: true,
                                priceCents: true,
                            },
                        },
                        barber: {
                            select: {
                                id: true,
                                displayName: true,
                            },
                        },
                    },
                    orderBy: {
                        startAt: 'desc',
                    },
                    take: 20, // Recent 20 appointments
                },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        return customer;
    }
    async create(createCustomerDto) {
        // Verify shop exists
        const shop = await this.prisma.shop.findUnique({
            where: { id: createCustomerDto.shopId },
        });
        if (!shop) {
            throw new common_1.NotFoundException(`Shop with ID ${createCustomerDto.shopId} not found`);
        }
        return this.prisma.customer.create({
            data: createCustomerDto,
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
    async update(id, updateCustomerDto) {
        // Check if customer exists
        await this.findOne(id);
        // If shopId is being updated, verify the new shop exists
        if (updateCustomerDto.shopId) {
            const shop = await this.prisma.shop.findUnique({
                where: { id: updateCustomerDto.shopId },
            });
            if (!shop) {
                throw new common_1.NotFoundException(`Shop with ID ${updateCustomerDto.shopId} not found`);
            }
        }
        return this.prisma.customer.update({
            where: { id },
            data: updateCustomerDto,
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
        // Check if customer exists
        await this.findOne(id);
        return this.prisma.customer.delete({
            where: { id },
        });
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomerService);
//# sourceMappingURL=customer.service.js.map