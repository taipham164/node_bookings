import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import * as crypto from 'crypto';

@Controller('webhooks/square')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /api/webhooks/square
   * Handle Square webhook events
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleSquareWebhook(
    @Headers('x-square-signature') signature: string,
    @Body() payload: any,
  ) {
    this.logger.log(`Received Square webhook: ${payload?.type}`);

    // Verify webhook signature
    if (!this.verifyWebhookSignature(signature, JSON.stringify(payload))) {
      this.logger.warn('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const eventType = payload?.type;
    const eventData = payload?.data;

    if (!eventType || !eventData) {
      this.logger.warn('Invalid webhook payload');
      throw new BadRequestException('Invalid payload');
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
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      throw new BadRequestException(`Error processing webhook: ${error.message}`);
    }
  }

  /**
   * Verify Square webhook signature
   */
  private verifyWebhookSignature(signature: string, body: string): boolean {
    // Get webhook signature key from environment
    const webhookSignatureKey = this.configService.get<string>('SQUARE_WEBHOOK_SIGNATURE_KEY');

    // If no signature key is configured, skip verification (for development)
    if (!webhookSignatureKey) {
      this.logger.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not configured - skipping signature verification');
      return true;
    }

    if (!signature) {
      return false;
    }

    try {
      // Square uses HMAC-SHA256
      const hmac = crypto.createHmac('sha256', webhookSignatureKey);
      hmac.update(body);
      const expectedSignature = hmac.digest('base64');

      return signature === expectedSignature;
    } catch (error: any) {
      this.logger.error(`Error verifying signature: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle payment.created event
   */
  private async handlePaymentCreated(data: any) {
    this.logger.log(`Payment created: ${data?.object?.payment?.id}`);

    const payment = data?.object?.payment;
    if (!payment?.id) {
      return;
    }

    // Update payment status if it exists in our system
    await this.paymentService.updatePaymentFromWebhook(
      payment.id,
      payment.status,
      payment,
    );
  }

  /**
   * Handle payment.updated event
   */
  private async handlePaymentUpdated(data: any) {
    this.logger.log(`Payment updated: ${data?.object?.payment?.id}`);

    const payment = data?.object?.payment;
    if (!payment?.id) {
      return;
    }

    // Update payment status
    await this.paymentService.updatePaymentFromWebhook(
      payment.id,
      payment.status,
      payment,
    );
  }

  /**
   * Handle refund.created event
   */
  private async handleRefundCreated(data: any) {
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
  private async handleRefundUpdated(data: any) {
    this.logger.log(`Refund updated: ${data?.object?.refund?.id}`);

    const refund = data?.object?.refund;
    if (!refund?.payment_id) {
      return;
    }

    // Update refund information
    await this.paymentService.updateRefundFromWebhook(refund.payment_id, refund);
  }
}
