import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { CreateTimeOffDto } from './dto/create-timeoff.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    barberWorkingHours: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    barberTimeOff: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findWorkingHours', () => {
    it('should return working hours for a barber', async () => {
      const shopId = 'shop-123';
      const barberId = 'barber-123';
      const mockWorkingHours = [
        {
          id: 'wh-1',
          shopId,
          barberId,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.barberWorkingHours.findMany.mockResolvedValue(
        mockWorkingHours,
      );

      const result = await service.findWorkingHours(shopId, barberId);

      expect(result).toEqual(mockWorkingHours);
      expect(mockPrismaService.barberWorkingHours.findMany).toHaveBeenCalledWith(
        {
          where: { shopId, barberId },
          orderBy: { dayOfWeek: 'asc' },
        },
      );
    });
  });

  describe('setWorkingHours', () => {
    it('should create new working hours when none exist', async () => {
      const dto: CreateWorkingHoursDto = {
        shopId: 'shop-123',
        barberId: 'barber-123',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      };

      const mockCreated = {
        id: 'wh-1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.barberWorkingHours.findFirst.mockResolvedValue(null);
      mockPrismaService.barberWorkingHours.create.mockResolvedValue(mockCreated);

      const result = await service.setWorkingHours(dto);

      expect(result).toEqual(mockCreated);
      expect(mockPrismaService.barberWorkingHours.create).toHaveBeenCalledWith({
        data: dto,
      });
    });

    it('should update existing working hours when they exist', async () => {
      const dto: CreateWorkingHoursDto = {
        shopId: 'shop-123',
        barberId: 'barber-123',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      };

      const existing = {
        id: 'wh-1',
        shopId: dto.shopId,
        barberId: dto.barberId,
        dayOfWeek: dto.dayOfWeek,
        startTime: '08:00',
        endTime: '16:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = { ...existing, ...dto };

      mockPrismaService.barberWorkingHours.findFirst.mockResolvedValue(existing);
      mockPrismaService.barberWorkingHours.update.mockResolvedValue(mockUpdated);

      const result = await service.setWorkingHours(dto);

      expect(result).toEqual(mockUpdated);
      expect(mockPrismaService.barberWorkingHours.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: {
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
      });
    });
  });

  describe('updateWorkingHours', () => {
    it('should update working hours', async () => {
      const id = 'wh-1';
      const dto: UpdateWorkingHoursDto = {
        startTime: '10:00',
        endTime: '18:00',
      };

      const existing = {
        id,
        shopId: 'shop-123',
        barberId: 'barber-123',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = { ...existing, ...dto };

      mockPrismaService.barberWorkingHours.findUnique.mockResolvedValue(
        existing,
      );
      mockPrismaService.barberWorkingHours.update.mockResolvedValue(mockUpdated);

      const result = await service.updateWorkingHours(id, dto);

      expect(result).toEqual(mockUpdated);
      expect(mockPrismaService.barberWorkingHours.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
      });
    });

    it('should throw NotFoundException if working hours do not exist', async () => {
      const id = 'non-existent';
      const dto: UpdateWorkingHoursDto = { startTime: '10:00' };

      mockPrismaService.barberWorkingHours.findUnique.mockResolvedValue(null);

      await expect(service.updateWorkingHours(id, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteWorkingHours', () => {
    it('should delete working hours', async () => {
      const id = 'wh-1';
      const existing = {
        id,
        shopId: 'shop-123',
        barberId: 'barber-123',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.barberWorkingHours.findUnique.mockResolvedValue(
        existing,
      );
      mockPrismaService.barberWorkingHours.delete.mockResolvedValue(existing);

      await service.deleteWorkingHours(id);

      expect(mockPrismaService.barberWorkingHours.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw NotFoundException if working hours do not exist', async () => {
      const id = 'non-existent';

      mockPrismaService.barberWorkingHours.findUnique.mockResolvedValue(null);

      await expect(service.deleteWorkingHours(id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findTimeOff', () => {
    it('should return time off records for a barber', async () => {
      const shopId = 'shop-123';
      const barberId = 'barber-123';
      const mockTimeOff = [
        {
          id: 'to-1',
          shopId,
          barberId,
          startAt: new Date('2025-01-01'),
          endAt: new Date('2025-01-02'),
          reason: 'Vacation',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.barberTimeOff.findMany.mockResolvedValue(mockTimeOff);

      const result = await service.findTimeOff(shopId, barberId);

      expect(result).toEqual(mockTimeOff);
      expect(mockPrismaService.barberTimeOff.findMany).toHaveBeenCalledWith({
        where: { shopId, barberId },
        orderBy: { startAt: 'asc' },
      });
    });
  });

  describe('createTimeOff', () => {
    it('should create a time off record', async () => {
      const dto: CreateTimeOffDto = {
        shopId: 'shop-123',
        barberId: 'barber-123',
        startAt: '2025-01-01T00:00:00Z',
        endAt: '2025-01-02T00:00:00Z',
        reason: 'Vacation',
      };

      const mockCreated = {
        id: 'to-1',
        shopId: dto.shopId,
        barberId: dto.barberId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        reason: dto.reason,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.barberTimeOff.create.mockResolvedValue(mockCreated);

      const result = await service.createTimeOff(dto);

      expect(result).toEqual(mockCreated);
      expect(mockPrismaService.barberTimeOff.create).toHaveBeenCalledWith({
        data: {
          shopId: dto.shopId,
          barberId: dto.barberId,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          reason: dto.reason,
        },
      });
    });
  });

  describe('isBarberWorkingAt', () => {
    it('should return false when no working hours exist', async () => {
      mockPrismaService.barberWorkingHours.findFirst.mockResolvedValue(null);

      const result = await service.isBarberWorkingAt({
        shopId: 'shop-123',
        barberId: 'barber-123',
        at: new Date('2025-01-06T10:00:00Z'), // Monday
      });

      expect(result).toBe(false);
    });

    it('should return true when within working hours and no time off', async () => {
      const at = new Date('2025-01-06T10:00:00Z'); // Monday 10:00 UTC
      const dayOfWeek = at.getDay(); // 1 = Monday

      const mockWorkingHours = {
        id: 'wh-1',
        shopId: 'shop-123',
        barberId: 'barber-123',
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.barberWorkingHours.findFirst.mockResolvedValue(
        mockWorkingHours,
      );
      mockPrismaService.barberTimeOff.findMany.mockResolvedValue([]);

      const result = await service.isBarberWorkingAt({
        shopId: 'shop-123',
        barberId: 'barber-123',
        at,
      });

      expect(result).toBe(true);
    });

    it('should return false when outside working hours', async () => {
      const at = new Date('2025-01-06T18:00:00Z'); // Monday 18:00 UTC
      const dayOfWeek = at.getDay(); // 1 = Monday

      const mockWorkingHours = {
        id: 'wh-1',
        shopId: 'shop-123',
        barberId: 'barber-123',
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.barberWorkingHours.findFirst.mockResolvedValue(
        mockWorkingHours,
      );

      const result = await service.isBarberWorkingAt({
        shopId: 'shop-123',
        barberId: 'barber-123',
        at,
      });

      expect(result).toBe(false);
    });

    it('should return false when a time-off block overlaps the time', async () => {
      const at = new Date('2025-01-06T10:00:00Z'); // Monday 10:00 UTC
      const dayOfWeek = at.getDay(); // 1 = Monday

      const mockWorkingHours = {
        id: 'wh-1',
        shopId: 'shop-123',
        barberId: 'barber-123',
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTimeOff = [
        {
          id: 'to-1',
          shopId: 'shop-123',
          barberId: 'barber-123',
          startAt: new Date('2025-01-06T09:00:00Z'),
          endAt: new Date('2025-01-06T12:00:00Z'),
          reason: 'Meeting',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.barberWorkingHours.findFirst.mockResolvedValue(
        mockWorkingHours,
      );
      mockPrismaService.barberTimeOff.findMany.mockResolvedValue(mockTimeOff);

      const result = await service.isBarberWorkingAt({
        shopId: 'shop-123',
        barberId: 'barber-123',
        at,
      });

      expect(result).toBe(false);
    });
  });
});
