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
var SquareController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SquareController = void 0;
const common_1 = require("@nestjs/common");
const square_service_1 = require("./square.service");
let SquareController = SquareController_1 = class SquareController {
    constructor(squareService) {
        this.squareService = squareService;
        this.logger = new common_1.Logger(SquareController_1.name);
    }
    async syncServices() {
        this.logger.log('Starting Square services sync...');
        try {
            const result = await this.squareService.syncServicesToDb();
            const message = `Sync completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`;
            this.logger.log(message);
            return {
                success: true,
                message,
                data: result,
            };
        }
        catch (error) {
            this.logger.error('Square services sync failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                message: `Sync failed: ${errorMessage}`,
                data: {
                    created: 0,
                    updated: 0,
                    skipped: 0,
                    total: 0,
                    errors: [errorMessage],
                },
            };
        }
    }
    async syncBarbers() {
        this.logger.log('Starting Square barbers sync...');
        try {
            const result = await this.squareService.syncBarbersToDb();
            const message = `Barber sync completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`;
            this.logger.log(message);
            return {
                success: true,
                message,
                data: result,
            };
        }
        catch (error) {
            this.logger.error('Square barbers sync failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                message: `Barber sync failed: ${errorMessage}`,
                data: {
                    created: 0,
                    updated: 0,
                    skipped: 0,
                    total: 0,
                    errors: [errorMessage],
                },
            };
        }
    }
};
exports.SquareController = SquareController;
__decorate([
    (0, common_1.Post)('sync-services'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SquareController.prototype, "syncServices", null);
__decorate([
    (0, common_1.Post)('sync-barbers'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SquareController.prototype, "syncBarbers", null);
exports.SquareController = SquareController = SquareController_1 = __decorate([
    (0, common_1.Controller)('integrations/square'),
    __metadata("design:paramtypes", [square_service_1.SquareService])
], SquareController);
//# sourceMappingURL=square.controller.js.map