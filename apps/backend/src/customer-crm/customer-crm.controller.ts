import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomerCRMService } from './customer-crm.service';
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

@Controller('customer-crm')
export class CustomerCRMController {
  constructor(private readonly customerCRMService: CustomerCRMService) {}

  // ==================== NOTES ====================

  @Get('notes/:customerId')
  async getNotes(@Param('customerId') customerId: string): Promise<CustomerNote[]> {
    return this.customerCRMService.getNotesForCustomer(customerId);
  }

  @Post('notes')
  @HttpCode(HttpStatus.CREATED)
  async createNote(@Body() createNoteDto: CreateNoteDto): Promise<CustomerNote> {
    return this.customerCRMService.createNote(createNoteDto);
  }

  @Put('notes/:id')
  async updateNote(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ): Promise<CustomerNote> {
    return this.customerCRMService.updateNote(id, updateNoteDto);
  }

  @Delete('notes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNote(@Param('id') id: string): Promise<void> {
    await this.customerCRMService.deleteNote(id);
  }

  // ==================== FLAGS ====================

  @Get('flags/:customerId')
  async getFlags(@Param('customerId') customerId: string): Promise<CustomerFlag[]> {
    return this.customerCRMService.listFlags(customerId);
  }

  @Post('flags')
  @HttpCode(HttpStatus.CREATED)
  async addFlag(@Body() createFlagDto: CreateFlagDto): Promise<CustomerFlag> {
    return this.customerCRMService.addFlag(createFlagDto);
  }

  @Delete('flags/:customerId/:flag')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFlag(
    @Param('customerId') customerId: string,
    @Param('flag') flag: string,
  ): Promise<void> {
    await this.customerCRMService.removeFlag(customerId, flag);
  }

  // ==================== TAGS ====================

  @Get('tags/:customerId')
  async getTags(@Param('customerId') customerId: string): Promise<CustomerTag[]> {
    return this.customerCRMService.listTags(customerId);
  }

  @Post('tags')
  @HttpCode(HttpStatus.CREATED)
  async addTag(@Body() createTagDto: CreateTagDto): Promise<CustomerTag> {
    return this.customerCRMService.addTag(createTagDto);
  }

  @Delete('tags/:customerId/:tag')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTag(
    @Param('customerId') customerId: string,
    @Param('tag') tag: string,
  ): Promise<void> {
    await this.customerCRMService.removeTag(customerId, tag);
  }

  // ==================== COMBINED CRM VIEW ====================

  @Get('crm/:customerId')
  async getCustomerCRM(@Param('customerId') customerId: string): Promise<CustomerCRMData> {
    return this.customerCRMService.getCustomerCRMData(customerId);
  }
}
