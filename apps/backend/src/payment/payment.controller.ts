import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { SaveCardDto } from './dto/save-card.dto';
import { ChargeCardDto } from './dto/charge-card.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /api/payments/vault-card
   * Save a payment card for a customer
   */
  @Post('vault-card')
  @HttpCode(HttpStatus.CREATED)
  async vaultCard(@Body() saveCardDto: SaveCardDto) {
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
  @Post('charge')
  @HttpCode(HttpStatus.CREATED)
  async chargeCard(@Body() chargeCardDto: ChargeCardDto) {
    this.logger.log(
      `Charging ${chargeCardDto.amountCents} cents to card ${chargeCardDto.cardId}`,
    );

    const customer = await this.paymentService['prismaService'].customer.findUnique({
      where: { id: chargeCardDto.customerId },
    });

    if (!customer || !customer.squareCustomerId) {
      throw new NotFoundException('Customer not found or has no Square customer ID');
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
  @Post('refund')
  @HttpCode(HttpStatus.OK)
  async refundPayment(@Body() refundPaymentDto: RefundPaymentDto) {
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
  @Get('customer/:id/cards')
  async getCustomerCards(@Param('id') customerId: string) {
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
  @Get('customer/:id/payments')
  async getCustomerPayments(@Param('id') customerId: string) {
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
  @Get(':id')
  async getPaymentRecord(@Param('id') paymentRecordId: string) {
    this.logger.log(`Fetching payment record ${paymentRecordId}`);

    const payment = await this.paymentService.getPaymentRecord(paymentRecordId);

    return {
      success: true,
      message: 'Payment record retrieved successfully',
      data: payment,
    };
  }
}
