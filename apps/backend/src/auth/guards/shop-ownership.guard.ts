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
      // Fail closed: do not allow access if ownership cannot be verified
      if (error.message?.includes('column') && error.message?.includes('ownerId')) {
        throw new ForbiddenException(
          'Shop ownership verification unavailable. Please ensure database migrations are complete.'
        );
      }
      throw new ForbiddenException('Unable to verify shop ownership');
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