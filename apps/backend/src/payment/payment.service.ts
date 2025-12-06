import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SquareService } from '../square/square.service';

interface SaveCardParams {
  customerId: string;
  squareCustomerId: string;
  paymentNonce: string;
}

interface SaveCardResult {
  cardId: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
}

interface ChargeCardParams {
  amountCents: number;
  currency: string;
  customerId: string;
  squareCustomerId: string;
  cardId: string;
  appointmentId?: string;
}

interface ChargeCardResult {
  paymentId: string;
  paymentRecordId: string;
  status: string;
}

interface RefundPaymentParams {
  paymentRecordId: string;
  amountCents?: number; // Optional: if not provided, full refund
}

interface RefundPaymentResult {
  refundId: string;
  refundedCents: number;
  status: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly squareService: SquareService,
  ) {}

  /**
   * Save a card for a customer using Square Cards API
   */
  async saveCardForCustomer(params: SaveCardParams): Promise<SaveCardResult> {
    const { customerId, squareCustomerId, paymentNonce } = params;

    this.logger.log(`Saving card for customer ${customerId}`);

    // 1. Validate local customer exists
    const customer = await this.prismaService.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // 2. Verify Square customer ID matches
    if (customer.squareCustomerId !== squareCustomerId) {
      throw new BadRequestException(
        `Square customer ID mismatch for customer ${customerId}`,
      );
    }

    try {
      // 3. Call Square Cards API to create card
      const squareClient = this.squareService.getSquareClient();
      const { result } = await squareClient.cardsApi.createCard({
        idempotencyKey: `${customerId}-${Date.now()}`,
        sourceId: paymentNonce,
        card: {
          customerId: squareCustomerId,
        },
      });

      const squareCard = result.card;
      if (!squareCard) {
        throw new BadRequestException('Failed to create card with Square');
      }

      // 4. Store card in database
      const customerCard = await this.prismaService.customerCard.create({
        data: {
          squareCardId: squareCard.id!,
          customerId: customerId,
          brand: squareCard.cardBrand,
          last4: squareCard.last4,
          expMonth: squareCard.expMonth ? Number(squareCard.expMonth) : undefined,
          expYear: squareCard.expYear ? Number(squareCard.expYear) : undefined,
        },
      });

      this.logger.log(`Card ${customerCard.id} saved for customer ${customerId}`);

      return {
        cardId: customerCard.id,
        brand: customerCard.brand ?? undefined,
        last4: customerCard.last4 ?? undefined,
        expMonth: customerCard.expMonth ?? undefined,
        expYear: customerCard.expYear ?? undefined,
      };
    } catch (error: any) {
      this.logger.error(`Failed to save card: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to save card: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Charge a customer's card using Square Payments API
   */
  async chargeCustomerCard(params: ChargeCardParams): Promise<ChargeCardResult> {
    const { amountCents, currency, customerId, squareCustomerId, cardId, appointmentId } = params;

    this.logger.log(
      `Charging ${amountCents} cents to card ${cardId} for customer ${customerId}`,
    );

    // 1. Validate customer exists
    const customer = await this.prismaService.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // 2. Validate customer card exists and belongs to customer
    const customerCard = await this.prismaService.customerCard.findUnique({
      where: { id: cardId },
    });

    if (!customerCard) {
      throw new NotFoundException(`Card with ID ${cardId} not found`);
    }

    if (customerCard.customerId !== customerId) {
      throw new BadRequestException(`Card ${cardId} does not belong to customer ${customerId}`);
    }

    // 3. Validate appointment if provided
    if (appointmentId) {
      const appointment = await this.prismaService.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
      }

      if (appointment.customerId !== customerId) {
        throw new BadRequestException(
          `Appointment ${appointmentId} does not belong to customer ${customerId}`,
        );
      }
    }

    try {
      // 4. Create payment record in pending state
      const paymentRecord = await this.prismaService.paymentRecord.create({
        data: {
          amountCents,
          currency,
          customerId,
          appointmentId,
          status: 'PENDING',
        },
      });

      try {
        // 5. Charge the card via Square
        const squareClient = this.squareService.getSquareClient();
        const { result } = await squareClient.paymentsApi.createPayment({
          idempotencyKey: `${paymentRecord.id}-${Date.now()}`,
          sourceId: customerCard.squareCardId,
          amountMoney: {
            amount: BigInt(amountCents),
            currency,
          },
          customerId: squareCustomerId,
        });

        const squarePayment = result.payment;
        if (!squarePayment) {
          throw new BadRequestException('Payment failed - no payment object returned');
        }

        // 6. Update payment record with Square payment ID and success status
        const updatedPayment = await this.prismaService.paymentRecord.update({
          where: { id: paymentRecord.id },
          data: {
            squarePaymentId: squarePayment.id,
            status: 'COMPLETED',
          },
        });

        this.logger.log(
          `Payment ${updatedPayment.id} completed with Square payment ${squarePayment.id}`,
        );

        return {
          paymentId: squarePayment.id!,
          paymentRecordId: updatedPayment.id,
          status: 'COMPLETED',
        };
      } catch (error: any) {
        // Update payment record as failed
        await this.prismaService.paymentRecord.update({
          where: { id: paymentRecord.id },
          data: {
            status: 'FAILED',
            failureReason: error.message || 'Unknown error',
          },
        });

        throw error;
      }
    } catch (error: any) {
      this.logger.error(`Failed to charge card: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to charge card: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Refund a payment using Square Refunds API
   */
  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    const { paymentRecordId, amountCents } = params;

    this.logger.log(`Refunding payment ${paymentRecordId}`);

    // 1. Get payment record
    const paymentRecord = await this.prismaService.paymentRecord.findUnique({
      where: { id: paymentRecordId },
    });

    if (!paymentRecord) {
      throw new NotFoundException(`Payment record with ID ${paymentRecordId} not found`);
    }

    if (!paymentRecord.squarePaymentId) {
      throw new BadRequestException(
        `Payment record ${paymentRecordId} has no associated Square payment`,
      );
    }

    if (paymentRecord.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot refund payment with status ${paymentRecord.status}`,
      );
    }

    // 2. Calculate refund amount
    const alreadyRefunded = paymentRecord.refundedCents;
    const remainingAmount = paymentRecord.amountCents - alreadyRefunded;
    const refundAmount = amountCents ?? remainingAmount;

    if (refundAmount > remainingAmount) {
      throw new BadRequestException(
        `Refund amount (${refundAmount}) exceeds remaining amount (${remainingAmount})`,
      );
    }

    if (refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than 0');
    }

    try {
      // 3. Process refund with Square
      const squareClient = this.squareService.getSquareClient();
      const { result } = await squareClient.refundsApi.refundPayment({
        idempotencyKey: `refund-${paymentRecordId}-${Date.now()}`,
        paymentId: paymentRecord.squarePaymentId,
        amountMoney: {
          amount: BigInt(refundAmount),
          currency: paymentRecord.currency,
        },
      });

      const refund = result.refund;
      if (!refund) {
        throw new BadRequestException('Refund failed - no refund object returned');
      }

      // 4. Update payment record
      const newRefundedTotal = alreadyRefunded + refundAmount;
      const newStatus =
        newRefundedTotal >= paymentRecord.amountCents
          ? 'REFUNDED'
          : 'PARTIALLY_REFUNDED';

      await this.prismaService.paymentRecord.update({
        where: { id: paymentRecordId },
        data: {
          refundedCents: newRefundedTotal,
          status: newStatus,
        },
      });

      this.logger.log(
        `Refund processed: ${refundAmount} cents for payment ${paymentRecordId}`,
      );

      return {
        refundId: refund.id!,
        refundedCents: refundAmount,
        status: newStatus,
      };
    } catch (error: any) {
      this.logger.error(`Failed to refund payment: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to refund payment: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all cards for a customer
   */
  async getCustomerCards(customerId: string) {
    this.logger.log(`Fetching cards for customer ${customerId}`);

    const customer = await this.prismaService.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const cards = await this.prismaService.customerCard.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    return cards;
  }

  /**
   * Get payment record by ID
   */
  async getPaymentRecord(paymentRecordId: string) {
    const payment = await this.prismaService.paymentRecord.findUnique({
      where: { id: paymentRecordId },
      include: {
        customer: true,
        appointment: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${paymentRecordId} not found`);
    }

    return payment;
  }

  /**
   * Get payment records for a customer
   */
  async getCustomerPayments(customerId: string) {
    const customer = await this.prismaService.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const payments = await this.prismaService.paymentRecord.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: true,
      },
    });

    return payments;
  }

  /**
   * Add a payment to an appointment
   */
  async addPaymentToAppointment(appointmentId: string, paymentRecordId: string) {
    const appointment = await this.prismaService.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    const payment = await this.prismaService.paymentRecord.findUnique({
      where: { id: paymentRecordId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${paymentRecordId} not found`);
    }

    // Link payment to appointment
    const updatedPayment = await this.prismaService.paymentRecord.update({
      where: { id: paymentRecordId },
      data: { appointmentId },
    });

    this.logger.log(`Payment ${paymentRecordId} linked to appointment ${appointmentId}`);

    return updatedPayment;
  }

  /**
   * Update payment status based on webhook event
   */
  async updatePaymentFromWebhook(squarePaymentId: string, status: string, data: any) {
    this.logger.log(`Updating payment ${squarePaymentId} from webhook with status ${status}`);

    const payment = await this.prismaService.paymentRecord.findUnique({
      where: { squarePaymentId },
    });

    if (!payment) {
      this.logger.warn(`Payment with Square ID ${squarePaymentId} not found`);
      return null;
    }

    // Map Square payment status to our status
    let newStatus = payment.status;
    if (status === 'COMPLETED') {
      newStatus = 'COMPLETED';
    } else if (status === 'FAILED' || status === 'CANCELED') {
      newStatus = 'FAILED';
    }

    const updatedPayment = await this.prismaService.paymentRecord.update({
      where: { squarePaymentId },
      data: { status: newStatus },
    });

    this.logger.log(`Payment ${payment.id} updated to status ${newStatus}`);

    return updatedPayment;
  }

  /**
   * Update refund status based on webhook event
   */
  async updateRefundFromWebhook(squarePaymentId: string, refundData: any) {
    this.logger.log(`Updating refund for payment ${squarePaymentId} from webhook`);

    const payment = await this.prismaService.paymentRecord.findUnique({
      where: { squarePaymentId },
    });

    if (!payment) {
      this.logger.warn(`Payment with Square ID ${squarePaymentId} not found`);
      return null;
    }

    // Update refund information if needed based on webhook data
    // This is a placeholder - actual implementation depends on Square webhook payload structure

    this.logger.log(`Refund webhook processed for payment ${payment.id}`);

    return payment;
  }
}
