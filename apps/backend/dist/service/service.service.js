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
exports.ServiceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ServiceService = class ServiceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.service.findMany({
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findOne(id) {
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
                appointments: {
                    select: {
                        id: true,
                        startAt: true,
                        endAt: true,
                        status: true,
                    },
                    orderBy: {
                        startAt: 'desc',
                    },
                },
            },
        });
        if (!service) {
            throw new common_1.NotFoundException(`Service with ID ${id} not found`);
        }
        return service;
    }
    async create(createServiceDto) {
        // Verify shop exists
        const shop = await this.prisma.shop.findUnique({
            where: { id: createServiceDto.shopId },
        });
        if (!shop) {
            throw new common_1.NotFoundException(`Shop with ID ${createServiceDto.shopId} not found`);
        }
        return this.prisma.service.create({
            data: createServiceDto,
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    async update(id, updateServiceDto) {
        // Check if service exists
        await this.findOne(id);
        // If shopId is being updated, verify the new shop exists
        if (updateServiceDto.shopId) {
            const shop = await this.prisma.shop.findUnique({
                where: { id: updateServiceDto.shopId },
            });
            if (!shop) {
                throw new common_1.NotFoundException(`Shop with ID ${updateServiceDto.shopId} not found`);
            }
        }
        return this.prisma.service.update({
            where: { id },
            data: updateServiceDto,
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    async remove(id) {
        // Check if service exists
        await this.findOne(id);
        return this.prisma.service.delete({
            where: { id },
        });
    }
};
exports.ServiceService = ServiceService;
exports.ServiceService = ServiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServiceService);
//# sourceMappingURL=service.service.js.map