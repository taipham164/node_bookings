import { Module } from '@nestjs/common';
import { SquareService } from './square.service';
import { SquareController } from './square.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SquareController],
  providers: [SquareService],
  exports: [SquareService],
})
export class SquareModule {}
