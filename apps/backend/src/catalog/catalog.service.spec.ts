import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';
import { CatalogSyncService } from './catalog.sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CatalogService', () => {
  let service: CatalogService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    service: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shop: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllServices', () => {
    it('should return all services for a shop', async () => {
      const shopId = 'shop-1';
      const mockServices = [
        {
          id: 'service-1',
          shopId,
          name: 'Haircut',
          description: 'Basic haircut',
          durationMins: 30,
          priceCents: 2500,
          squareItemId: 'square-item-1',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'service-2',
          shopId,
          name: 'Beard Trim',
          description: 'Beard trimming service',
          durationMins: 15,
          priceCents: 1500,
          squareItemId: 'square-item-2',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      const result = await service.findAllServices(shopId);

      expect(result).toEqual(mockServices);
      expect(mockPrismaService.service.findMany).toHaveBeenCalledWith({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should use cached data on subsequent calls within TTL', async () => {
      const shopId = 'shop-1';
      const mockServices = [
        {
          id: 'service-1',
          shopId,
          name: 'Haircut',
          description: 'Basic haircut',
          durationMins: 30,
          priceCents: 2500,
          squareItemId: 'square-item-1',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      // First call - should hit database
      await service.findAllServices(shopId);
      expect(mockPrismaService.service.findMany).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result = await service.findAllServices(shopId);
      expect(result).toEqual(mockServices);
      expect(mockPrismaService.service.findMany).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('findServiceById', () => {
    it('should return a service by ID', async () => {
      const mockService = {
        id: 'service-1',
        shopId: 'shop-1',
        name: 'Haircut',
        description: 'Basic haircut',
        durationMins: 30,
        priceCents: 2500,
        squareItemId: 'square-item-1',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        shop: {
          id: 'shop-1',
          name: 'Test Shop',
          squareLocationId: 'location-1',
        },
      };

      mockPrismaService.service.findUnique.mockResolvedValue(mockService);

      const result = await service.findServiceById('service-1');

      expect(result).toEqual(mockService);
      expect(mockPrismaService.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              squareLocationId: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if service does not exist', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(null);

      await expect(service.findServiceById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upsertService', () => {
    it('should create a new service if it does not exist', async () => {
      const dto = {
        shopId: 'shop-1',
        name: 'Haircut',
        description: 'Basic haircut',
        durationMins: 30,
        priceCents: 2500,
        squareItemId: 'square-item-1',
        active: true,
      };

      const mockShop = { id: 'shop-1', name: 'Test Shop' };
      const mockService = {
        id: 'service-1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.service.findFirst.mockResolvedValue(null);
      mockPrismaService.service.create.mockResolvedValue(mockService);

      const result = await service.upsertService(dto);

      expect(result).toEqual(mockService);
      expect(mockPrismaService.service.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          durationMins: dto.durationMins,
          priceCents: dto.priceCents,
          squareItemId: dto.squareItemId,
          active: true,
          shopId: dto.shopId,
        },
      });
    });

    it('should update an existing service if it already exists', async () => {
      const dto = {
        shopId: 'shop-1',
        name: 'Updated Haircut',
        description: 'Updated description',
        durationMins: 45,
        priceCents: 3000,
        squareItemId: 'square-item-1',
        active: true,
      };

      const mockShop = { id: 'shop-1', name: 'Test Shop' };
      const existingService = {
        id: 'service-1',
        shopId: 'shop-1',
        name: 'Haircut',
        squareItemId: 'square-item-1',
      };
      const updatedService = {
        ...existingService,
        ...dto,
        updatedAt: new Date(),
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.service.findFirst.mockResolvedValue(existingService);
      mockPrismaService.service.update.mockResolvedValue(updatedService);

      const result = await service.upsertService(dto);

      expect(result).toEqual(updatedService);
      expect(mockPrismaService.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: {
          name: dto.name,
          description: dto.description,
          durationMins: dto.durationMins,
          priceCents: dto.priceCents,
          active: true,
          shopId: dto.shopId,
        },
      });
    });

    it('should throw NotFoundException if shop does not exist', async () => {
      const dto = {
        shopId: 'invalid-shop',
        name: 'Haircut',
        durationMins: 30,
        priceCents: 2500,
        squareItemId: 'square-item-1',
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      await expect(service.upsertService(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

describe('CatalogSyncService', () => {
  let service: CatalogSyncService;
  let prismaService: PrismaService;
  let catalogService: CatalogService;
  let configService: ConfigService;

  const mockPrismaService = {
    service: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shop: {
      findUnique: jest.fn(),
    },
  };

  const mockCatalogService = {
    clearCache: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        SQUARE_ACCESS_TOKEN: 'test-token',
        SQUARE_ENVIRONMENT: 'sandbox',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockSquareClient = {
    catalogApi: {
      listCatalog: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogSyncService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CatalogService,
          useValue: mockCatalogService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CatalogSyncService>(CatalogSyncService);
    prismaService = module.get<PrismaService>(PrismaService);
    catalogService = module.get<CatalogService>(CatalogService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();

    // Mock Square client
    (service as any).squareClient = mockSquareClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchServicesFromSquare', () => {
    it('should fetch and transform APPOINTMENTS_SERVICE items from Square', async () => {
      const mockSquareResponse = {
        result: {
          objects: [
            {
              type: 'ITEM',
              id: 'square-item-1',
              isDeleted: false,
              itemData: {
                productType: 'APPOINTMENTS_SERVICE',
                name: 'Haircut',
                description: 'Basic haircut service',
                variations: [
                  {
                    id: 'variation-1',
                    itemVariationData: {
                      name: 'Standard',
                      availableForBooking: true,
                      serviceDuration: 1800000, // 30 minutes in ms
                      priceMoney: {
                        amount: 2500,
                        currency: 'USD',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      mockSquareClient.catalogApi.listCatalog.mockResolvedValue(mockSquareResponse);

      const result = await service.fetchServicesFromSquare();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'square-item-1',
        name: 'Haircut',
        description: 'Basic haircut service',
        durationMins: 30,
        priceCents: 2500,
        squareItemId: 'square-item-1',
      });
    });

    it('should filter out non-bookable variations', async () => {
      const mockSquareResponse = {
        result: {
          objects: [
            {
              type: 'ITEM',
              id: 'square-item-1',
              isDeleted: false,
              itemData: {
                productType: 'APPOINTMENTS_SERVICE',
                name: 'Service',
                variations: [
                  {
                    id: 'variation-1',
                    itemVariationData: {
                      availableForBooking: false, // Not bookable
                      serviceDuration: 1800000,
                      priceMoney: { amount: 2500 },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      mockSquareClient.catalogApi.listCatalog.mockResolvedValue(mockSquareResponse);

      const result = await service.fetchServicesFromSquare();

      expect(result).toHaveLength(0); // Should be filtered out
    });
  });

  describe('syncFromSquare', () => {
    it('should sync services from Square and create new ones', async () => {
      const shopId = 'shop-1';
      const mockShop = { id: shopId, name: 'Test Shop' };
      const mockSquareServices = [
        {
          id: 'square-item-1',
          name: 'Haircut',
          description: 'Basic haircut',
          durationMins: 30,
          priceCents: 2500,
          squareItemId: 'square-item-1',
        },
      ];

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      jest.spyOn(service, 'fetchServicesFromSquare').mockResolvedValue(mockSquareServices);
      mockPrismaService.service.findFirst.mockResolvedValue(null);
      mockPrismaService.service.create.mockResolvedValue({
        id: 'service-1',
        ...mockSquareServices[0],
        shopId,
      });
      mockPrismaService.service.findMany.mockResolvedValue([]);

      const result = await service.syncFromSquare(shopId);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.deactivated).toBe(0);
      expect(mockCatalogService.clearCache).toHaveBeenCalled();
    });

    it('should update existing services', async () => {
      const shopId = 'shop-1';
      const mockShop = { id: shopId, name: 'Test Shop' };
      const mockSquareServices = [
        {
          id: 'square-item-1',
          name: 'Updated Haircut',
          description: 'Updated description',
          durationMins: 45,
          priceCents: 3000,
          squareItemId: 'square-item-1',
        },
      ];
      const existingService = {
        id: 'service-1',
        squareItemId: 'square-item-1',
        name: 'Haircut',
      };

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      jest.spyOn(service, 'fetchServicesFromSquare').mockResolvedValue(mockSquareServices);
      mockPrismaService.service.findFirst.mockResolvedValue(existingService);
      mockPrismaService.service.update.mockResolvedValue({
        ...existingService,
        ...mockSquareServices[0],
      });
      mockPrismaService.service.findMany.mockResolvedValue([existingService]);

      const result = await service.syncFromSquare(shopId);

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
    });

    it('should deactivate services not returned by Square', async () => {
      const shopId = 'shop-1';
      const mockShop = { id: shopId, name: 'Test Shop' };
      const localServices = [
        {
          id: 'service-1',
          squareItemId: 'old-square-item',
          name: 'Old Service',
        },
      ];

      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      jest.spyOn(service, 'fetchServicesFromSquare').mockResolvedValue([]);
      mockPrismaService.service.findMany.mockResolvedValue(localServices);
      mockPrismaService.service.update.mockResolvedValue({
        ...localServices[0],
        active: false,
      });

      const result = await service.syncFromSquare(shopId);

      expect(result.deactivated).toBe(1);
      expect(mockPrismaService.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: { active: false },
      });
    });

    it('should throw BadRequestException if shop does not exist', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      await expect(service.syncFromSquare('invalid-shop')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
