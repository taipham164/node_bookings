import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { NoShowPolicyService } from './no-show-policy.service';
import { UpdateNoShowPolicyDto } from './dto/update-no-show-policy.dto';

@Controller('no-show/policy')
export class NoShowPolicyController {
  constructor(private readonly noShowPolicyService: NoShowPolicyService) {}

  /**
   * GET /api/no-show/policy/:shopId
   * Get the no-show policy for a shop
   */
  @Get(':shopId')
  async getPolicy(@Param('shopId') shopId: string) {
    const policy = await this.noShowPolicyService.getPolicyForShop(shopId);

    if (!policy) {
      throw new NotFoundException(
        `No-show policy not found for shop ${shopId}`,
      );
    }

    return policy;
  }

  /**
   * PUT /api/no-show/policy/:shopId
   * Create or update the no-show policy for a shop
   */
  @Put(':shopId')
  async upsertPolicy(
    @Param('shopId') shopId: string,
    @Body() dto: UpdateNoShowPolicyDto,
  ) {
    return this.noShowPolicyService.upsertPolicyForShop(shopId, dto);
  }
}
