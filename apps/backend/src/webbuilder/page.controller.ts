import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { PageService } from './page.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShopOwnershipGuard } from '../auth/guards/shop-ownership.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

@Controller('pages')
export class PageController {
  constructor(
    private readonly pageService: PageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, ShopOwnershipGuard)
  async findAll(
    @Query('shopId') shopId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId query parameter is required');
    }
    // ShopOwnershipGuard already verifies user owns the shop
    return this.pageService.findAll(shopId);
  }

  @Get(':id')
  // Public endpoint to get page by ID
  async findById(@Param('id') id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
    });
    
    if (!page) {
      throw new BadRequestException('Page not found');
    }
    
    return page;
  }

  @Get('home/:shopId')
  // Public endpoint for home page
  async findHomePage(@Param('shopId') shopId: string) {
    return this.pageService.findHomePage(shopId);
  }

  @Get('slug/:shopId/:slug')
  // Public endpoint for page by slug
  async findBySlugPublic(
    @Param('shopId') shopId: string,
    @Param('slug') slug: string,
  ) {
    return this.pageService.findBySlug(shopId, slug);
  }

  @Get('by-slug/:slug')
  @UseGuards(JwtAuthGuard, ShopOwnershipGuard)
  async findBySlug(
    @Param('slug') slug: string,
    @Query('shopId') shopId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId query parameter is required');
    }
    // ShopOwnershipGuard already verifies user owns the shop
    return this.pageService.findBySlug(shopId, slug);
  }

  @Post()
  // TODO: Re-enable auth when frontend has JWT token handling
  // @UseGuards(JwtAuthGuard, ShopOwnershipGuard)
  async createPage(
    @Body() createPageDto: CreatePageDto,
    // @CurrentUser() user: AuthUser,
  ) {
    // Override shopId with user's owned shop to prevent unauthorized access
    // const authorizedDto = {
    //   ...createPageDto,
    //   shopId: await this.getAuthorizedShopId(user.id, createPageDto.shopId),
    // };
    return this.pageService.createPage(createPageDto);
  }

  @Put(':id')
  // TODO: Re-enable auth when frontend has JWT token handling
  // @UseGuards(JwtAuthGuard, ShopOwnershipGuard)
  async updatePage(
    @Param('id') id: string,
    @Body() updatePageDto: UpdatePageDto,
    // @CurrentUser() user: AuthUser,
  ) {
    // Verify the page belongs to a shop owned by the user
    // await this.verifyPageOwnership(id, user.id);
    return this.pageService.updatePage(id, updatePageDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, ShopOwnershipGuard)
  async deletePage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    // Verify the page belongs to a shop owned by the user
    await this.verifyPageOwnership(id, user.id);
    await this.pageService.deletePage(id);
  }

  @Post(':shopId/home/:pageId')
  @UseGuards(JwtAuthGuard, ShopOwnershipGuard)
  async setHomePage(
    @Param('shopId') shopId: string,
    @Param('pageId') pageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    // ShopOwnershipGuard already verifies user owns the shop
    return this.pageService.setHomePage(shopId, pageId);
  }

  @Get(':id/builder-data')
  @UseGuards(JwtAuthGuard, ShopOwnershipGuard)
  async getBuilderData(
    @Param('id') id: string,
    @Query('shopId') shopId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId query parameter is required');
    }
    // Verify the page belongs to a shop owned by the user
    await this.verifyPageOwnership(id, user.id);
    return this.pageService.getBuilderData(id);
  }

  @Put(':id/builder-data')
  @UseGuards(JwtAuthGuard, ShopOwnershipGuard)
  async updateBuilderData(
    @Param('id') id: string,
    @Query('shopId') shopId: string,
    @Body() body: { data: any },
    @CurrentUser() user: AuthUser,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId query parameter is required');
    }
    // Verify the page belongs to a shop owned by the user
    await this.verifyPageOwnership(id, user.id);
    return this.pageService.updateBuilderData(id, body.data);
  }

  // Helper method to get authorized shop ID
  private async getAuthorizedShopId(userId: string, requestedShopId: string): Promise<string> {
    try {
      const shop = await this.prisma.shop.findFirst({
        where: {
          id: requestedShopId,
          ownerId: userId,
        },
      });

      if (!shop) {
        throw new ForbiddenException('You do not have permission to access this shop');
      }

      return shop.id;
    } catch (error: any) {
      // Fail closed: do not allow access if ownership cannot be verified
      if (error.message?.includes('column') && error.message?.includes('ownerId')) {
        throw new ForbiddenException(
          'Shop ownership verification unavailable. Please ensure database migrations are complete.'
        );
      }
      throw new ForbiddenException('Unable to verify shop ownership');
    }
  }

  // Helper method to verify page ownership
  private async verifyPageOwnership(pageId: string, userId: string): Promise<void> {
    try {
      const page = await this.prisma.page.findUnique({
        where: { id: pageId },
        include: { shop: true },
      });

      if (!page) {
        throw new BadRequestException('Page not found');
      }

      if (page.shop.ownerId !== userId) {
        throw new ForbiddenException('You do not have permission to access this page');
      }
    } catch (error: any) {
      // Fail closed: do not allow access if ownership cannot be verified
      if (error.message?.includes('column') && error.message?.includes('ownerId')) {
        throw new ForbiddenException(
          'Page ownership verification unavailable. Please ensure database migrations are complete.'
        );
      }
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Unable to verify page ownership');
    }
  }
}
