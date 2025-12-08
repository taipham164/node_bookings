import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CreateFlagDto } from './dto/create-flag.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { CustomerNote, CustomerFlag, CustomerTag } from '@prisma/client';

interface CustomerCRMData {
  notes: CustomerNote[];
  flags: CustomerFlag[];
  tags: CustomerTag[];
}

@Injectable()
export class CustomerCRMService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== NOTES ====================

  async createNote(dto: CreateNoteDto): Promise<CustomerNote> {
    // Verify customer exists and belongs to the shop
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    if (customer.shopId !== dto.shopId) {
      throw new ForbiddenException(
        `Customer ${dto.customerId} does not belong to shop ${dto.shopId}`,
      );
    }

    return this.prisma.customerNote.create({
      data: dto,
    });
  }

  async getNotesForCustomer(customerId: string): Promise<CustomerNote[]> {
    return this.prisma.customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateNote(id: string, dto: UpdateNoteDto): Promise<CustomerNote> {
    const note = await this.prisma.customerNote.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return this.prisma.customerNote.update({
      where: { id },
      data: { content: dto.content },
    });
  }

  async deleteNote(id: string): Promise<CustomerNote> {
    const note = await this.prisma.customerNote.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return this.prisma.customerNote.delete({
      where: { id },
    });
  }

  // ==================== FLAGS ====================

  async addFlag(dto: CreateFlagDto): Promise<CustomerFlag> {
    // Verify customer exists and belongs to the shop
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    if (customer.shopId !== dto.shopId) {
      throw new ForbiddenException(
        `Customer ${dto.customerId} does not belong to shop ${dto.shopId}`,
      );
    }

    // Check if flag already exists
    const existingFlag = await this.prisma.customerFlag.findUnique({
      where: {
        customerId_flag: {
          customerId: dto.customerId,
          flag: dto.flag,
        },
      },
    });

    if (existingFlag) {
      throw new ConflictException(
        `Flag "${dto.flag}" already exists for customer ${dto.customerId}`,
      );
    }

    return this.prisma.customerFlag.create({
      data: dto,
    });
  }

  async removeFlag(customerId: string, flag: string): Promise<void> {
    const existingFlag = await this.prisma.customerFlag.findUnique({
      where: {
        customerId_flag: {
          customerId,
          flag,
        },
      },
    });

    if (!existingFlag) {
      // Idempotent - don't throw error if flag doesn't exist
      return;
    }

    await this.prisma.customerFlag.delete({
      where: {
        customerId_flag: {
          customerId,
          flag,
        },
      },
    });
  }

  async listFlags(customerId: string): Promise<CustomerFlag[]> {
    return this.prisma.customerFlag.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==================== TAGS ====================

  async addTag(dto: CreateTagDto): Promise<CustomerTag> {
    // Verify customer exists and belongs to the shop
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    if (customer.shopId !== dto.shopId) {
      throw new ForbiddenException(
        `Customer ${dto.customerId} does not belong to shop ${dto.shopId}`,
      );
    }

    // Check if tag already exists
    const existingTag = await this.prisma.customerTag.findUnique({
      where: {
        customerId_tag: {
          customerId: dto.customerId,
          tag: dto.tag,
        },
      },
    });

    if (existingTag) {
      throw new ConflictException(
        `Tag "${dto.tag}" already exists for customer ${dto.customerId}`,
      );
    }

    return this.prisma.customerTag.create({
      data: dto,
    });
  }

  async removeTag(customerId: string, tag: string): Promise<void> {
    const existingTag = await this.prisma.customerTag.findUnique({
      where: {
        customerId_tag: {
          customerId,
          tag,
        },
      },
    });

    if (!existingTag) {
      // Idempotent - don't throw error if tag doesn't exist
      return;
    }

    await this.prisma.customerTag.delete({
      where: {
        customerId_tag: {
          customerId,
          tag,
        },
      },
    });
  }

  async listTags(customerId: string): Promise<CustomerTag[]> {
    return this.prisma.customerTag.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==================== AGGREGATED CRM DATA ====================

  async getCustomerCRMData(customerId: string): Promise<CustomerCRMData> {
    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const [notes, flags, tags] = await Promise.all([
      this.getNotesForCustomer(customerId),
      this.listFlags(customerId),
      this.listTags(customerId),
    ]);

    return {
      notes,
      flags,
      tags,
    };
  }
}
