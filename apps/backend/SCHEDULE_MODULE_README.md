# Barber Schedule & Time-Off Module

## Overview

This module provides a self-contained scheduling system for barbers, allowing shops to manage:
- Weekly working hours per barber
- Time-off blocks (single day or date ranges)
- Real-time availability checking

## Module Structure

```
src/schedule/
├── dto/
│   ├── create-working-hours.dto.ts
│   ├── update-working-hours.dto.ts
│   ├── create-timeoff.dto.ts
│   └── update-timeoff.dto.ts
├── schedule.controller.ts
├── schedule.service.ts
├── schedule.service.spec.ts
└── schedule.module.ts
```

## Database Models

### BarberWorkingHours
Stores weekly recurring working hours for each barber.

```prisma
model BarberWorkingHours {
  id         String   @id @default(uuid())
  shopId     String
  barberId   String
  dayOfWeek  Int      // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  startTime  String   // "09:00" 24h format
  endTime    String   // "17:00"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### BarberTimeOff
Stores time-off blocks for barbers.

```prisma
model BarberTimeOff {
  id         String   @id @default(uuid())
  shopId     String
  barberId   String
  startAt    DateTime   // inclusive
  endAt      DateTime   // exclusive
  reason     String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

**Note:** `endAt` is treated as **exclusive** (startAt <= time < endAt).

## API Endpoints

All endpoints are under `/api/schedule`:

### Working Hours

- **GET** `/api/schedule/working-hours?shopId={id}&barberId={id}`
  - Returns all working hours for a barber

- **POST** `/api/schedule/working-hours`
  - Creates or updates working hours for a specific day
  - Body: `CreateWorkingHoursDto`
  - Uses upsert logic: one record per dayOfWeek per barber

- **PUT** `/api/schedule/working-hours/:id`
  - Updates existing working hours
  - Body: `UpdateWorkingHoursDto`

- **DELETE** `/api/schedule/working-hours/:id`
  - Deletes working hours record

### Time Off

- **GET** `/api/schedule/timeoff?shopId={id}&barberId={id}`
  - Returns all time-off records for a barber

- **POST** `/api/schedule/timeoff`
  - Creates a new time-off block
  - Body: `CreateTimeOffDto`

- **PUT** `/api/schedule/timeoff/:id`
  - Updates existing time-off record
  - Body: `UpdateTimeOffDto`

- **DELETE** `/api/schedule/timeoff/:id`
  - Deletes time-off record

### Availability Check

- **GET** `/api/schedule/is-working?shopId={id}&barberId={id}&at={ISO8601}&shopTimeZone={tz}`
  - Checks if a barber is working at a specific time
  - Parameters:
    - `shopId`: Shop ID (required)
    - `barberId`: Barber ID (required)
    - `at`: ISO 8601 timestamp (required)
    - `shopTimeZone`: IANA timezone (optional, e.g., "America/Los_Angeles")
  - Returns: `{ "working": true|false }`

## Service Methods

### `isBarberWorkingAt(params)`

Core helper method for checking barber availability:

```typescript
async isBarberWorkingAt(params: {
  shopId: string;
  barberId: string;
  at: Date;           // in UTC
  shopTimeZone?: string; // optional IANA timezone
}): Promise<boolean>
```

**Logic:**
1. Converts UTC time to shop's local timezone (if provided)
2. Determines day of week and local time ("HH:mm")
3. Looks up working hours for that day
4. Checks if time falls within working hours
5. Checks for overlapping time-off blocks
6. Returns `true` if barber is working, `false` otherwise

**Future Integration:**
This method can be called from booking validation logic to ensure appointments are only created during barber working hours.

## Database Migration

To apply the database migration:

```bash
cd apps/backend
pnpm prisma:generate
pnpm prisma:migrate -- --name add_barber_schedule_models
```

Manual migration file is located at:
```
prisma/migrations/20251208035600_add_barber_schedule_models/migration.sql
```

## Running Tests

```bash
cd apps/backend
pnpm test schedule.service.spec
```

## Independence

This module is **completely independent** and does NOT modify:
- Existing booking logic
- Appointment validation
- Payment processing
- Catalog module
- Auth or webbuilder modules

It can be integrated into appointment creation logic in the future by calling `ScheduleService.isBarberWorkingAt()`.

## Example Usage

### Setting Working Hours

```bash
curl -X POST http://localhost:3000/api/schedule/working-hours \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "shop-123",
    "barberId": "barber-456",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "17:00"
  }'
```

### Creating Time Off

```bash
curl -X POST http://localhost:3000/api/schedule/timeoff \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "shop-123",
    "barberId": "barber-456",
    "startAt": "2025-12-25T00:00:00Z",
    "endAt": "2025-12-26T00:00:00Z",
    "reason": "Christmas Holiday"
  }'
```

### Checking Availability

```bash
curl "http://localhost:3000/api/schedule/is-working?shopId=shop-123&barberId=barber-456&at=2025-12-20T14:00:00Z&shopTimeZone=America/Los_Angeles"

# Response: { "working": true }
```

## Notes

- All times are stored in UTC for time-off records
- Working hours use local shop time in "HH:mm" format
- The `isBarberWorkingAt` method handles timezone conversion automatically
- One working hours record per day per barber (upsert logic in `setWorkingHours`)
