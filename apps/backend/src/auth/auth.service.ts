import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // For development during migration period, use mock authentication
    try {
      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create a default user for testing
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await this.prisma.user.create({
          data: {
            email,
            name: 'Test User',
            password: hashedPassword,
          },
        });
        console.log('Created test user:', email);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) {
        const { password: _, ...result } = user;
        return result;
      }
      return null;
    } catch (error: any) {
      // If User table doesn't exist yet, return a mock user
      if (error.message?.includes('Table') || error.message?.includes('user')) {
        console.warn('User table not found, using mock authentication');
        return {
          id: '00000000-0000-0000-0000-000000000000',
          email,
          name: 'Mock User',
        };
      }
      throw error;
    }
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