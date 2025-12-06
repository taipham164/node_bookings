import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { PrismaService } from '../prisma/prisma.service';
import { SquareService } from '../square/square.service';
import { CreateBookingDto } from './dto/create-booking.dto';

describe('AppointmentService - Booking Creation', () => {
  let service: AppointmentService;
  let prismaService: PrismaService;
  let squareService: SquareService;

  const mockPrismaService = {
    shop: {
      findUnique: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
    barber: {
      findUnique: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    appointment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockSquareService = {
    findOrCreateSquareCustomer: jest.fn(),
    createSquareBooking: jest.fn(),
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

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    const mockShop = {
      id: 'shop-123',
      name: 'Test Shop',
      squareLocationId: 'square-location-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockService = {
      id: 'service-123',
      shopId: 'shop-123',
      name: 'Haircut',
      durationMinutes: 30,
      priceCents: 3000,
      squareCatalogObjectId: 'square-catalog-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockBarber = {
      id: 'barber-123',
      shopId: 'shop-123',
      displayName: 'John Doe',
      squareTeamMemberId: 'square-team-123',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCustomer = {
      id: 'customer-123',
      shopId: 'shop-123',
      squareCustomerId: 'square-customer-123',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '555-1234',
      email: 'jane@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createBookingDto: CreateBookingDto = {
      shopId: 'shop-123',
      serviceId: 'service-123',
      barberId: 'barber-123',
      customerId: 'customer-123',
      startAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    };

    it('should create a booking successfully', async () => {
      // Setup mocks
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.barber.findUnique.mockResolvedValue(mockBarber);
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockSquareService.findOrCreateSquareCustomer.mockResolvedValue('square-customer-123');
      mockSquareService.createSquareBooking.mockResolvedValue({
        bookingId: 'square-booking-123',
        booking: { id: 'square-booking-123' },
      });
      mockPrismaService.appointment.create.mockResolvedValue({
        id: 'appointment-123',
        ...createBookingDto,
        squareBookingId: 'square-booking-123',
        status: 'SCHEDULED',
        endAt: new Date(new Date(createBookingDto.startAt).getTime() + 30 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const result = await service.createBooking(createBookingDto);

      // Verify
      expect(result).toBeDefined();
      expect(result.squareBookingId).toBe('square-booking-123');
      expect(mockSquareService.findOrCreateSquareCustomer).toHaveBeenCalledWith({
        firstName: mockCustomer.firstName,
        lastName: mockCustomer.lastName,
        phone: mockCustomer.phone,
        email: mockCustomer.email,
        existingSquareCustomerId: mockCustomer.squareCustomerId,
      });
      expect(mockSquareService.createSquareBooking).toHaveBeenCalledWith({
        locationId: mockShop.squareLocationId,
        customerId: 'square-customer-123',
        serviceVariationId: mockService.squareCatalogObjectId,
        teamMemberId: mockBarber.squareTeamMemberId,
        startAt: createBookingDto.startAt,
      });
    });

    it('should throw NotFoundException if shop is not found', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(null);
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.barber.findUnique.mockResolvedValue(mockBarber);
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.createBooking(createBookingDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if service is not found', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.service.findUnique.mockResolvedValue(null);
      mockPrismaService.barber.findUnique.mockResolvedValue(mockBarber);
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.createBooking(createBookingDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if service does not belong to shop', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.service.findUnique.mockResolvedValue({
        ...mockService,
        shopId: 'different-shop-123',
      });
      mockPrismaService.barber.findUnique.mockResolvedValue(mockBarber);
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.createBooking(createBookingDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if booking is in the past', async () => {
      const pastBookingDto = {
        ...createBookingDto,
        startAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.barber.findUnique.mockResolvedValue(mockBarber);
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.createBooking(pastBookingDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if shop is not linked to Square', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        ...mockShop,
        squareLocationId: null,
      });
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.barber.findUnique.mockResolvedValue(mockBarber);
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.createBooking(createBookingDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle Square booking creation failure', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.barber.findUnique.mockResolvedValue(mockBarber);
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockSquareService.findOrCreateSquareCustomer.mockResolvedValue('square-customer-123');
      mockSquareService.createSquareBooking.mockRejectedValue(
        new BadRequestException('Square API error')
      );

      await expect(service.createBooking(createBookingDto)).rejects.toThrow(BadRequestException);
    });

    it('should work without barberId (any staff)', async () => {
      const bookingWithoutBarber = {
        ...createBookingDto,
        barberId: undefined,
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.barber.findUnique.mockResolvedValue(null);
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockSquareService.findOrCreateSquareCustomer.mockResolvedValue('square-customer-123');
      mockSquareService.createSquareBooking.mockResolvedValue({
        bookingId: 'square-booking-123',
        booking: { id: 'square-booking-123' },
      });
      mockPrismaService.appointment.create.mockResolvedValue({
        id: 'appointment-123',
        ...bookingWithoutBarber,
        squareBookingId: 'square-booking-123',
        status: 'SCHEDULED',
        endAt: new Date(new Date(createBookingDto.startAt).getTime() + 30 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createBooking(bookingWithoutBarber);

      expect(result).toBeDefined();
      expect(mockSquareService.createSquareBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          teamMemberId: undefined,
        })
      );
    });
  });
});
