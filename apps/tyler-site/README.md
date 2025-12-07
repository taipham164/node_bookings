# Tyler's Barbershop Marketing Site

This is the marketing website for Tyler's Barbershop, built with **Next.js 15**, **React Bricks** (visual CMS), and **Tailwind CSS**.

## Features

- 🎨 **Visual Page Builder** - Edit pages visually with React Bricks
- 🧱 **Custom Bricks** - Pre-built components for barbershop content
- 📱 **Responsive** - Mobile-first design with Tailwind CSS
- ⚡ **Fast** - Built on Next.js 15 with App Router
- 🎯 **Booking Integration Ready** - Placeholder for backend booking system

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8.0.0
- React Bricks account ([sign up here](https://dashboard.reactbricks.com))

### Environment Setup

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure React Bricks:**
   - Go to [React Bricks Dashboard](https://dashboard.reactbricks.com)
   - Create a new app or use an existing one
   - Copy your App ID and API Key
   - Update `.env`:
     ```
     NEXT_PUBLIC_REACT_BRICKS_APP_ID=your_app_id_here
     REACT_BRICKS_API_KEY=your_api_key_here
     ```

### Installation

From the monorepo root:

```bash
# Install dependencies for all apps
pnpm install

# Or install only for tyler-site
pnpm install --filter tyler-site
```

### Development

```bash
# From monorepo root
pnpm dev:tyler-site

# Or from apps/tyler-site
pnpm dev
```

The site will be available at:
- **Public Site:** http://localhost:3000
- **Admin Editor:** http://localhost:3000/admin

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
│   ├── page.tsx                  # Home page (renders React Bricks content)
│   ├── [slug]/page.tsx           # Dynamic pages
│   ├── admin/[[...catchAll]]/    # React Bricks editor
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles with Tailwind
├── react-bricks/                 # React Bricks configuration
│   ├── config.ts                 # Main React Bricks config
│   ├── bricks.ts                 # Brick registry
│   └── bricks/                   # Custom brick components
│       ├── index.ts
│       ├── Hero.tsx              # Hero section brick
│       ├── TextImage.tsx         # Text + Image brick
│       ├── Testimonials.tsx      # Testimonials brick
│       ├── Gallery.tsx           # Image gallery brick
│       └── BookingSection.tsx    # Booking widget placeholder
├── public/                       # Static assets
├── .env.example                  # Environment template
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## Custom Bricks

### Available Bricks

1. **Hero** - Large header section with background image, title, and subtitle
2. **Text + Image** - Content section with text and image (configurable position)
3. **Testimonials** - Customer reviews/testimonials grid
4. **Gallery** - Image gallery grid for showcasing work
5. **BookingSection** - Placeholder for booking widget (coming soon)

### Creating Pages

1. Navigate to http://localhost:3000/admin
2. Click "Create Page" or edit an existing page
3. Add bricks by clicking the "+" button
4. Edit content directly in the visual editor
5. Click "Save" to publish changes

### Editing Bricks

Bricks are located in `react-bricks/bricks/`. Each brick:
- Is a React component implementing `types.Brick`
- Exports a `schema` object with metadata
- Uses React Bricks components (`Text`, `RichText`, `Image`, `Repeater`)
- Provides `getDefaultProps` with sensible defaults

Example brick structure:
```tsx
import { types, Text } from 'react-bricks/rsc'

const MyBrick: types.Brick = () => {
  return (
    <section>
      <Text propName="title" />
    </section>
  )
}

MyBrick.schema = {
  name: 'mybrick',
  label: 'My Brick',
  getDefaultProps: () => ({ title: 'Default Title' })
}

export default MyBrick
```

## Booking Integration (Future)

The `BookingSection` brick is currently a placeholder. Future implementation will:

1. **Import BookingWidget component** that connects to the backend API
2. **Backend Endpoints** (from `apps/backend`):
   - `GET /api/services` - List available services
   - `GET /api/barbers` - List barbers
   - `GET /api/availability` - Check time slot availability
   - `POST /api/appointments/bookings` - Create booking
3. **Features:**
   - Service selection
   - Barber selection
   - Real-time availability checking
   - Appointment booking
   - Payment integration (Square)
   - No-show prevention

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
NEXT_PUBLIC_REACT_BRICKS_APP_ID=your_app_id
REACT_BRICKS_API_KEY=your_api_key
```

### Deploy to Vercel

1. Connect your repository to Vercel
2. Set the root directory to `apps/tyler-site`
3. Add environment variables
4. Deploy!

## Learn More

- [React Bricks Documentation](https://docs.reactbricks.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Support

For issues or questions:
- React Bricks: [support@reactbricks.com](mailto:support@reactbricks.com)
- Project-specific: Create an issue in the repository
