"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const payment_service_1 = require("./payment.service");
const crypto = __importStar(require("crypto"));
let WebhookController = WebhookController_1 = class WebhookController {
    constructor(paymentService, configService) {
        this.paymentService = paymentService;
        this.configService = configService;
        this.logger = new common_1.Logger(WebhookController_1.name);
    }
    /**
     * POST /api/webhooks/square
     * Handle Square webhook events
     */
    async handleSquareWebhook(signature, payload, req) {
        this.logger.log(`Received Square webhook: ${payload?.type}`);
        // Ensure raw body is available for signature verification
        if (!req.rawBody) {
            this.logger.error('Raw request body is missing - signature verification will fail');
            throw new common_1.BadRequestException('Raw request body is missing');
        }
        // Verify webhook signature using raw body
        if (!this.verifyWebhookSignature(signature, req.rawBody)) {
            this.logger.warn('Invalid webhook signature');
            throw new common_1.BadRequestException('Invalid signature');
        }
        const eventType = payload?.type;
        const eventData = payload?.data;
        if (!eventType || !eventData) {
            this.logger.warn('Invalid webhook payload');
            throw new common_1.BadRequestException('Invalid payload');
        }
        try {
            // Handle different event types
            switch (eventType) {
                case 'payment.created':
                    await this.handlePaymentCreated(eventData);
                    break;
                case 'payment.updated':
                    await this.handlePaymentUpdated(eventData);
                    break;
                case 'refund.created':
                    await this.handleRefundCreated(eventData);
                    break;
                case 'refund.updated':
                    await this.handleRefundUpdated(eventData);
                    break;
                default:
                    this.logger.log(`Unhandled event type: ${eventType}`);
            }
            return {
                success: true,
                message: 'Webhook processed',
            };
        }
        catch (error) {
            this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Error processing webhook: ${error.message}`);
        }
    }
    /**
     * Verify Square webhook signature
     */
    verifyWebhookSignature(signature, body) {
        // Get webhook signature key from environment
        const webhookSignatureKey = this.configService.get('SQUARE_WEBHOOK_SIGNATURE_KEY');
        // If no signature key is configured, skip verification (for development)
        if (!webhookSignatureKey) {
            const nodeEnv = this.configService.get('NODE_ENV');
            if (nodeEnv === 'production') {
                this.logger.error('SQUARE_WEBHOOK_SIGNATURE_KEY required in production');
                return false;
            }
            this.logger.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not configured - skipping verification (dev only)');
            return true;
        }
        if (!signature) {
            return false;
        }
        try {
            // Square uses HMAC-SHA256 with the raw request body bytes
            const hmac = crypto.createHmac('sha256', webhookSignatureKey);
            hmac.update(body);
            const expectedSignature = hmac.digest('base64');
            return signature === expectedSignature;
        }
        catch (error) {
            this.logger.error(`Error verifying signature: ${error.message}`);
            return false;
        }
    }
    /**
     * Handle payment.created event
     */
    async handlePaymentCreated(data) {
        this.logger.log(`Payment created: ${data?.object?.payment?.id}`);
        const payment = data?.object?.payment;
        if (!payment?.id) {
            return;
        }
        // Update payment status if it exists in our system
        await this.paymentService.updatePaymentFromWebhook(payment.id, payment.status, payment);
    }
    /**
     * Handle payment.updated event
     */
    async handlePaymentUpdated(data) {
        this.logger.log(`Payment updated: ${data?.object?.payment?.id}`);
        const payment = data?.object?.payment;
        if (!payment?.id) {
            return;
        }
        // Update payment status
        await this.paymentService.updatePaymentFromWebhook(payment.id, payment.status, payment);
    }
    /**
     * Handle refund.created event
     */
    async handleRefundCreated(data) {
        this.logger.log(`Refund created: ${data?.object?.refund?.id}`);
        const refund = data?.object?.refund;
        if (!refund?.payment_id) {
            return;
        }
        // Update refund information
        await this.paymentService.updateRefundFromWebhook(refund.payment_id, refund);
    }
    /**
     * Handle refund.updated event
     */
    async handleRefundUpdated(data) {
        this.logger.log(`Refund updated: ${data?.object?.refund?.id}`);
        const refund = data?.object?.refund;
        if (!refund?.payment_id) {
            return;
        }
        // Update refund information
        await this.paymentService.updateRefundFromWebhook(refund.payment_id, refund);
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)('x-square-signature')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleSquareWebhook", null);
exports.WebhookController = WebhookController = WebhookController_1 = __decorate([
    (0, common_1.Controller)('webhooks/square'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService,
        config_1.ConfigService])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map