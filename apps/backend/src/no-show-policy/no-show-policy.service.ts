import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNoShowPolicyDto } from './dto/update-no-show-policy.dto';

@Injectable()
export class NoShowPolicyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the no-show policy for a specific shop
   * @param shopId - The shop ID
   * @returns The policy or null if not found
   */
  async getPolicyForShop(shopId: string) {
    // First verify the shop exists
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${shopId} not found`);
    }

    // Return the policy (may be null if no policy exists)
    return this.prisma.noShowPolicy.findUnique({
      where: { shopId },
    });
  }

  /**
   * Create or update the no-show policy for a shop
   * @param shopId - The shop ID
   * @param dto - The policy data
   * @returns The created or updated policy
   */
  async upsertPolicyForShop(shopId: string, dto: UpdateNoShowPolicyDto) {
    // First verify the shop exists
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${shopId} not found`);
    }

    // Upsert the policy
    return this.prisma.noShowPolicy.upsert({
      where: { shopId },
      update: {
        feeCents: dto.feeCents,
        graceMinutes: dto.graceMinutes,
        enabled: dto.enabled,
      },
      create: {
        shopId,
        feeCents: dto.feeCents,
        graceMinutes: dto.graceMinutes,
        enabled: dto.enabled,
      },
    });
  }
}
