import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // For development during migration period, use mock authentication
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // User doesn't exist - return null to indicate authentication failure
        this.logger.warn(`Authentication attempt for non-existent user: ${email?.substring(0, 3)}***`);
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) {
        const { password: _, ...result } = user;
        return result;
      }
      return null;
    } catch (error: any) {
      // Log the original error for diagnosis
      this.logger.error('Authentication error occurred', {
        error: error.message,
        stack: error.stack,
        email: email?.substring(0, 3) + '***', // Partially obscure for privacy
      });

      // Check for specific database schema-related errors
      const isSchemaError = this.isSchemaRelatedError(error);
      
      if (isSchemaError) {
        // Only allow mock authentication in secure development mode
        const isDevelopment = process.env.NODE_ENV === 'development';
        const mockAuthEnabled = process.env.ALLOW_MOCK_AUTH === 'true';
        
        if (isDevelopment && mockAuthEnabled) {
          this.logger.warn('⚠️ SECURITY WARNING: Using mock authentication due to missing User table');
          this.logger.warn('⚠️ This should only be enabled in development with ALLOW_MOCK_AUTH=true');
          
          return {
            id: '00000000-0000-0000-0000-000000000000',
            email,
            name: 'Mock Development User',
          };
        } else {
          // Production or mock auth disabled: Fail securely
          this.logger.error('Authentication failed: User table not available and mock auth disabled');
          this.logger.error('To enable mock auth in development: set NODE_ENV=development and ALLOW_MOCK_AUTH=true');
          throw new UnauthorizedException('Authentication system unavailable');
        }
      }
      
      // Re-throw non-schema errors
      throw error;
    }
  }

  /**
   * Register a new user with proper validation
   * This is the ONLY way to create new user accounts
   */
  async registerUser(email: string, password: string, name: string): Promise<any> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        this.logger.warn(`Registration attempt for existing user: ${email?.substring(0, 3)}***`);
        throw new UnauthorizedException('User already exists');
      }

      // Validate input
      if (!email || !password || !name) {
        throw new UnauthorizedException('Email, password, and name are required');
      }

      if (password.length < 8) {
        throw new UnauthorizedException('Password must be at least 8 characters long');
      }

      // Create user with hashed password
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await this.prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
        },
      });

      this.logger.log(`New user registered: ${email?.substring(0, 3)}***`);
      
      // Return user without password
      const { password: _, ...result } = user;
      return result;
    } catch (error: any) {
      this.logger.error('User registration failed', {
        error: error.message,
        email: email?.substring(0, 3) + '***',
      });
      throw error;
    }
  }

  /**
   * Determines if an error is related to missing database schema (User table)
   * Uses specific error detection instead of broad substring matching
   */
  private isSchemaRelatedError(error: any): boolean {
    if (!error?.message) return false;
    
    const message = error.message.toLowerCase();
    
    // Prisma-specific error patterns for missing tables
    const prismaTableErrors = [
      'table "user" doesn\'t exist',
      'table `user` doesn\'t exist', 
      'no such table: user',
      'relation "user" does not exist',
      'table "main"."user" doesn\'t exist'
    ];
    
    // Prisma error codes for schema issues
    const prismaErrorCodes = [
      'P2021', // Table does not exist
      'P2022', // Column does not exist
      'P1017', // Server has closed the connection
    ];
    
    // Check for specific table existence errors
    const hasTableError = prismaTableErrors.some(pattern => message.includes(pattern));
    
    // Check for Prisma error codes
    const hasPrismaCode = prismaErrorCodes.some(code => error.code === code);
    
    // Check for database connection errors that might indicate missing schema
    const isDatabaseConnectionError = message.includes('connect econnrefused') || 
                                    message.includes('database') && message.includes('connection');
    
    return hasTableError || hasPrismaCode || isDatabaseConnectionError;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}