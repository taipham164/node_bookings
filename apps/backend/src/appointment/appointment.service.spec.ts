import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { PrismaService } from '../prisma/prisma.service';
import { SquareService } from '../square/square.service';
import { AppointmentStatus } from '@prisma/client';

describe('AppointmentService - markNoShow', () => {
  let service: AppointmentService;
  let prismaService: PrismaService;
  let squareService: SquareService;

  const mockPrismaService = {
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    noShowCharge: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSquareService = {
    chargeNoShowFee: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
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

    service = module.get<AppointmentService>(AppointmentService);
    prismaService = module.get<PrismaService>(PrismaService);
    squareService = module.get<SquareService>(SquareService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markNoShow', () => {
    const appointmentId = 'appointment-123';
    const baseAppointment = {
      id: appointmentId,
      shopId: 'shop-123',
      barberId: 'barber-123',
      serviceId: 'service-123',
      customerId: 'customer-123',
      squareBookingId: 'booking-123',
      startAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      endAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      status: AppointmentStatus.SCHEDULED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should mark an appointment as no-show without charging when no policy exists', async () => {
      const mockAppointment = {
        ...baseAppointment,
        shop: {
          id: 'shop-123',
          name: 'Test Shop',
          squareLocationId: 'loc-123',
          noShowPolicy: null, // No policy
        },
        customer: {
          id: 'customer-123',
          firstName: 'John',
          lastName: 'Doe',
          phone: '1234567890',
          email: 'john@example.com',
          squareCustomerId: 'sq-customer-123',
        },
        service: {
          id: 'service-123',
          name: 'Haircut',
          durationMinutes: 30,
          priceCents: 3000,
        },
        barber: {
          id: 'barber-123',
          displayName: 'Jane Smith',
        },
        noShowCharges: [],
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.NO_SHOW,
      };

      const mockNoShowCharge = {
        id: 'charge-123',
        appointmentId,
        amountCents: 0,
        squarePaymentId: null,
        chargedAt: new Date(),
        createdAt: new Date(),
      };

      // First call returns the appointment for markNoShow
      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce(mockAppointment)
        // Second call returns updated appointment for findOne at the end
        .mockResolvedValueOnce({
          ...mockUpdatedAppointment,
          noShowCharges: [mockNoShowCharge],
        });

      mockPrismaService.appointment.update.mockResolvedValue(mockUpdatedAppointment);
      mockPrismaService.noShowCharge.create.mockResolvedValue(mockNoShowCharge);

      const result = await service.markNoShow(appointmentId);

      expect(mockPrismaService.appointment.update).toHaveBeenCalledWith({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.NO_SHOW },
      });
      expect(mockPrismaService.noShowCharge.create).toHaveBeenCalledWith({
        data: {
          appointmentId,
          amountCents: 0,
          squarePaymentId: null,
        },
      });
      expect(mockSquareService.chargeNoShowFee).not.toHaveBeenCalled();
    });

    it('should mark an appointment as no-show and create charge when policy exists and is enabled', async () => {
      const mockAppointment = {
        ...baseAppointment,
        shop: {
          id: 'shop-123',
          name: 'Test Shop',
          squareLocationId: 'loc-123',
          noShowPolicy: {
            id: 'policy-123',
            shopId: 'shop-123',
            feeCents: 2000,
            graceMinutes: 15,
            enabled: true,
          },
        },
        customer: {
          id: 'customer-123',
          firstName: 'John',
          lastName: 'Doe',
          phone: '1234567890',
          email: 'john@example.com',
          squareCustomerId: 'sq-customer-123',
        },
        service: {
          id: 'service-123',
          name: 'Haircut',
          durationMinutes: 30,
          priceCents: 3000,
        },
        barber: {
          id: 'barber-123',
          displayName: 'Jane Smith',
        },
        noShowCharges: [],
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.NO_SHOW,
      };

      const mockNoShowCharge = {
        id: 'charge-123',
        appointmentId,
        amountCents: 2000,
        squarePaymentId: null,
        chargedAt: new Date(),
        createdAt: new Date(),
      };

      const mockUpdatedCharge = {
        ...mockNoShowCharge,
        squarePaymentId: 'sq-payment-123',
      };

      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce(mockAppointment)
        .mockResolvedValueOnce({
          ...mockUpdatedAppointment,
          noShowCharges: [mockUpdatedCharge],
        });

      mockPrismaService.appointment.update.mockResolvedValue(mockUpdatedAppointment);
      mockPrismaService.noShowCharge.create.mockResolvedValue(mockNoShowCharge);
      mockPrismaService.noShowCharge.update.mockResolvedValue(mockUpdatedCharge);
      mockSquareService.chargeNoShowFee.mockResolvedValue({
        squarePaymentId: 'sq-payment-123',
      });

      const result = await service.markNoShow(appointmentId);

      expect(mockPrismaService.appointment.update).toHaveBeenCalledWith({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.NO_SHOW },
      });
      expect(mockPrismaService.noShowCharge.create).toHaveBeenCalledWith({
        data: {
          appointmentId,
          amountCents: 2000,
          squarePaymentId: null,
        },
      });
      expect(mockSquareService.chargeNoShowFee).toHaveBeenCalledWith({
        amountCents: 2000,
        currency: 'USD',
        customerSquareId: 'sq-customer-123',
        shopSquareLocationId: 'loc-123',
      });
      expect(mockPrismaService.noShowCharge.update).toHaveBeenCalledWith({
        where: { id: 'charge-123' },
        data: { squarePaymentId: 'sq-payment-123' },
      });
    });

    it('should throw BadRequestException if appointment is already marked as no-show', async () => {
      const mockAppointment = {
        ...baseAppointment,
        status: AppointmentStatus.NO_SHOW, // Already marked
        shop: {
          id: 'shop-123',
          name: 'Test Shop',
          squareLocationId: 'loc-123',
          noShowPolicy: null,
        },
        customer: {},
        service: {},
        barber: {},
        noShowCharges: [],
      };

      mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);

      await expect(service.markNoShow(appointmentId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.markNoShow(appointmentId)).rejects.toThrow(
        'Appointment is already marked as no-show',
      );
    });

    it('should throw BadRequestException if grace period has not passed', async () => {
      const futureStartTime = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now
      const mockAppointment = {
        ...baseAppointment,
        startAt: futureStartTime,
        shop: {
          id: 'shop-123',
          name: 'Test Shop',
          squareLocationId: 'loc-123',
          noShowPolicy: {
            id: 'policy-123',
            shopId: 'shop-123',
            feeCents: 2000,
            graceMinutes: 15,
            enabled: true,
          },
        },
        customer: {},
        service: {},
        barber: {},
        noShowCharges: [],
      };

      mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);

      await expect(service.markNoShow(appointmentId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.markNoShow(appointmentId)).rejects.toThrow(
        /Too early to mark as no-show/,
      );
    });

    it('should throw NotFoundException if appointment does not exist', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(null);

      await expect(service.markNoShow(appointmentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.markNoShow(appointmentId)).rejects.toThrow(
        `Appointment with ID ${appointmentId} not found`,
      );
    });

    it('should handle Square payment failure gracefully without blocking no-show marking', async () => {
      const mockAppointment = {
        ...baseAppointment,
        shop: {
          id: 'shop-123',
          name: 'Test Shop',
          squareLocationId: 'loc-123',
          noShowPolicy: {
            id: 'policy-123',
            shopId: 'shop-123',
            feeCents: 2000,
            graceMinutes: 15,
            enabled: true,
          },
        },
        customer: {
          id: 'customer-123',
          firstName: 'John',
          lastName: 'Doe',
          phone: '1234567890',
          email: 'john@example.com',
          squareCustomerId: 'sq-customer-123',
        },
        service: {
          id: 'service-123',
          name: 'Haircut',
          durationMinutes: 30,
          priceCents: 3000,
        },
        barber: {
          id: 'barber-123',
          displayName: 'Jane Smith',
        },
        noShowCharges: [],
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.NO_SHOW,
      };

      const mockNoShowCharge = {
        id: 'charge-123',
        appointmentId,
        amountCents: 2000,
        squarePaymentId: null,
        chargedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce(mockAppointment)
        .mockResolvedValueOnce({
          ...mockUpdatedAppointment,
          noShowCharges: [mockNoShowCharge],
        });

      mockPrismaService.appointment.update.mockResolvedValue(mockUpdatedAppointment);
      mockPrismaService.noShowCharge.create.mockResolvedValue(mockNoShowCharge);
      mockSquareService.chargeNoShowFee.mockRejectedValue(
        new Error('Square payment failed'),
      );

      // Should not throw despite Square failure
      const result = await service.markNoShow(appointmentId);

      expect(mockPrismaService.appointment.update).toHaveBeenCalled();
      expect(mockPrismaService.noShowCharge.create).toHaveBeenCalled();
      expect(mockSquareService.chargeNoShowFee).toHaveBeenCalled();
      // No-show charge should still be created with null squarePaymentId
      expect(result).toBeDefined();
    });

    it('should not charge when policy is disabled', async () => {
      const mockAppointment = {
        ...baseAppointment,
        shop: {
          id: 'shop-123',
          name: 'Test Shop',
          squareLocationId: 'loc-123',
          noShowPolicy: {
            id: 'policy-123',
            shopId: 'shop-123',
            feeCents: 2000,
            graceMinutes: 15,
            enabled: false, // Policy disabled
          },
        },
        customer: {
          id: 'customer-123',
          firstName: 'John',
          lastName: 'Doe',
          phone: '1234567890',
          email: 'john@example.com',
          squareCustomerId: 'sq-customer-123',
        },
        service: {
          id: 'service-123',
          name: 'Haircut',
          durationMinutes: 30,
          priceCents: 3000,
        },
        barber: {
          id: 'barber-123',
          displayName: 'Jane Smith',
        },
        noShowCharges: [],
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.NO_SHOW,
      };

      const mockNoShowCharge = {
        id: 'charge-123',
        appointmentId,
        amountCents: 0,
        squarePaymentId: null,
        chargedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.appointment.findUnique
        .mockResolvedValueOnce(mockAppointment)
        .mockResolvedValueOnce({
          ...mockUpdatedAppointment,
          noShowCharges: [mockNoShowCharge],
        });

      mockPrismaService.appointment.update.mockResolvedValue(mockUpdatedAppointment);
      mockPrismaService.noShowCharge.create.mockResolvedValue(mockNoShowCharge);

      const result = await service.markNoShow(appointmentId);

      expect(mockPrismaService.noShowCharge.create).toHaveBeenCalledWith({
        data: {
          appointmentId,
          amountCents: 0,
          squarePaymentId: null,
        },
      });
      expect(mockSquareService.chargeNoShowFee).not.toHaveBeenCalled();
    });
  });
});
