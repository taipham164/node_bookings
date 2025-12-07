import { Module } from '@nestjs/common';
import { PageController } from './page.controller';
import { PublicPageController } from './public-page.controller';
import { PageService } from './page.service';
import { SchemaValidationService } from './schema-validation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PageController, PublicPageController],
  providers: [PageService, SchemaValidationService],
  exports: [PageService, SchemaValidationService],
})
export class WebbuilderModule {}
