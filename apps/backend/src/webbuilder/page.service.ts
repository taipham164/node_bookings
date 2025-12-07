import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PageService {
  constructor(private prisma: PrismaService) {}

  async findAll(shopId: string) {
    return this.prisma.page.findMany({
      where: { shopId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findBySlug(shopId: string, slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
    });

    if (!page || page.shopId !== shopId) {
      throw new NotFoundException(`Page with slug "${slug}" not found`);
    }

    return page;
  }

  async findHomePage(shopId: string) {
    const page = await this.prisma.page.findFirst({
      where: { shopId, isHome: true },
    });

    if (!page) {
      throw new NotFoundException('Home page not found for this shop');
    }

    return page;
  }

  async createPage(dto: CreatePageDto) {
    // If this page should be the home page, unset any existing home page
    if (dto.isHome) {
      await this.prisma.page.updateMany({
        where: { shopId: dto.shopId, isHome: true },
        data: { isHome: false },
      });
    }

    // Check if slug already exists
    const existing = await this.prisma.page.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException(`Page with slug "${dto.slug}" already exists`);
    }

    return this.prisma.page.create({
      data: dto,
    });
  }

  async updatePage(id: string, dto: UpdatePageDto) {
    const page = await this.prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Page with id "${id}" not found`);
    }

    // If updating to be the home page, unset any existing home page
    if (dto.isHome) {
      await this.prisma.page.updateMany({
        where: { shopId: page.shopId, isHome: true },
        data: { isHome: false },
      });
    }

    // If updating slug, check it doesn't conflict
    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.prisma.page.findUnique({
        where: { slug: dto.slug },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(`Page with slug "${dto.slug}" already exists`);
      }
    }

    return this.prisma.page.update({
      where: { id },
      data: dto,
    });
  }

  async deletePage(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Page with id "${id}" not found`);
    }

    await this.prisma.page.delete({
      where: { id },
    });

    return { success: true, message: 'Page deleted successfully' };
  }

  async setHomePage(shopId: string, pageId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page || page.shopId !== shopId) {
      throw new NotFoundException(`Page with id "${pageId}" not found`);
    }

    // Unset existing home page
    await this.prisma.page.updateMany({
      where: { shopId, isHome: true },
      data: { isHome: false },
    });

    // Set new home page
    return this.prisma.page.update({
      where: { id: pageId },
      data: { isHome: true },
    });
  }
}
