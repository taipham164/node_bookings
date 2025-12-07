import { Module } from '@nestjs/common';
import { NoShowPolicyController } from './no-show-policy.controller';
import { NoShowPolicyService } from './no-show-policy.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NoShowPolicyController],
  providers: [NoShowPolicyService],
  exports: [NoShowPolicyService],
})
export class NoShowPolicyModule {}
