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
      where: { 
        shopId_slug: {
          shopId,
          slug
        }
      },
    });

    if (!page) {
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
    // Check if slug already exists in this shop first, before making any changes
    const existing = await this.prisma.page.findUnique({
      where: { 
        shopId_slug: {
          shopId: dto.shopId,
          slug: dto.slug
        }
      },
    });

    if (existing) {
      throw new BadRequestException(`Page with slug "${dto.slug}" already exists in this shop`);
    }

    // If this page should be the home page, use a transaction to ensure atomicity
    if (dto.isHome) {
      return this.prisma.$transaction(async (prisma) => {
        // Unset any existing home page
        await prisma.page.updateMany({
          where: { shopId: dto.shopId, isHome: true },
          data: { isHome: false },
        });

        // Create the new page
        return prisma.page.create({
          data: dto,
        });
      });
    }

    // If not a home page, create directly
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

    // If updating slug, check it doesn't conflict within the shop first
    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.prisma.page.findUnique({
        where: { 
          shopId_slug: {
            shopId: page.shopId,
            slug: dto.slug
          }
        },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(`Page with slug "${dto.slug}" already exists in this shop`);
      }
    }

    // If updating to be the home page, use a transaction to ensure atomicity
    if (dto.isHome) {
      return this.prisma.$transaction(async (prisma) => {
        // Unset any existing home page
        await prisma.page.updateMany({
          where: { shopId: page.shopId, isHome: true },
          data: { isHome: false },
        });

        // Update the current page
        return prisma.page.update({
          where: { id },
          data: dto,
        });
      });
    }

    // If not setting as home page, update directly
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
    return this.prisma.$transaction(async (prisma) => {
      // Re-check/load the target page within the transaction to validate shopId and existence
      const page = await prisma.page.findUnique({
        where: { id: pageId },
      });

      if (!page || page.shopId !== shopId) {
        throw new NotFoundException(`Page with id "${pageId}" not found`);
      }

      // Unset any existing home page for this shop
      await prisma.page.updateMany({
        where: { shopId, isHome: true },
        data: { isHome: false },
      });

      // Set the target page as the new home page
      return prisma.page.update({
        where: { id: pageId },
        data: { isHome: true },
      });
    });
  }

  async getBuilderData(pageId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true, html: true },
    });

    if (!page) {
      throw new NotFoundException(`Page with id "${pageId}" not found`);
    }

    return {
      data: page.html || null,
    };
  }

  async updateBuilderData(pageId: string, puckData: any) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new NotFoundException(`Page with id "${pageId}" not found`);
    }

    return this.prisma.page.update({
      where: { id: pageId },
      data: { html: JSON.stringify(puckData) },
      select: { id: true, html: true },
    });
  }
}
