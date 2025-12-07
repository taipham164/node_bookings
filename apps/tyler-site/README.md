# Tyler's Barbershop Marketing Site

This is the marketing website for Tyler's Barbershop, built with **Next.js 15**, **GrapesJS** (visual page builder), and **Tailwind CSS**.

## Features

- 🎨 **Visual Page Builder** - Edit pages visually with GrapesJS
- 🔌 **Backend Integration** - Pages stored in PostgreSQL via Prisma
- 📅 **Booking Widget** - Integrated appointment booking system
- 📱 **Responsive** - Mobile-first design
- ⚡ **Fast** - Built on Next.js 15 with App Router
- 🎯 **Custom Blocks** - Including a special Booking Widget block

## Architecture

This app is part of a monorepo with:
- **apps/backend** - NestJS + Prisma + Postgres for API & booking system
- **apps/tyler-site** - Next.js frontend with GrapesJS page builder

Pages are created in the GrapesJS editor, saved to the backend database, and rendered on the public site.

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8.0.0
- PostgreSQL database (for apps/backend)
- Backend server running at http://localhost:3001

### Environment Setup

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables:**
   Update `.env`:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
   NEXT_PUBLIC_SHOP_ID=your-shop-id
   ```

### Installation

From the monorepo root:

```bash
# Install dependencies for all apps
pnpm install

# Or install only for tyler-site
pnpm install --filter tyler-site
```

### Running the Application

**You need to run both backend and tyler-site:**

```bash
# Terminal 1: Start the backend
pnpm dev:backend

# Terminal 2: Start tyler-site
pnpm dev:tyler-site
```

The site will be available at:
- **Public Site:** http://localhost:3000
- **Page Builder:** http://localhost:3000/admin/builder

### Building for Production

```bash
# From monorepo root
pnpm build:tyler-site

# Then start the production server
pnpm start:tyler-site
```

## Project Structure

```
tyler-site/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home page (fetches from backend)
│   ├── [slug]/page.tsx           # Dynamic pages
│   ├── admin/builder/            # GrapesJS page builder
│   │   └── page.tsx
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles with Tailwind
├── components/
│   └── booking/                  # Booking components
│       ├── BookingWidget.tsx     # Booking form component
│       └── BookingHydrator.tsx   # Hydrates booking widgets on pages
├── public/                       # Static assets
├── .env.example                  # Environment template
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## Using the Page Builder

### Creating/Editing the Home Page

1. Navigate to http://localhost:3000/admin/builder
2. Use the GrapesJS visual editor to design your page
3. Drag blocks from the left sidebar
4. Click elements to edit them
5. Use the right sidebar to adjust styles
6. Click "Save Page" to persist changes

### Available Blocks

The page builder includes several standard blocks:
- **Section** - Container section
- **Text** - Text content
- **Image** - Images
- **Booking Widget** ⭐ - Interactive appointment booking form

### How the Booking Widget Works

1. In the GrapesJS editor, drag the "Booking Widget" block onto your page
2. The block will show a placeholder in the editor
3. When you save and view the live site, the `BookingHydrator` component finds all `[data-booking-widget="true"]` elements
4. It replaces them with the live React `BookingWidget` component
5. The widget connects to your backend API to show services, barbers, and handle bookings

This architecture allows:
- Visual page design with GrapesJS
- Dynamic React components (booking) mounted in the right places
- All page content stored in your own database

## Backend API Endpoints

The tyler-site communicates with these backend endpoints:

### Page Management
- `GET /api/pages?shopId={shopId}` - List all pages
- `GET /api/pages/{shopId}/home` - Get home page
- `GET /api/pages/{slug}?shopId={shopId}` - Get page by slug
- `POST /api/pages` - Create new page
- `PUT /api/pages/{id}` - Update page
- `DELETE /api/pages/{id}` - Delete page

### Booking System
- `GET /api/services?shopId={shopId}` - List services
- `GET /api/barbers?shopId={shopId}` - List barbers
- `GET /api/availability` - Check availability
- `POST /api/appointments/bookings` - Create booking

## Booking Widget Integration

The BookingWidget component (`components/booking/BookingWidget.tsx`) provides:
- Service selection dropdown
- Barber selection dropdown
- Future: Time slot selection
- Future: Payment integration
- Future: Confirmation flow

It's a fully client-side React component that gets mounted into the server-rendered HTML wherever `[data-booking-widget="true"]` appears.

## How It Works

1. **Editor Flow:**
   - Admin visits `/admin/builder`
   - GrapesJS loads existing page HTML from backend
   - Admin edits visually
   - Click "Save" → HTML + CSS sent to backend → stored in Postgres

2. **Public Site Flow:**
   - User visits `/` or `/[slug]`
   - Next.js fetches page HTML from backend
   - Server renders HTML with `dangerouslySetInnerHTML`
   - Client-side `BookingHydrator` finds booking widget placeholders
   - Hydrates them with interactive React components

## Scripts

From the monorepo root:

```bash
pnpm dev:tyler-site        # Start dev server
pnpm build:tyler-site      # Build for production
pnpm start:tyler-site      # Start production server
pnpm lint:tyler-site       # Run ESLint
```

From `apps/tyler-site`:

```bash
pnpm dev                   # Start dev server
pnpm build                 # Build for production
pnpm start                 # Start production server
pnpm lint                  # Run ESLint
```

## Deployment

### Environment Variables

Ensure these are set in your deployment environment:

```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-api.com
NEXT_PUBLIC_SHOP_ID=your-shop-id
```

### Deploy to Vercel

1. Connect your repository to Vercel
2. Set the root directory to `apps/tyler-site`
3. Add environment variables
4. Deploy!

Make sure your backend is also deployed and accessible at the `NEXT_PUBLIC_API_BASE_URL`.

## Development Notes

- The GrapesJS editor only works client-side (uses `'use client'`)
- Page content is cached for 60 seconds (`revalidate: 60`)
- The booking widget is hydrated on the client after initial page load
- All pages are stored in the backend Postgres database

## Learn More

- [GrapesJS Documentation](https://grapesjs.com/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Support

For issues or questions, create an issue in the repository.
