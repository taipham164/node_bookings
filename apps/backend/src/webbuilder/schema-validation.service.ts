import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SchemaValidationResult {
  isValid: boolean;
  missingColumns: string[];
  errors: string[];
}

@Injectable()
export class SchemaValidationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchemaValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    this.logger.log('Validating database schema for webbuilder authorization...');
    
    const validation = await this.validateAuthorizationSchema();
    
    if (!validation.isValid) {
      const errorMessage = [
        'CRITICAL: Database schema validation failed!',
        'The webbuilder authorization system requires database migrations to be applied.',
        '',
        'Missing columns:',
        ...validation.missingColumns.map(col => `  - ${col}`),
        '',
        'Errors:',
        ...validation.errors.map(err => `  - ${err}`),
        '',
        'Please run the following commands to fix this:',
        '  1. pnpm --filter backend prisma:migrate',
        '  2. pnpm --filter backend prisma:generate',
        '',
        'Application startup blocked for security reasons.',
      ].join('\n');

      this.logger.error(errorMessage);

      // Check environment variable to determine behavior
      const blockStartup = process.env.WEBBUILDER_REQUIRE_SCHEMA !== 'false';
      
      if (blockStartup) {
        // Default: Prevent application startup for security
        throw new Error('Database schema validation failed: Authorization system requires complete database migration');
      } else {
        // Development override: Allow startup but log warning
        this.logger.warn('⚠️ SECURITY WARNING: Schema validation failed but startup allowed via WEBBUILDER_REQUIRE_SCHEMA=false');
        this.logger.warn('⚠️ Authorization features will throw errors until migrations are applied');
      }
    } else {
      this.logger.log('✅ Database schema validation passed - Authorization system ready');
    }
  }

  async validateAuthorizationSchema(): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      isValid: true,
      missingColumns: [],
      errors: [],
    };

    try {
      // Test 1: Check if User table exists using raw query to avoid TypeScript issues
      await this.prisma.$queryRaw`SELECT 1 FROM "users" LIMIT 1`;
    } catch (error: any) {
      result.isValid = false;
      if (error.message?.includes('relation') && error.message?.includes('users')) {
        result.missingColumns.push('User table');
        result.errors.push('User table does not exist - run migration to create user authentication system');
      } else {
        result.errors.push(`User table validation failed: ${error.message}`);
      }
    }

    try {
      // Test 2: Check if Shop.ownerId column exists using raw query
      await this.prisma.$queryRaw`SELECT "ownerId" FROM "shops" LIMIT 1`;
    } catch (error: any) {
      result.isValid = false;
      if (error.message?.includes('column') && error.message?.includes('ownerId')) {
        result.missingColumns.push('Shop.ownerId');
        result.errors.push('Shop.ownerId column does not exist - run migration to add shop ownership tracking');
      } else {
        result.errors.push(`Shop.ownerId validation failed: ${error.message}`);
      }
    }

    try {
      // Test 3: Check if we can perform a join to validate the relationship
      await this.prisma.$queryRaw`
        SELECT s."id", s."ownerId", u."id" as "userId" 
        FROM "shops" s 
        LEFT JOIN "users" u ON s."ownerId" = u."id" 
        LIMIT 1
      `;
    } catch (error: any) {
      result.isValid = false;
      result.errors.push(`Shop-User relation validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Runtime check for authorization schema validity
   * Can be called by guards/controllers for additional safety
   */
  async isAuthorizationSchemaValid(): Promise<boolean> {
    const result = await this.validateAuthorizationSchema();
    return result.isValid;
  }
}