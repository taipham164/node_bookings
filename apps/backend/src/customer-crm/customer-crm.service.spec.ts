import { Test, TestingModule } from '@nestjs/testing';
import { CustomerCRMService } from './customer-crm.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

describe('CustomerCRMService', () => {
  let service: CustomerCRMService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
    },
    customerNote: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    customerFlag: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    customerTag: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerCRMService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomerCRMService>(CustomerCRMService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== NOTES TESTS ====================

  describe('createNote', () => {
    it('should create a note successfully', async () => {
      const createNoteDto = {
        shopId: 'shop-1',
        customerId: 'customer-1',
        authorId: 'author-1',
        content: 'Test note content',
      };

      const mockCustomer = {
        id: 'customer-1',
        shopId: 'shop-1',
      };

      const mockNote = {
        id: 'note-1',
        ...createNoteDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customerNote.create.mockResolvedValue(mockNote);

      const result = await service.createNote(createNoteDto);

      expect(result).toEqual(mockNote);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
      });
      expect(mockPrismaService.customerNote.create).toHaveBeenCalledWith({
        data: createNoteDto,
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      const createNoteDto = {
        shopId: 'shop-1',
        customerId: 'invalid-customer',
        authorId: 'author-1',
        content: 'Test note',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.createNote(createNoteDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if shopId mismatch', async () => {
      const createNoteDto = {
        shopId: 'shop-1',
        customerId: 'customer-1',
        authorId: 'author-1',
        content: 'Test note',
      };

      const mockCustomer = {
        id: 'customer-1',
        shopId: 'different-shop',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.createNote(createNoteDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getNotesForCustomer', () => {
    it('should return notes for a customer', async () => {
      const mockNotes = [
        { id: 'note-1', content: 'Note 1', createdAt: new Date() },
        { id: 'note-2', content: 'Note 2', createdAt: new Date() },
      ];

      mockPrismaService.customerNote.findMany.mockResolvedValue(mockNotes);

      const result = await service.getNotesForCustomer('customer-1');

      expect(result).toEqual(mockNotes);
      expect(mockPrismaService.customerNote.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateNote', () => {
    it('should update note content', async () => {
      const updateDto = { content: 'Updated content' };
      const mockNote = {
        id: 'note-1',
        content: 'Old content',
      };
      const mockUpdatedNote = {
        id: 'note-1',
        content: 'Updated content',
      };

      mockPrismaService.customerNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.customerNote.update.mockResolvedValue(mockUpdatedNote);

      const result = await service.updateNote('note-1', updateDto);

      expect(result).toEqual(mockUpdatedNote);
      expect(mockPrismaService.customerNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { content: 'Updated content' },
      });
    });

    it('should throw NotFoundException if note does not exist', async () => {
      mockPrismaService.customerNote.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNote('invalid-note', { content: 'New content' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      const mockNote = { id: 'note-1', content: 'Test note' };

      mockPrismaService.customerNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.customerNote.delete.mockResolvedValue(mockNote);

      const result = await service.deleteNote('note-1');

      expect(result).toEqual(mockNote);
      expect(mockPrismaService.customerNote.delete).toHaveBeenCalledWith({
        where: { id: 'note-1' },
      });
    });

    it('should throw NotFoundException if note does not exist', async () => {
      mockPrismaService.customerNote.findUnique.mockResolvedValue(null);

      await expect(service.deleteNote('invalid-note')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== FLAGS TESTS ====================

  describe('addFlag', () => {
    it('should add a flag successfully', async () => {
      const createFlagDto = {
        shopId: 'shop-1',
        customerId: 'customer-1',
        flag: 'VIP',
      };

      const mockCustomer = {
        id: 'customer-1',
        shopId: 'shop-1',
      };

      const mockFlag = {
        id: 'flag-1',
        ...createFlagDto,
        createdAt: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customerFlag.findUnique.mockResolvedValue(null);
      mockPrismaService.customerFlag.create.mockResolvedValue(mockFlag);

      const result = await service.addFlag(createFlagDto);

      expect(result).toEqual(mockFlag);
      expect(mockPrismaService.customerFlag.create).toHaveBeenCalledWith({
        data: createFlagDto,
      });
    });

    it('should prevent duplicate flags', async () => {
      const createFlagDto = {
        shopId: 'shop-1',
        customerId: 'customer-1',
        flag: 'VIP',
      };

      const mockCustomer = {
        id: 'customer-1',
        shopId: 'shop-1',
      };

      const existingFlag = {
        id: 'flag-1',
        ...createFlagDto,
        createdAt: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customerFlag.findUnique.mockResolvedValue(existingFlag);

      await expect(service.addFlag(createFlagDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      const createFlagDto = {
        shopId: 'shop-1',
        customerId: 'invalid-customer',
        flag: 'VIP',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.addFlag(createFlagDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if shopId mismatch', async () => {
      const createFlagDto = {
        shopId: 'shop-1',
        customerId: 'customer-1',
        flag: 'VIP',
      };

      const mockCustomer = {
        id: 'customer-1',
        shopId: 'different-shop',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.addFlag(createFlagDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('removeFlag', () => {
    it('should remove a flag successfully', async () => {
      const existingFlag = {
        id: 'flag-1',
        customerId: 'customer-1',
        flag: 'VIP',
      };

      mockPrismaService.customerFlag.findUnique.mockResolvedValue(existingFlag);
      mockPrismaService.customerFlag.delete.mockResolvedValue(existingFlag);

      await service.removeFlag('customer-1', 'VIP');

      expect(mockPrismaService.customerFlag.delete).toHaveBeenCalledWith({
        where: {
          customerId_flag: {
            customerId: 'customer-1',
            flag: 'VIP',
          },
        },
      });
    });

    it('should be idempotent when flag does not exist', async () => {
      mockPrismaService.customerFlag.findUnique.mockResolvedValue(null);

      await expect(
        service.removeFlag('customer-1', 'VIP'),
      ).resolves.not.toThrow();

      expect(mockPrismaService.customerFlag.delete).not.toHaveBeenCalled();
    });
  });

  describe('listFlags', () => {
    it('should return flags for a customer', async () => {
      const mockFlags = [
        { id: 'flag-1', flag: 'VIP', createdAt: new Date() },
        { id: 'flag-2', flag: 'NO_SHOW_RISK', createdAt: new Date() },
      ];

      mockPrismaService.customerFlag.findMany.mockResolvedValue(mockFlags);

      const result = await service.listFlags('customer-1');

      expect(result).toEqual(mockFlags);
      expect(mockPrismaService.customerFlag.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  // ==================== TAGS TESTS ====================

  describe('addTag', () => {
    it('should add a tag successfully', async () => {
      const createTagDto = {
        shopId: 'shop-1',
        customerId: 'customer-1',
        tag: 'preferred-stylist',
      };

      const mockCustomer = {
        id: 'customer-1',
        shopId: 'shop-1',
      };

      const mockTag = {
        id: 'tag-1',
        ...createTagDto,
        createdAt: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customerTag.findUnique.mockResolvedValue(null);
      mockPrismaService.customerTag.create.mockResolvedValue(mockTag);

      const result = await service.addTag(createTagDto);

      expect(result).toEqual(mockTag);
      expect(mockPrismaService.customerTag.create).toHaveBeenCalledWith({
        data: createTagDto,
      });
    });

    it('should prevent duplicate tags', async () => {
      const createTagDto = {
        shopId: 'shop-1',
        customerId: 'customer-1',
        tag: 'preferred-stylist',
      };

      const mockCustomer = {
        id: 'customer-1',
        shopId: 'shop-1',
      };

      const existingTag = {
        id: 'tag-1',
        ...createTagDto,
        createdAt: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customerTag.findUnique.mockResolvedValue(existingTag);

      await expect(service.addTag(createTagDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeTag', () => {
    it('should remove a tag successfully', async () => {
      const existingTag = {
        id: 'tag-1',
        customerId: 'customer-1',
        tag: 'preferred-stylist',
      };

      mockPrismaService.customerTag.findUnique.mockResolvedValue(existingTag);
      mockPrismaService.customerTag.delete.mockResolvedValue(existingTag);

      await service.removeTag('customer-1', 'preferred-stylist');

      expect(mockPrismaService.customerTag.delete).toHaveBeenCalledWith({
        where: {
          customerId_tag: {
            customerId: 'customer-1',
            tag: 'preferred-stylist',
          },
        },
      });
    });

    it('should be idempotent when tag does not exist', async () => {
      mockPrismaService.customerTag.findUnique.mockResolvedValue(null);

      await expect(
        service.removeTag('customer-1', 'preferred-stylist'),
      ).resolves.not.toThrow();

      expect(mockPrismaService.customerTag.delete).not.toHaveBeenCalled();
    });
  });

  describe('listTags', () => {
    it('should return tags for a customer', async () => {
      const mockTags = [
        { id: 'tag-1', tag: 'preferred-stylist', createdAt: new Date() },
        { id: 'tag-2', tag: 'loyalty-member', createdAt: new Date() },
      ];

      mockPrismaService.customerTag.findMany.mockResolvedValue(mockTags);

      const result = await service.listTags('customer-1');

      expect(result).toEqual(mockTags);
      expect(mockPrismaService.customerTag.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  // ==================== AGGREGATED CRM DATA TEST ====================

  describe('getCustomerCRMData', () => {
    it('should return combined CRM data for a customer', async () => {
      const mockCustomer = { id: 'customer-1', shopId: 'shop-1' };
      const mockNotes = [{ id: 'note-1', content: 'Note 1' }];
      const mockFlags = [{ id: 'flag-1', flag: 'VIP' }];
      const mockTags = [{ id: 'tag-1', tag: 'loyal' }];

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.customerNote.findMany.mockResolvedValue(mockNotes);
      mockPrismaService.customerFlag.findMany.mockResolvedValue(mockFlags);
      mockPrismaService.customerTag.findMany.mockResolvedValue(mockTags);

      const result = await service.getCustomerCRMData('customer-1');

      expect(result).toEqual({
        notes: mockNotes,
        flags: mockFlags,
        tags: mockTags,
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.getCustomerCRMData('invalid-customer')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
