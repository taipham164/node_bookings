import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BookingValidationService } from './booking-validation.service';
import { PrismaService } from '../prisma/prisma.service';
import { SquareService } from '../square/square.service';

describe('BookingValidationService', () => {
  let service: BookingValidationService;
  let prismaService: PrismaService;
  let squareService: SquareService;

  const mockShop = {
    id: 'shop-1',
    name: 'Test Barbershop',
    squareLocationId: 'square-location-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    id: 'service-1',
    shopId: 'shop-1',
    name: 'Haircut',
    durationMins: 30,
    priceCents: 3000,
    squareCatalogObjectId: 'square-catalog-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomer = {
    id: 'customer-1',
    shopId: 'shop-1',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-1234',
    email: 'john@example.com',
    squareCustomerId: 'square-customer-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBarber = {
    id: 'barber-1',
    shopId: 'shop-1',
    displayName: 'Jane Barber',
    squareTeamMemberId: 'square-team-1',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      shop: {
        findUnique: jest.fn(),
      },
      service: {
        findUnique: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      barber: {
        findUnique: jest.fn(),
      },
      appointment: {
        findFirst: jest.fn(),
      },
    };

    const mockSquareService = {
      verifySlotIsAvailable: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingValidationService,
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

    service = module.get<BookingValidationService>(BookingValidationService);
    prismaService = module.get<PrismaService>(PrismaService);
    squareService = module.get<SquareService>(SquareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateBookingRequest', () => {
    const validParams = {
      shopId: 'shop-1',
      serviceId: 'service-1',
      customerId: 'customer-1',
      barberId: 'barber-1',
      startAt: '2025-12-10T10:00:00.000Z',
    };

    it('should pass validation for a valid booking request', async () => {
      // Mock all entities exist
      jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
      jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
      jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
      jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);

      // Mock no conflicting appointments
      jest.spyOn(prismaService.appointment, 'findFirst').mockResolvedValue(null);

      // Mock Square availability check
      jest.spyOn(squareService, 'verifySlotIsAvailable').mockResolvedValue(true);

      await expect(service.validateBookingRequest(validParams)).resolves.not.toThrow();
    });

    describe('Entity existence validation', () => {
      it('should throw NotFoundException when shop does not exist', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(null);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          new NotFoundException(`Shop with ID ${validParams.shopId} not found`)
        );
      });

      it('should throw NotFoundException when service does not exist', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(null);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          new NotFoundException(`Service with ID ${validParams.serviceId} not found`)
        );
      });

      it('should throw NotFoundException when customer does not exist', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(null);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          new NotFoundException(`Customer with ID ${validParams.customerId} not found`)
        );
      });

      it('should throw NotFoundException when barber does not exist', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(null);

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          new NotFoundException(`Barber with ID ${validParams.barberId} not found`)
        );
      });
    });

    describe('Shop relationship validation', () => {
      it('should throw BadRequestException when service belongs to different shop', async () => {
        const wrongShopService = { ...mockService, shopId: 'different-shop' };
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(wrongShopService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          BadRequestException
        );
        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          /Service does not belong to shop/
        );
      });

      it('should throw BadRequestException when customer belongs to different shop', async () => {
        const wrongShopCustomer = { ...mockCustomer, shopId: 'different-shop' };
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(wrongShopCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          BadRequestException
        );
        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          /Customer does not belong to shop/
        );
      });

      it('should throw BadRequestException when barber belongs to different shop', async () => {
        const wrongShopBarber = { ...mockBarber, shopId: 'different-shop' };
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(wrongShopBarber);

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          BadRequestException
        );
        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          /Barber does not belong to shop/
        );
      });
    });

    describe('Barber double-booking prevention', () => {
      it('should throw ConflictException when barber has conflicting appointment', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);

        // Mock a conflicting appointment for the barber
        const conflictingAppointment = {
          id: 'appointment-1',
          barberId: 'barber-1',
          customerId: 'other-customer',
          serviceId: 'service-1',
          shopId: 'shop-1',
          startAt: new Date('2025-12-10T10:15:00.000Z'),
          endAt: new Date('2025-12-10T10:45:00.000Z'),
          status: 'SCHEDULED',
          barber: { displayName: 'Jane Barber' },
          customer: { firstName: 'Other', lastName: 'Customer' },
        };

        jest
          .spyOn(prismaService.appointment, 'findFirst')
          .mockResolvedValueOnce(conflictingAppointment as any)
          .mockResolvedValueOnce(null);

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          ConflictException
        );
        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          /Barber "Jane Barber" is already booked/
        );
      });

      it('should not throw when barber has no conflicting appointments', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);
        jest.spyOn(prismaService.appointment, 'findFirst').mockResolvedValue(null);
        jest.spyOn(squareService, 'verifySlotIsAvailable').mockResolvedValue(true);

        await expect(service.validateBookingRequest(validParams)).resolves.not.toThrow();
      });
    });

    describe('Customer double-booking prevention', () => {
      it('should throw ConflictException when customer has conflicting appointment', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);

        // Mock no barber conflict, but customer has conflict
        const customerConflict = {
          id: 'appointment-2',
          barberId: 'other-barber',
          customerId: 'customer-1',
          serviceId: 'service-1',
          shopId: 'shop-1',
          startAt: new Date('2025-12-10T10:15:00.000Z'),
          endAt: new Date('2025-12-10T10:45:00.000Z'),
          status: 'SCHEDULED',
          service: { name: 'Haircut' },
        };

        jest
          .spyOn(prismaService.appointment, 'findFirst')
          .mockResolvedValueOnce(null) // No barber conflict
          .mockResolvedValueOnce(customerConflict as any); // Customer conflict

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          ConflictException
        );
        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          /Customer already has an appointment/
        );
      });

      it('should not throw when customer has no conflicting appointments', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);
        jest.spyOn(prismaService.appointment, 'findFirst').mockResolvedValue(null);
        jest.spyOn(squareService, 'verifySlotIsAvailable').mockResolvedValue(true);

        await expect(service.validateBookingRequest(validParams)).resolves.not.toThrow();
      });
    });

    describe('Square slot availability validation', () => {
      it('should throw ConflictException when Square slot is not available', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);
        jest.spyOn(prismaService.appointment, 'findFirst').mockResolvedValue(null);

        // Mock Square slot as unavailable
        jest.spyOn(squareService, 'verifySlotIsAvailable').mockResolvedValue(false);

        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          ConflictException
        );
        await expect(service.validateBookingRequest(validParams)).rejects.toThrow(
          /selected time slot is no longer available/
        );
      });

      it('should not throw when Square slot is available', async () => {
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);
        jest.spyOn(prismaService.appointment, 'findFirst').mockResolvedValue(null);
        jest.spyOn(squareService, 'verifySlotIsAvailable').mockResolvedValue(true);

        await expect(service.validateBookingRequest(validParams)).resolves.not.toThrow();
      });

      it('should skip Square validation when shop has no squareLocationId', async () => {
        const shopWithoutSquare = { ...mockShop, squareLocationId: null };
        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(shopWithoutSquare);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.barber, 'findUnique').mockResolvedValue(mockBarber);
        jest.spyOn(prismaService.appointment, 'findFirst').mockResolvedValue(null);

        // Square validation should be skipped, so this should never be called
        const squareSpy = jest.spyOn(squareService, 'verifySlotIsAvailable');

        await expect(service.validateBookingRequest(validParams)).resolves.not.toThrow();
        expect(squareSpy).not.toHaveBeenCalled();
      });
    });

    describe('Booking without barber', () => {
      it('should validate successfully when barberId is not provided', async () => {
        const paramsWithoutBarber = {
          shopId: 'shop-1',
          serviceId: 'service-1',
          customerId: 'customer-1',
          startAt: '2025-12-10T10:00:00.000Z',
        };

        jest.spyOn(prismaService.shop, 'findUnique').mockResolvedValue(mockShop);
        jest.spyOn(prismaService.service, 'findUnique').mockResolvedValue(mockService);
        jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue(mockCustomer);
        jest.spyOn(prismaService.appointment, 'findFirst').mockResolvedValue(null);
        jest.spyOn(squareService, 'verifySlotIsAvailable').mockResolvedValue(true);

        await expect(
          service.validateBookingRequest(paramsWithoutBarber)
        ).resolves.not.toThrow();
      });
    });
  });
});
