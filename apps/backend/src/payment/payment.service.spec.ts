import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { SquareService } from '../square/square.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let prismaService: PrismaService;
  let squareService: SquareService;

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
    },
    customerCard: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
    },
    paymentRecord: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockSquareService = {
    getSquareClient: jest.fn(),
  };

  const mockSquareClient = {
    cardsApi: {
      createCard: jest.fn(),
    },
    paymentsApi: {
      createPayment: jest.fn(),
    },
    refundsApi: {
      refundPayment: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SquareService,
          useValue: mockSquareService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
    squareService = module.get<SquareService>(SquareService);

    // Reset all mocks
    jest.clearAllMocks();
    mockSquareService.getSquareClient.mockReturnValue(mockSquareClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveCardForCustomer', () => {
    it('should save a card successfully', async () => {
      const customerId = 'customer-1';
      const squareCustomerId = 'square-customer-1';
      const paymentNonce = 'cnon:test-nonce';

      const mockCustomer = {
        id: customerId,
        squareCustomerId,
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockSquareCard = {
        id: 'square-card-1',
        cardBrand: 'VISA',
        last4: '1234',
        expMonth: 12n,
        expYear: 2025n,
      };

      const mockCustomerCard = {
        id: 'card-1',
        squareCardId: 'square-card-1',
        customerId,
        brand: 'VISA',
        last4: '1234',
        expMonth: 12,
        expYear: 2025,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockSquareClient.cardsApi.createCard.mockResolvedValue({
        result: { card: mockSquareCard },
      });
      mockPrismaService.customerCard.create.mockResolvedValue(mockCustomerCard);

      const result = await service.saveCardForCustomer({
        customerId,
        squareCustomerId,
        paymentNonce,
      });

      expect(result.cardId).toBe('card-1');
      expect(result.brand).toBe('VISA');
      expect(result.last4).toBe('1234');
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: customerId },
      });
      expect(mockSquareClient.cardsApi.createCard).toHaveBeenCalled();
      expect(mockPrismaService.customerCard.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.saveCardForCustomer({
          customerId: 'invalid-id',
          squareCustomerId: 'square-1',
          paymentNonce: 'nonce',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if Square customer ID mismatch', async () => {
      const mockCustomer = {
        id: 'customer-1',
        squareCustomerId: 'different-square-id',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(
        service.saveCardForCustomer({
          customerId: 'customer-1',
          squareCustomerId: 'square-1',
          paymentNonce: 'nonce',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('chargeCustomerCard', () => {
    it('should charge a card successfully', async () => {
      const mockCustomer = {
        id: 'customer-1',
        squareCustomerId: 'square-customer-1',
      };

      const mockCard = {
        id: 'card-1',
        squareCardId: 'square-card-1',
        customerId: 'customer-1',
      };

      const mockPaymentRecord = {
        id: 'payment-1',
        amountCents: 1000,
        customerId: 'customer-1',
        status: 'PENDING',
      };

      const mockSquarePayment = {
        id: 'square-payment-1',
        status: 'COMPLETED',
      };

      const mockUpdatedPayment = {
        ...mockPaymentRecord,
        squarePaymentId: 'square-payment-1',
        status: 'COMPLETED',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customerCard.findUnique.mockResolvedValue(mockCard);
      mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
      mockSquareClient.paymentsApi.createPayment.mockResolvedValue({
        result: { payment: mockSquarePayment },
      });
      mockPrismaService.paymentRecord.update.mockResolvedValue(mockUpdatedPayment);

      const result = await service.chargeCustomerCard({
        amountCents: 1000,
        currency: 'USD',
        customerId: 'customer-1',
        squareCustomerId: 'square-customer-1',
        cardId: 'card-1',
      });

      expect(result.paymentId).toBe('square-payment-1');
      expect(result.status).toBe('COMPLETED');
      expect(mockSquareClient.paymentsApi.createPayment).toHaveBeenCalled();
      expect(mockPrismaService.paymentRecord.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          squarePaymentId: 'square-payment-1',
          status: 'COMPLETED',
        },
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.chargeCustomerCard({
          amountCents: 1000,
          currency: 'USD',
          customerId: 'invalid-id',
          squareCustomerId: 'square-1',
          cardId: 'card-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if card does not exist', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
      mockPrismaService.customerCard.findUnique.mockResolvedValue(null);

      await expect(
        service.chargeCustomerCard({
          amountCents: 1000,
          currency: 'USD',
          customerId: 'customer-1',
          squareCustomerId: 'square-1',
          cardId: 'invalid-card',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if card does not belong to customer', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
      mockPrismaService.customerCard.findUnique.mockResolvedValue({
        id: 'card-1',
        customerId: 'different-customer',
      });

      await expect(
        service.chargeCustomerCard({
          amountCents: 1000,
          currency: 'USD',
          customerId: 'customer-1',
          squareCustomerId: 'square-1',
          cardId: 'card-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment successfully', async () => {
      const mockPayment = {
        id: 'payment-1',
        squarePaymentId: 'square-payment-1',
        amountCents: 1000,
        refundedCents: 0,
        status: 'COMPLETED',
        currency: 'USD',
      };

      const mockRefund = {
        id: 'square-refund-1',
        status: 'COMPLETED',
      };

      mockPrismaService.paymentRecord.findUnique.mockResolvedValue(mockPayment);
      mockSquareClient.refundsApi.refundPayment.mockResolvedValue({
        result: { refund: mockRefund },
      });
      mockPrismaService.paymentRecord.update.mockResolvedValue({
        ...mockPayment,
        refundedCents: 1000,
        status: 'REFUNDED',
      });

      const result = await service.refundPayment({
        paymentRecordId: 'payment-1',
        amountCents: 1000,
      });

      expect(result.refundId).toBe('square-refund-1');
      expect(result.refundedCents).toBe(1000);
      expect(result.status).toBe('REFUNDED');
      expect(mockSquareClient.refundsApi.refundPayment).toHaveBeenCalled();
    });

    it('should throw NotFoundException if payment does not exist', async () => {
      mockPrismaService.paymentRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.refundPayment({
          paymentRecordId: 'invalid-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment has no Square payment ID', async () => {
      mockPrismaService.paymentRecord.findUnique.mockResolvedValue({
        id: 'payment-1',
        squarePaymentId: null,
        status: 'COMPLETED',
      });

      await expect(
        service.refundPayment({
          paymentRecordId: 'payment-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment status is not COMPLETED', async () => {
      mockPrismaService.paymentRecord.findUnique.mockResolvedValue({
        id: 'payment-1',
        squarePaymentId: 'square-payment-1',
        status: 'FAILED',
      });

      await expect(
        service.refundPayment({
          paymentRecordId: 'payment-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCustomerCards', () => {
    it('should return customer cards', async () => {
      const mockCustomer = { id: 'customer-1' };
      const mockCards = [
        { id: 'card-1', brand: 'VISA', last4: '1234' },
        { id: 'card-2', brand: 'MASTERCARD', last4: '5678' },
      ];

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customerCard.findMany.mockResolvedValue(mockCards);

      const result = await service.getCustomerCards('customer-1');

      expect(result).toEqual(mockCards);
      expect(mockPrismaService.customerCard.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.getCustomerCards('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPaymentRecord', () => {
    it('should return a payment record', async () => {
      const mockPayment = {
        id: 'payment-1',
        amountCents: 1000,
        customer: { id: 'customer-1' },
        appointment: { id: 'appointment-1' },
      };

      mockPrismaService.paymentRecord.findUnique.mockResolvedValue(mockPayment);

      const result = await service.getPaymentRecord('payment-1');

      expect(result).toEqual(mockPayment);
      expect(mockPrismaService.paymentRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        include: {
          customer: true,
          appointment: true,
        },
      });
    });

    it('should throw NotFoundException if payment does not exist', async () => {
      mockPrismaService.paymentRecord.findUnique.mockResolvedValue(null);

      await expect(service.getPaymentRecord('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
