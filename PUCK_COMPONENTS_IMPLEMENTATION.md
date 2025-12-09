# Puck Data-Driven Components Implementation

## Overview
Added two new data-driven Puck components to the page builder: `ServicesSection` and `BookingCtaSection`.

**Branch**: `claude/puck-services-booking-blocks-tyler`

## Components Created

### 1. ServicesSection
**Location**: `apps/tyler-site/src/components/webbuilder/ServicesSection.tsx`

**Purpose**: Displays services fetched from the backend API

**Props**:
- `title` (string): Section heading
- `subtitle` (string): Optional subtitle/description
- `layout` ('grid' | 'list'): Display layout
- `limit` (number): Max services to show
- `showPrices` (boolean): Display service prices
- `showDuration` (boolean): Display service duration

**Features**:
- Fetches from `/api/services?shopId=${SHOP_ID}`
- Loading and error states
- Empty state handling
- Grid layout (responsive 1/2/3 columns)
- List layout (stacked vertical)
- Price formatting with currency
- Duration display in minutes
- Tailwind CSS styling

**API Dependencies**:
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL
- `NEXT_PUBLIC_SHOP_ID` - Shop identifier

### 2. BookingCtaSection
**Location**: `apps/tyler-site/src/components/webbuilder/BookingCtaSection.tsx`

**Purpose**: Call-to-action section for booking appointments

**Props**:
- `title` (string): CTA heading
- `subtitle` (string): Supporting text
- `buttonLabel` (string): Button text
- `bookingHref` (string): Fallback navigation URL
- `scrollTargetId` (string): Optional element ID to scroll to

**Features**:
- Priority: Smooth scroll to element ID if provided
- Fallback: Navigate to bookingHref using Next.js router
- Gradient purple/blue background
- Hover effects and transitions
- Responsive padding and sizing
- Center-aligned content

## Puck Configuration

Both components are registered in `apps/tyler-site/app/admin/builder/page.tsx`:

```tsx
config.components = {
  ServicesSection: {
    fields: {
      title: { type: 'text' },
      subtitle: { type: 'textarea' },
      layout: { type: 'radio', options: ['grid', 'list'] },
      limit: { type: 'number' },
      showPrices: { type: 'radio', options: [true, false] },
      showDuration: { type: 'radio', options: [true, false] },
    },
    defaultProps: {
      title: 'Our Services',
      subtitle: '',
      layout: 'grid',
      limit: 6,
      showPrices: true,
      showDuration: true,
    },
  },
  BookingCtaSection: {
    fields: {
      title: { type: 'text' },
      subtitle: { type: 'textarea' },
      buttonLabel: { type: 'text' },
      bookingHref: { type: 'text' },
      scrollTargetId: { type: 'text' },
    },
    defaultProps: {
      title: 'Ready for a fresh cut?',
      subtitle: 'Book your next appointment in a few clicks.',
      buttonLabel: 'Book Now',
      bookingHref: '/booking',
      scrollTargetId: '',
    },
  },
}
```

## Usage in Admin Builder

1. Open builder: `http://localhost:3000/admin/builder`
2. Drag "ServicesSection" or "BookingCtaSection" from component palette
3. Configure properties in right sidebar
4. Save draft, preview, or publish

## Public Page Rendering

Components render on public pages at:
- Static: `http://localhost:3000/[slug]`
- Dynamic: `apps/tyler-site/app/[slug]/page.tsx`

The `[slug]/page.tsx` fetches page data from `/api/pages/slug/[slug]` and renders Puck components.

## Testing Checklist

- [ ] ServicesSection appears in component palette
- [ ] ServicesSection fetches services from backend
- [ ] Grid layout displays correctly (3 columns desktop)
- [ ] List layout displays correctly (stacked)
- [ ] Loading state shows during fetch
- [ ] Error state shows if API fails
- [ ] Empty state shows if no services
- [ ] Price formatting works (USD with decimals)
- [ ] Duration formatting works (minutes)
- [ ] BookingCtaSection appears in component palette
- [ ] Scroll to element ID works (if provided)
- [ ] Navigation to bookingHref works (fallback)
- [ ] Save draft persists component data
- [ ] Publish updates public page
- [ ] Preview opens in new tab with correct data

## Environment Variables Required

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SHOP_ID=your-shop-id
```

## Backend API Requirements

**Endpoint**: `GET /api/services?shopId={shopId}`

**Expected Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "price": 2500,  // cents
    "duration": 30  // minutes
  }
]
```

## Files Modified/Created

**Created**:
- `apps/tyler-site/src/components/webbuilder/ServicesSection.tsx` (151 lines)
- `apps/tyler-site/src/components/webbuilder/BookingCtaSection.tsx` (63 lines)
- `PUCK_COMPONENTS_IMPLEMENTATION.md` (this file)

**Modified**:
- `apps/tyler-site/app/admin/builder/page.tsx` - Added imports and config

## Notes

- Components are client-side only (`'use client'` directive)
- ServicesSection uses `useEffect` for data fetching
- Error handling includes both network errors and JSON parse errors
- All styling uses Tailwind utility classes
- No external dependencies beyond Next.js and React

## Future Enhancements

- Add caching for services data
- Support filtering by service category
- Add image support for services
- Support custom color schemes via props
- Add animation options for CTA button
- Support multiple CTA buttons
- Add testimonials integration
