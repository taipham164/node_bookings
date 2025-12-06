import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NoShowPolicyService } from './no-show-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNoShowPolicyDto } from './dto/update-no-show-policy.dto';

describe('NoShowPolicyService', () => {
  let service: NoShowPolicyService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    shop: {
      findUnique: jest.fn(),
    },
    noShowPolicy: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoShowPolicyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NoShowPolicyService>(NoShowPolicyService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPolicyForShop', () => {
    it('should return the policy for a shop', async () => {
      const shopId = 'shop-123';
      const mockShop = { id: shopId, name: 'Test Shop', squareLocationId: 'loc-123' };
      const mockPolicy = {
        id: 'policy-123',
        shopId,
        feeCents: 2000,
        graceMinutes: 15,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.noShowPolicy.findUnique.mockResolvedValue(mockPolicy);

      const result = await service.getPolicyForShop(shopId);

      expect(result).toEqual(mockPolicy);
      expect(mockPrismaService.shop.findUnique).toHaveBeenCalledWith({
        where: { id: shopId },
      });
      expect(mockPrismaService.noShowPolicy.findUnique).toHaveBeenCalledWith({
        where: { shopId },
      });
    });

    it('should return null if no policy exists for the shop', async () => {
      const shopId = 'shop-123';
      const mockShop = { id: shopId, name: 'Test Shop', squareLocationId: 'loc-123' };

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.noShowPolicy.findUnique.mockResolvedValue(null);

      const result = await service.getPolicyForShop(shopId);

      expect(result).toBeNull();
    });

    it('should throw NotFoundException if shop does not exist', async () => {
      const shopId = 'non-existent-shop';

      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      await expect(service.getPolicyForShop(shopId)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.shop.findUnique).toHaveBeenCalledWith({
        where: { id: shopId },
      });
    });
  });

  describe('upsertPolicyForShop', () => {
    it('should create a new policy if none exists', async () => {
      const shopId = 'shop-123';
      const mockShop = { id: shopId, name: 'Test Shop', squareLocationId: 'loc-123' };
      const dto: UpdateNoShowPolicyDto = {
        feeCents: 2000,
        graceMinutes: 15,
        enabled: true,
      };
      const mockCreatedPolicy = {
        id: 'policy-123',
        shopId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.noShowPolicy.upsert.mockResolvedValue(mockCreatedPolicy);

      const result = await service.upsertPolicyForShop(shopId, dto);

      expect(result).toEqual(mockCreatedPolicy);
      expect(mockPrismaService.noShowPolicy.upsert).toHaveBeenCalledWith({
        where: { shopId },
        update: {
          feeCents: dto.feeCents,
          graceMinutes: dto.graceMinutes,
          enabled: dto.enabled,
        },
        create: {
          shopId,
          feeCents: dto.feeCents,
          graceMinutes: dto.graceMinutes,
          enabled: dto.enabled,
        },
      });
    });

    it('should update an existing policy', async () => {
      const shopId = 'shop-123';
      const mockShop = { id: shopId, name: 'Test Shop', squareLocationId: 'loc-123' };
      const dto: UpdateNoShowPolicyDto = {
        feeCents: 3000,
        graceMinutes: 30,
        enabled: false,
      };
      const mockUpdatedPolicy = {
        id: 'policy-123',
        shopId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.noShowPolicy.upsert.mockResolvedValue(mockUpdatedPolicy);

      const result = await service.upsertPolicyForShop(shopId, dto);

      expect(result).toEqual(mockUpdatedPolicy);
    });

    it('should throw NotFoundException if shop does not exist', async () => {
      const shopId = 'non-existent-shop';
      const dto: UpdateNoShowPolicyDto = {
        feeCents: 2000,
        graceMinutes: 15,
        enabled: true,
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      await expect(service.upsertPolicyForShop(shopId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.shop.findUnique).toHaveBeenCalledWith({
        where: { id: shopId },
      });
      expect(mockPrismaService.noShowPolicy.upsert).not.toHaveBeenCalled();
    });
  });
});
