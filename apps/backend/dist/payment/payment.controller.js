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
var PaymentController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const payment_service_1 = require("./payment.service");
const save_card_dto_1 = require("./dto/save-card.dto");
const charge_card_dto_1 = require("./dto/charge-card.dto");
const refund_payment_dto_1 = require("./dto/refund-payment.dto");
let PaymentController = PaymentController_1 = class PaymentController {
    constructor(paymentService) {
        this.paymentService = paymentService;
        this.logger = new common_1.Logger(PaymentController_1.name);
    }
    /**
     * POST /api/payments/vault-card
     * Save a payment card for a customer
     */
    async vaultCard(saveCardDto) {
        this.logger.log(`Vaulting card for customer ${saveCardDto.customerId}`);
        // Validate customer and get squareCustomerId through service
        const validation = await this.paymentService.validateCustomerForVault(saveCardDto);
        if (!validation.success) {
            return {
                success: false,
                message: validation.message,
            };
        }
        const result = await this.paymentService.saveCardForCustomer({
            customerId: saveCardDto.customerId,
            squareCustomerId: validation.squareCustomerId,
            paymentNonce: saveCardDto.paymentNonce,
        });
        return {
            success: true,
            message: 'Card saved successfully',
            data: result,
        };
    }
    /**
     * POST /api/payments/charge
     * Charge a customer's card
     */
    async chargeCard(chargeCardDto) {
        this.logger.log(`Charging ${chargeCardDto.amountCents} cents to card ${chargeCardDto.cardId}`);
        const customer = await this.paymentService['prismaService'].customer.findUnique({
            where: { id: chargeCardDto.customerId },
        });
        if (!customer || !customer.squareCustomerId) {
            throw new common_1.NotFoundException('Customer not found or has no Square customer ID');
        }
        const result = await this.paymentService.chargeCustomerCard({
            amountCents: chargeCardDto.amountCents,
            currency: chargeCardDto.currency,
            customerId: chargeCardDto.customerId,
            squareCustomerId: customer.squareCustomerId,
            cardId: chargeCardDto.cardId,
            appointmentId: chargeCardDto.appointmentId,
        });
        return {
            success: true,
            message: 'Card charged successfully',
            data: result,
        };
    }
    /**
     * POST /api/payments/refund
     * Refund a payment
     */
    async refundPayment(refundPaymentDto) {
        this.logger.log(`Refunding payment ${refundPaymentDto.paymentRecordId}`);
        const result = await this.paymentService.refundPayment({
            paymentRecordId: refundPaymentDto.paymentRecordId,
            amountCents: refundPaymentDto.amountCents,
        });
        return {
            success: true,
            message: 'Payment refunded successfully',
            data: result,
        };
    }
    /**
     * GET /api/payments/customer/:id/cards
     * Get all cards for a customer
     */
    async getCustomerCards(customerId) {
        this.logger.log(`Fetching cards for customer ${customerId}`);
        const cards = await this.paymentService.getCustomerCards(customerId);
        return {
            success: true,
            message: 'Cards retrieved successfully',
            data: cards,
        };
    }
    /**
     * GET /api/payments/customer/:id/payments
     * Get all payment records for a customer
     */
    async getCustomerPayments(customerId) {
        this.logger.log(`Fetching payments for customer ${customerId}`);
        const payments = await this.paymentService.getCustomerPayments(customerId);
        return {
            success: true,
            message: 'Payments retrieved successfully',
            data: payments,
        };
    }
    /**
     * GET /api/payments/:id
     * Get a payment record by ID
     */
    async getPaymentRecord(paymentRecordId) {
        this.logger.log(`Fetching payment record ${paymentRecordId}`);
        const payment = await this.paymentService.getPaymentRecord(paymentRecordId);
        return {
            success: true,
            message: 'Payment record retrieved successfully',
            data: payment,
        };
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('vault-card'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [save_card_dto_1.SaveCardDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "vaultCard", null);
__decorate([
    (0, common_1.Post)('charge'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [charge_card_dto_1.ChargeCardDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "chargeCard", null);
__decorate([
    (0, common_1.Post)('refund'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refund_payment_dto_1.RefundPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "refundPayment", null);
__decorate([
    (0, common_1.Get)('customer/:id/cards'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getCustomerCards", null);
__decorate([
    (0, common_1.Get)('customer/:id/payments'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getCustomerPayments", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPaymentRecord", null);
exports.PaymentController = PaymentController = PaymentController_1 = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map