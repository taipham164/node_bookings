import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

/**
 * Validates critical environment variables required for secure operation
 * Throws an error and prevents startup if any required variables are missing
 */
function validateEnvironmentVariables() {
  const requiredEnvVars = [
    { name: 'JWT_SECRET', description: 'JWT signing secret for authentication tokens' },
    { name: 'DATABASE_URL', description: 'Database connection string' },
  ];

  const missingVars: string[] = [];
  const weakSecrets: string[] = [];

  requiredEnvVars.forEach(({ name, description }) => {
    const value = process.env[name];
    
    if (!value || value.trim() === '') {
      missingVars.push(`${name} (${description})`);
    } else if (name === 'JWT_SECRET') {
      // Validate JWT_SECRET strength
      if (value.length < 32) {
        weakSecrets.push(`${name} must be at least 32 characters long`);
      }
      if (value === 'your-secret-key' || value === 'secret' || value === 'jwt-secret') {
        weakSecrets.push(`${name} uses a common/default value - use a cryptographically secure secret`);
      }
    }
  });

  if (missingVars.length > 0 || weakSecrets.length > 0) {
    console.error('\n🚨 CRITICAL: Application startup blocked due to security configuration errors!');
    
    if (missingVars.length > 0) {
      console.error('\n❌ Missing required environment variables:');
      missingVars.forEach(varInfo => console.error(`   - ${varInfo}`));
    }
    
    if (weakSecrets.length > 0) {
      console.error('\n❌ Weak security configuration:');
      weakSecrets.forEach(issue => console.error(`   - ${issue}`));
    }
    
    console.error('\n🔧 Fix these issues before starting the application:');
    console.error('   1. Set JWT_SECRET to a cryptographically secure random string (32+ characters)');
    console.error('   2. Ensure DATABASE_URL points to a valid database');
    console.error('\n💡 Example JWT_SECRET generation:');
    console.error('   Node.js: require(\'crypto\').randomBytes(64).toString(\'hex\')');
    console.error('   OpenSSL: openssl rand -hex 64');
    console.error('\n🛡️ Security Note: Never use default/common secrets in production!');
    
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
}

async function bootstrap() {
  // Validate critical environment variables before starting the application
  validateEnvironmentVariables();
  const app = await NestFactory.create(AppModule);
  
  // Configure body parser to capture raw body for webhook signature verification
  app.use('/api/webhooks', bodyParser.json({
    verify: (req: any, res: any, buf: Buffer) => {
      req.rawBody = buf;
    }
  }));
  
  // Enable global validation pipes for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Enable CORS for future frontend integrations
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  });

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Backend server running on http://localhost:${port}`);
}

bootstrap();