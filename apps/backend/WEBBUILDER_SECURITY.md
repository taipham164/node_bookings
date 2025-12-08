# Webbuilder Security System

This document outlines the comprehensive security implementation for the webbuilder system.

## Overview

The webbuilder system implements multi-layered security to prevent unauthorized access to shop pages and ensure data integrity. The system includes JWT authentication, shop ownership validation, secure HTML sanitization, and database schema validation.

## Security Layers

### 1. JWT Authentication
- All webbuilder endpoints require valid JWT tokens
- Implemented via `JwtAuthGuard` on controller level
- Users must be authenticated before accessing any webbuilder functionality

### 2. Shop Ownership Authorization
- `ShopOwnershipGuard` validates that authenticated users own the shops they're trying to access
- Prevents cross-shop data access and unauthorized page creation
- Implements fail-closed security (denies access when ownership cannot be verified)

### 3. HTML Sanitization
- CSS-aware HTML sanitization using DOMPurify with custom configuration
- Preserves GrapesJS functionality while blocking XSS attacks
- Whitelist of 60+ safe CSS properties with dangerous pattern detection

### 4. Database Schema Validation
- Application startup validation ensures required database schema exists
- Prevents authorization bypass scenarios when migrations are incomplete
- Configurable behavior via environment variables

## Database Requirements

### User Model
The system requires a `User` model with the following structure:
```prisma
model User {
  id          String  @id @default(uuid())
  email       String  @unique
  passwordHash String
  ownedShops  Shop[]  @relation("ShopOwner")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Shop Model Updates
The `Shop` model must include owner relationship:
```prisma
model Shop {
  id       String @id @default(uuid())
  ownerId  String
  owner    User   @relation("ShopOwner", fields: [ownerId], references: [id])
  // ... other fields
}
```

## Environment Configuration

### Schema Validation Control
- `WEBBUILDER_REQUIRE_SCHEMA`: Controls startup behavior when schema validation fails
  - `true` (default): Blocks application startup for security
  - `false`: Allows startup but logs security warnings
- For development environments where migrations may be incomplete

### Authentication Security Control
- `ALLOW_MOCK_AUTH`: Controls mock authentication when User table is missing
  - `undefined` or `false` (default): Throws UnauthorizedException on schema errors
  - `true`: Allows mock user ONLY in development with NODE_ENV=development
- **CRITICAL**: Never set to `true` in production environments

Example usage:
```bash
# Production (default): Secure authentication, no mocking
NODE_ENV=production
WEBBUILDER_REQUIRE_SCHEMA=true
# ALLOW_MOCK_AUTH should not be set

# Development (secure): Real authentication even in dev
NODE_ENV=development  
WEBBUILDER_REQUIRE_SCHEMA=false
# ALLOW_MOCK_AUTH should not be set

# Development (mock enabled): Allow mock auth during schema development
NODE_ENV=development
WEBBUILDER_REQUIRE_SCHEMA=false
ALLOW_MOCK_AUTH=true
```

## Migration Requirements

Before enabling webbuilder functionality, ensure the following migrations are applied:

1. **User Model Migration**: Creates the User table with authentication fields
2. **Shop Ownership Migration**: Adds `ownerId` foreign key to Shop table

Apply migrations with:
```bash
pnpm --filter backend prisma:migrate
pnpm --filter backend prisma:generate
```

## Security Features

### Authentication Service Security
- **Fail-Closed Authentication**: Throws UnauthorizedException when User table missing
- **Environment-Controlled Mock Auth**: Mock users only with explicit dev configuration
- **Specific Error Detection**: Uses Prisma error codes and table existence patterns
- **Comprehensive Logging**: Original errors logged for diagnosis with privacy protection
- **Security Warnings**: Clear alerts when mock authentication is active

### Shop Ownership Guard
- Validates JWT tokens contain valid user information
- Queries database to verify user owns the requested shop
- Implements fail-closed behavior for security
- Provides detailed error logging for debugging

### HTML Sanitizer
- Preserves inline styles required by GrapesJS page builder
- Blocks dangerous CSS patterns (JavaScript execution, data URIs, imports)
- Maintains whitelist of safe CSS properties
- Uses DOMPurify hooks for custom validation

### Authorization Decorators
- `@AuthUser()`: Extracts authenticated user from JWT payload
- `@ShopId()`: Extracts shop ID from request parameters
- Combined with guards for comprehensive protection

## Error Handling

### Schema Validation Errors
- Application startup blocked when required schema elements missing
- Detailed error messages with migration instructions
- Environment variable override for development scenarios

### Authorization Errors
- HTTP 401 for invalid/missing JWT tokens
- HTTP 403 for insufficient permissions (shop ownership)
- HTTP 500 for system errors with detailed logging

### Sanitization Warnings
- Logged warnings for potentially dangerous HTML content
- Preservation of safe content while blocking threats
- Detailed CSS property validation

## Testing

### Security Testing
Verify the following scenarios:
1. Unauthenticated requests are rejected
2. Users cannot access other users' shops
3. HTML content is properly sanitized
4. Application fails to start with incomplete schema

### Schema Validation Testing
Test startup behavior:
```bash
# Test with incomplete schema
WEBBUILDER_REQUIRE_SCHEMA=true npm start
# Should fail with schema validation error

# Test with bypass flag
WEBBUILDER_REQUIRE_SCHEMA=false npm start  
# Should start with warnings
```

## Development Guidelines

### Adding New Endpoints
1. Apply `@UseGuards(JwtAuthGuard, ShopOwnershipGuard)` to all shop-scoped endpoints
2. Use `@AuthUser()` decorator to access authenticated user
3. Use `@ShopId()` decorator to extract shop ID from parameters
4. Implement proper error handling for authorization failures

### Database Changes
1. Always include User-Shop relationships in schema changes
2. Test schema validation with incomplete migrations
3. Update documentation when adding new security requirements

### HTML Content Handling
1. Always sanitize user-provided HTML content
2. Use the webbuilder HTML sanitizer for GrapesJS compatibility
3. Test CSS functionality after sanitization changes

## Troubleshooting

### Common Issues

#### "Database schema validation failed"
- Run `pnpm --filter backend prisma:migrate` to apply missing migrations
- Ensure database is accessible and up-to-date
- Check that User model exists with required fields

#### "Authentication system unavailable"
- This indicates the User table is missing and mock auth is disabled
- Run database migrations: `pnpm --filter backend prisma:migrate`
- For development only: Set `ALLOW_MOCK_AUTH=true` with `NODE_ENV=development`
- Never enable mock auth in production environments

#### "Shop ownership verification failed"
- Verify JWT token contains valid user ID
- Ensure user owns the requested shop in database
- Check database connectivity and query performance

#### "GrapesJS styles not working"
- Verify HTML sanitizer preserves required CSS properties
- Check for dangerous CSS patterns being blocked incorrectly
- Review sanitization logs for blocked content

### Debug Mode
Enable detailed logging by setting log level to debug in application configuration. This will show:
- Schema validation steps
- Authorization query details  
- HTML sanitization decisions
- CSS property validation results