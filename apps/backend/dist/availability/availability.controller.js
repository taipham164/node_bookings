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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AvailabilityController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityController = void 0;
const common_1 = require("@nestjs/common");
const availability_service_1 = require("./availability.service");
const get_availability_dto_1 = require("./dto/get-availability.dto");
let AvailabilityController = AvailabilityController_1 = class AvailabilityController {
    constructor(availabilityService) {
        this.availabilityService = availabilityService;
        this.logger = new common_1.Logger(AvailabilityController_1.name);
    }
    async getAvailability(query) {
        this.logger.log(`Getting availability for shop ${query.shopId}, service ${query.serviceId}, date ${query.date}`);
        try {
            const slots = await this.availabilityService.getAvailability({
                shopId: query.shopId,
                serviceId: query.serviceId,
                barberId: query.barberId,
                date: query.date,
            });
            return {
                success: true,
                data: {
                    shopId: query.shopId,
                    serviceId: query.serviceId,
                    barberId: query.barberId,
                    date: query.date,
                    slots,
                },
            };
        }
        catch (error) {
            this.logger.error('Availability request failed:', error);
            throw error; // Let NestJS handle the HTTP status based on the exception type
        }
    }
};
exports.AvailabilityController = AvailabilityController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_availability_dto_1.GetAvailabilityDto]),
    __metadata("design:returntype", Promise)
], AvailabilityController.prototype, "getAvailability", null);
exports.AvailabilityController = AvailabilityController = AvailabilityController_1 = __decorate([
    (0, common_1.Controller)('availability'),
    __metadata("design:paramtypes", [availability_service_1.AvailabilityService])
], AvailabilityController);
//# sourceMappingURL=availability.controller.js.map