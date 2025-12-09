# Tyler Platform - Monorepo

This monorepo contains Tyler's Barbershop booking platform with a visual page builder, booking system, and Square integration.

## 📦 Apps

- **apps/tyler-site** - Marketing website with Puck visual page builder (Next.js 15 + Tailwind)
- **apps/backend** - Booking API (NestJS + Prisma + PostgreSQL + Square)
- **apps/legacy-express** - Legacy Express booking app (reference only)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8.0.0 (install via `corepack enable`)
- Docker & Docker Compose (for PostgreSQL)
- Square API credentials (sandbox or production)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://tyler:0909191473@localhost:5432/tyler_bookings"

# JWT Authentication (generate with: openssl rand -hex 64)
JWT_SECRET="your-secure-random-jwt-secret-at-least-32-characters"

# Square API
SQ_ENVIRONMENT="sandbox"  # or "production"
SQ_ACCESS_TOKEN="your-square-access-token"
SQ_LOCATION_ID="your-square-location-id"

# Next.js Frontend
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
NEXT_PUBLIC_SHOP_ID="default-shop-id"
```

### 3. Start PostgreSQL Database

```bash
docker compose up -d
```

### 4. Run Database Migrations

```bash
pnpm --filter backend run prisma:migrate:deploy
npx prisma generate --schema=apps/backend/prisma/schema.prisma
```

### 5. Start the Backend

```bash
pnpm dev:backend
```

Backend will be available at http://localhost:3001

### 6. Start the Frontend

In a new terminal:

```bash
pnpm dev:tyler-site
```

Frontend will be available at:
- **Public Site:** http://localhost:3000
- **Page Builder:** http://localhost:3000/admin/builder

## 📚 Documentation

For detailed setup and development guides, see:
- [Tyler Site README](apps/tyler-site/README.md) - Frontend with Puck page builder
- Backend docs - NestJS API with Square integration

## 🛠️ Development Scripts

### All Workspaces

```bash
pnpm install              # Install all dependencies
```

### Frontend (tyler-site)

```bash
pnpm dev:tyler-site       # Start development server (http://localhost:3000)
pnpm build:tyler-site     # Build for production
pnpm start:tyler-site     # Start production server
pnpm lint:tyler-site      # Run ESLint
```

### Backend

```bash
pnpm dev:backend          # Start development server (http://localhost:3001)
pnpm build:backend        # Build TypeScript
pnpm start:backend        # Start production server
pnpm test:backend         # Run tests
```

### Database Management

```bash
# From backend directory
cd apps/backend

# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
pnpm run prisma:migrate:deploy

# Open Prisma Studio (database GUI)
pnpm run prisma:studio

# Reset database (WARNING: deletes all data)
pnpm run prisma:reset
```

### Docker

```bash
# Start PostgreSQL container
docker compose up -d

# Stop container
docker compose down

# Stop and remove volumes (deletes data)
docker compose down -v

# View logs
docker compose logs -f postgres
```

## 🏗️ Project Structure

```
tyler-platform/
├── apps/
│   ├── backend/          # NestJS API server
│   │   ├── src/
│   │   │   ├── appointment/    # Booking management
│   │   │   ├── auth/           # JWT authentication
│   │   │   ├── webbuilder/     # Page management
│   │   │   ├── square/         # Square API integration
│   │   │   └── prisma/         # Database service
│   │   └── prisma/
│   │       ├── schema.prisma   # Database schema
│   │       └── migrations/     # Migration history
│   │
│   ├── tyler-site/       # Next.js frontend
│   │   ├── app/
│   │   │   ├── admin/builder/  # Puck page editor
│   │   │   ├── [slug]/         # Dynamic pages
│   │   │   └── page.tsx        # Home page
│   │   └── components/
│   │       └── booking/        # Booking widgets
│   │
│   └── legacy-express/   # Legacy Express app (reference)
│
├── docker-compose.yml    # PostgreSQL container
├── package.json          # Workspace scripts
├── pnpm-workspace.yaml   # pnpm workspace config
└── README.md             # This file
```

## 🔗 Useful Links

* [Square Node.js SDK](https://developer.squareup.com/docs/sdks/nodejs)
* [Square Bookings API](https://developer.squareup.com/docs/bookings-api/what-it-is)
* [Prisma Documentation](https://www.prisma.io/docs)
* [NestJS Documentation](https://docs.nestjs.com)
* [Next.js Documentation](https://nextjs.org/docs)
* [Puck Page Builder](https://puckeditor.com)

## ⚠️ Known Issues

1. **TypeScript Errors in Backend**: 53 compilation errors from Prisma schema mismatches in:
   - `CatalogModule` - Missing Service fields (description, squareItemId, active)
   - `ScheduleModule` - Missing models (BarberWorkingHours, BarberTimeOff)
   - `CustomerCRMModule` - Missing models (CustomerNote, CustomerFlag, CustomerTag)
   
   These modules are temporarily disabled in `app.module.ts`. Re-enable after schema updates.

2. **Authentication Disabled**: JWT guards temporarily commented out in `page.controller.ts` for development. Re-enable before production.

3. **Missing @types/body-parser**: Install with `pnpm add -D @types/body-parser --filter backend` if needed.

## � Troubleshooting

### Backend won't start

**TypeScript compilation errors:**
- The backend has known TypeScript errors from Prisma schema mismatches
- These modules are temporarily disabled: CatalogModule, ScheduleModule, CustomerCRMModule
- Backend still runs with these errors in watch mode (`pnpm dev:backend`)
- Or start with pre-compiled code: `cd apps/backend && node dist/main.js`

**Database connection failed:**
```bash
# Check if PostgreSQL is running
docker compose ps

# Restart the database
docker compose restart postgres

# Check logs
docker compose logs postgres
```

**Port 3001 already in use:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process (replace PID with actual process ID)
kill -9 PID
```

### Frontend issues

**Failed to fetch from backend:**
- Ensure backend is running on http://localhost:3001
- Check CORS settings in `apps/backend/src/main.ts`
- Verify `NEXT_PUBLIC_API_BASE_URL` in `.env`

**Port 3000 already in use:**
```bash
# Find and kill process
lsof -i :3000
kill -9 PID
```

### Database issues

**Prisma Client errors:**
```bash
# Regenerate Prisma Client
cd apps/backend
npx prisma generate
```

**Migration conflicts:**
```bash
# Reset database (WARNING: deletes all data)
cd apps/backend
pnpm run prisma:reset
```

**Connection refused:**
- Check docker container is running: `docker compose ps`
- Verify DATABASE_URL in `.env` matches docker-compose.yml credentials

## 📝 TODO

- [ ] Fix Prisma schema to include all required models
- [ ] Re-enable CatalogModule, ScheduleModule, CustomerCRMModule  
- [ ] Implement JWT authentication in frontend
- [ ] Add payment processing to BookingWidget
- [ ] Create backend README documentation
- [ ] Add E2E tests
- [ ] Set up CI/CD pipeline

## 🧪 Legacy Express App

The `apps/legacy-express` folder contains the original Express.js booking application. It's kept for reference but is not actively maintained. The functionality has been migrated to the NestJS backend and Next.js frontend.

---

**Questions or issues?** Open an issue in the repository or check the app-specific READMEs for more details.