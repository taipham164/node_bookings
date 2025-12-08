import { Test, TestingModule } from '@nestjs/testing';
import { PageService } from './page.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { BadRequestException } from '@nestjs/common';

// Mock the HTML sanitizer to avoid ES module issues
jest.mock('./utils/html-sanitizer', () => ({
  sanitizeHtml: jest.fn((html) => html)
}));

describe('PageService Unique Constraint', () => {
  let service: PageService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    page: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PageService>(PageService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Shop-scoped uniqueness', () => {
    it('should use composite unique constraint in findBySlug', async () => {
      const mockPage = {
        id: '1',
        shopId: 'shop1',
        slug: 'test-page',
        title: 'Test Page',
        html: '<p>Test</p>',
        isHome: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.findBySlug('shop1', 'test-page');

      expect(mockPrismaService.page.findUnique).toHaveBeenCalledWith({
        where: {
          shopId_slug: {
            shopId: 'shop1',
            slug: 'test-page'
          }
        }
      });

      expect(result).toEqual(mockPage);
    });

    it('should use composite unique constraint in createPage validation', async () => {
      const dto: CreatePageDto = {
        shopId: 'shop1',
        slug: 'test-page',
        title: 'Test Page',
        html: '<p>Test</p>',
        isHome: false,
      };

      // Mock existing page in same shop
      mockPrismaService.page.findUnique.mockResolvedValue({
        id: '1',
        shopId: 'shop1',
        slug: 'test-page'
      });

      await expect(service.createPage(dto)).rejects.toThrow(BadRequestException);
      await expect(service.createPage(dto)).rejects.toThrow('Page with slug "test-page" already exists in this shop');

      expect(mockPrismaService.page.findUnique).toHaveBeenCalledWith({
        where: {
          shopId_slug: {
            shopId: 'shop1',
            slug: 'test-page'
          }
        }
      });
    });

    it('should allow same slug in different shops', async () => {
      const dto: CreatePageDto = {
        shopId: 'shop2',  // Different shop
        slug: 'test-page', // Same slug
        title: 'Test Page',
        html: '<p>Test</p>',
        isHome: false,
      };

      // Mock no existing page in shop2 with this slug
      mockPrismaService.page.findUnique.mockResolvedValue(null);
      mockPrismaService.page.create.mockResolvedValue({
        id: '2',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createPage(dto);

      expect(mockPrismaService.page.findUnique).toHaveBeenCalledWith({
        where: {
          shopId_slug: {
            shopId: 'shop2',
            slug: 'test-page'
          }
        }
      });

      expect(mockPrismaService.page.create).toHaveBeenCalledWith({
        data: dto
      });

      expect(result.shopId).toBe('shop2');
      expect(result.slug).toBe('test-page');
    });
  });

  describe('setHomePage transaction', () => {
    it('should use transaction to atomically update home page', async () => {
      const mockPage = {
        id: 'page-1',
        shopId: 'shop1',
        slug: 'test-page',
        title: 'Test Page',
        html: '<p>Test</p>',
        isHome: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPage = { ...mockPage, isHome: true };

      // Mock the transaction
      mockPrismaService.$transaction = jest.fn((callback) => {
        // Simulate the transaction callback
        const transactionPrisma = {
          page: {
            findUnique: jest.fn().mockResolvedValue(mockPage),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            update: jest.fn().mockResolvedValue(updatedPage),
          }
        };
        return callback(transactionPrisma);
      });

      const result = await service.setHomePage('shop1', 'page-1');

      // Verify transaction was used
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      
      // Verify the result
      expect(result).toEqual(updatedPage);
      expect(result.isHome).toBe(true);
    });

    it('should validate page exists within transaction', async () => {
      // Mock the transaction
      mockPrismaService.$transaction = jest.fn((callback) => {
        const transactionPrisma = {
          page: {
            findUnique: jest.fn().mockResolvedValue(null), // Page not found
            updateMany: jest.fn(),
            update: jest.fn(),
          }
        };
        return callback(transactionPrisma);
      });

      await expect(service.setHomePage('shop1', 'nonexistent-page')).rejects.toThrow('Page with id "nonexistent-page" not found');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should validate shopId matches within transaction', async () => {
      const mockPage = {
        id: 'page-1',
        shopId: 'different-shop', // Different shop
        slug: 'test-page',
        title: 'Test Page',
        html: '<p>Test</p>',
        isHome: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the transaction
      mockPrismaService.$transaction = jest.fn((callback) => {
        const transactionPrisma = {
          page: {
            findUnique: jest.fn().mockResolvedValue(mockPage),
            updateMany: jest.fn(),
            update: jest.fn(),
          }
        };
        return callback(transactionPrisma);
      });

      await expect(service.setHomePage('shop1', 'page-1')).rejects.toThrow('Page with id "page-1" not found');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});