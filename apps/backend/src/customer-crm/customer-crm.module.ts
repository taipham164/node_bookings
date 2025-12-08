import { Module } from '@nestjs/common';
import { CustomerCRMService } from './customer-crm.service';
import { CustomerCRMController } from './customer-crm.controller';

@Module({
  controllers: [CustomerCRMController],
  providers: [CustomerCRMService],
  exports: [CustomerCRMService],
})
export class CustomerCRMModule {}
