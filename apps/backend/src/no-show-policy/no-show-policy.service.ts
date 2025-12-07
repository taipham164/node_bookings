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
    return this.prisma.noShowPolicy.findFirst({
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

    // Find existing policy first
    const existingPolicy = await this.prisma.noShowPolicy.findFirst({
      where: { shopId },
    });

    if (existingPolicy) {
      // Update existing policy
      const updateData: any = {};
      if (dto.feeCents !== undefined) updateData.feeCents = dto.feeCents;
      if (dto.graceMinutes !== undefined) updateData.graceMinutes = dto.graceMinutes;
      if (dto.enabled !== undefined) updateData.enabled = dto.enabled;

      return this.prisma.noShowPolicy.update({
        where: { id: existingPolicy.id },
        data: updateData,
      });
    } else {
      // Create new policy with defaults for missing fields
      return this.prisma.noShowPolicy.create({
        data: {
          shopId,
          feeCents: dto.feeCents ?? 0,
          graceMinutes: dto.graceMinutes ?? 15,
          enabled: dto.enabled ?? true,
        },
      });
    }
  }
}
