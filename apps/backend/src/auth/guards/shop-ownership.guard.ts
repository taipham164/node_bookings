import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShopOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract shopId from various sources (body, params, query)
    const shopId = this.extractShopId(request);
    
    if (!shopId) {
      throw new ForbiddenException('Shop ID is required');
    }

    // Check if user owns the shop
    try {
      const shop = await this.prisma.shop.findFirst({
        where: {
          id: shopId,
          ownerId: user.id,
        },
      });

      if (!shop) {
        throw new ForbiddenException('You do not have permission to access this shop');
      }
    } catch (error: any) {
      // Handle case where ownerId column doesn't exist yet (during migration)
      if (error.message?.includes('column') && error.message?.includes('ownerId')) {
        // For now, allow access if the database schema hasn't been updated
        console.warn('Shop ownership validation skipped: database schema not updated yet');
        return true;
      }
      throw error;
    }

    return true;
  }

  private extractShopId(request: any): string | null {
    // Check body first (for POST/PUT requests)
    if (request.body?.shopId) {
      return request.body.shopId;
    }

    // Check params (for routes with :shopId)
    if (request.params?.shopId) {
      return request.params.shopId;
    }

    // Check query parameters
    if (request.query?.shopId) {
      return request.query.shopId;
    }

    return null;
  }
}