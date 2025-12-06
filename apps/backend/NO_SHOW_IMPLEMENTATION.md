# No-Show Policy & Charge Flow Implementation

## Overview
This document describes the implementation of the no-show policy and charge flow for the booking system.

## What Was Implemented

### PART 0: Housekeeping ✅
- Added `apps/backend/dist/` to `.gitignore`
- Removed all tracked `dist/` files from git

### PART 1: Prisma Schema Updates ✅
- Updated `NoShowPolicy` model with one-to-one relationship to Shop (`shopId` is now unique)
- Confirmed `NoShowCharge` model with proper relations
- Created migration file: `20251206201710_add_no_show_policy_unique_constraint/migration.sql`

### PART 2: No-Show Policy Management API ✅
Created complete module structure:
- **Module**: `src/no-show-policy/no-show-policy.module.ts`
- **Service**: `src/no-show-policy/no-show-policy.service.ts`
  - `getPolicyForShop(shopId)` - Get policy for a shop
  - `upsertPolicyForShop(shopId, dto)` - Create or update policy
- **Controller**: `src/no-show-policy/no-show-policy.controller.ts`
  - `GET /api/no-show/policy/:shopId` - Get policy
  - `PUT /api/no-show/policy/:shopId` - Upsert policy
- **DTO**: `src/no-show-policy/dto/update-no-show-policy.dto.ts`
- Wired into `AppModule`

### PART 3: No-Show Flow for Appointments ✅
Extended `AppointmentService`:
- **Method**: `markNoShow(appointmentId)`
  - Validates appointment exists and is not already marked as no-show
  - Loads shop's no-show policy
  - Checks grace period has passed (throws error if too early)
  - Updates appointment status to `NO_SHOW`
  - Creates `NoShowCharge` record with appropriate amount
  - Attempts Square payment if configured (non-blocking)
  - Returns updated appointment with all relations

Added endpoint:
- `POST /api/appointments/:id/no-show` - Mark appointment as no-show

### PART 4: Square Payment Integration ✅
Added to `SquareService`:
- **Method**: `chargeNoShowFee(params)`
  - Currently a placeholder with comprehensive TODO comments
  - Returns `null` until card-on-file integration is implemented
  - Includes example implementation code (commented out)
  - Does not block no-show marking if payment fails

Integration in `markNoShow`:
- Attempts to charge if:
  - Policy is enabled
  - Fee is > 0
  - Customer has `squareCustomerId`
  - Shop has `squareLocationId`
- Updates `NoShowCharge` with `squarePaymentId` if successful
- Logs errors but doesn't throw (payment failures don't block marking no-show)

### PART 5: Tests ✅
Created comprehensive test suites:

**NoShowPolicyService Tests**: `src/no-show-policy/no-show-policy.service.spec.ts`
- Getting policy for a shop
- Returning null when no policy exists
- Throwing error when shop doesn't exist
- Creating new policy
- Updating existing policy
- Validation errors

**AppointmentService Tests**: `src/appointment/appointment.service.spec.ts`
- Marking as no-show without policy
- Marking as no-show with enabled policy
- Creating charge with correct amount
- Square payment integration
- Already marked as no-show (error case)
- Grace period not passed (error case)
- Appointment not found (error case)
- Square payment failure handling (graceful)
- Disabled policy (no charge)

## API Endpoints

### No-Show Policy Management
```
GET /api/no-show/policy/:shopId
- Returns the no-show policy for a shop
- 404 if no policy exists

PUT /api/no-show/policy/:shopId
- Body: { feeCents: number, graceMinutes: number, enabled: boolean }
- Creates or updates the policy for a shop
```

### Appointment No-Show
```
POST /api/appointments/:id/no-show
- Marks an appointment as no-show
- Creates a NoShowCharge record
- Optionally charges via Square (if configured)
- Returns updated appointment with charges
```

## Database Schema

### NoShowPolicy
```prisma
model NoShowPolicy {
  id           String   @id @default(uuid())
  shopId       String   @unique        // One policy per shop
  feeCents     Int                     // Fee to charge
  graceMinutes Int      @default(15)   // Grace period after start time
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  shop         Shop     @relation(...)
}
```

### NoShowCharge
```prisma
model NoShowCharge {
  id              String      @id @default(uuid())
  appointmentId   String
  amountCents     Int                        // Amount charged
  squarePaymentId String?     @unique       // Square payment ID (nullable)
  chargedAt       DateTime    @default(now())
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  appointment     Appointment @relation(...)
}
```

## Setup Instructions

### 1. Install Dependencies (Already Done)
```bash
pnpm install
```

### 2. Generate Prisma Client
**IMPORTANT**: You need to run this before the app will compile:
```bash
pnpm --filter backend prisma:generate
```

### 3. Run Migrations
```bash
pnpm --filter backend prisma:migrate -- --name add_no_show_policy_and_charges
```

### 4. Build
```bash
pnpm --filter backend build
```

### 5. Run Tests
```bash
cd apps/backend
pnpm test
```

## Business Logic

### No-Show Marking Flow
1. Admin calls `POST /api/appointments/:id/no-show`
2. System validates:
   - Appointment exists
   - Not already marked as no-show
   - Grace period has passed (if policy exists)
3. System updates appointment status to `NO_SHOW`
4. System creates `NoShowCharge` record:
   - If no policy or policy disabled: `amountCents = 0`
   - If policy enabled: `amountCents = policy.feeCents`
5. If charge > 0 and Square integration available:
   - Attempts to charge via Square
   - Updates `squarePaymentId` if successful
   - Logs error if fails (doesn't block no-show marking)
6. Returns updated appointment with charges

### Grace Period Logic
- Grace period starts at `appointment.startAt`
- Grace period ends at `appointment.startAt + policy.graceMinutes`
- Cannot mark as no-show before grace period ends
- Example: If appointment at 2:00 PM with 15min grace, cannot mark until 2:15 PM

## TODO: Card-on-File Integration

The Square payment integration is currently a placeholder. To implement:

1. **Add card vaulting flow**:
   - Customer provides card during booking
   - Store card with Square using Cards API
   - Associate card ID with customer

2. **Update `chargeNoShowFee` method**:
   - Retrieve customer's default card from Square
   - Use `squareClient.paymentsApi.createPayment()`
   - Handle idempotency with unique keys
   - Return payment ID on success

3. **Error handling**:
   - Card declined
   - Insufficient funds
   - Card expired
   - Customer dispute flow

## Notes

- All no-show marking is non-blocking - payment failures don't prevent status updates
- Policy is optional - shops can operate without no-show policies
- Charges are created even if amount is 0 (for tracking purposes)
- Grace period prevents premature no-show marking
- All changes are tracked with timestamps
- Tests cover both success and failure scenarios

## Files Modified/Created

### Created
- `apps/backend/src/no-show-policy/no-show-policy.module.ts`
- `apps/backend/src/no-show-policy/no-show-policy.service.ts`
- `apps/backend/src/no-show-policy/no-show-policy.controller.ts`
- `apps/backend/src/no-show-policy/dto/update-no-show-policy.dto.ts`
- `apps/backend/src/no-show-policy/no-show-policy.service.spec.ts`
- `apps/backend/src/appointment/appointment.service.spec.ts`
- `apps/backend/prisma/migrations/20251206201710_add_no_show_policy_unique_constraint/migration.sql`

### Modified
- `.gitignore` - Added dist/ ignores
- `apps/backend/prisma/schema.prisma` - Updated relations and uniqueness
- `apps/backend/src/app.module.ts` - Added NoShowPolicyModule
- `apps/backend/src/appointment/appointment.module.ts` - Added SquareModule import
- `apps/backend/src/appointment/appointment.service.ts` - Added markNoShow method
- `apps/backend/src/appointment/appointment.controller.ts` - Added no-show endpoint
- `apps/backend/src/square/square.service.ts` - Added chargeNoShowFee method
- `apps/backend/package.json` - Added testing dependencies

### Removed from Git Tracking
- All files in `apps/backend/dist/` (75+ files)
