# Shop Theme & Branding Module

## Overview
Complete theming system that allows shop owners to customize their brand identity across the entire platform. Theme settings are stored in the database and applied via CSS variables throughout the frontend.

**Branch**: `claude/shop-theme-branding-module-tyler`

---

## Database Schema

### ShopTheme Model
**Table**: `shop_themes`

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| shopId | String (unique) | Reference to shop |
| brandName | String? | Shop's brand name |
| tagline | String? | Brand tagline/slogan |
| primaryColor | String? | Primary brand color (hex) |
| accentColor | String? | Accent/CTA color (hex) |
| background | String? | "light" or "dark" theme |
| logoUrl | String? | URL to logo image |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Migration**: `20251209111728_add_shop_theme_model`

---

## Backend API

### Endpoints

#### `GET /api/shop-theme/:shopId`
Retrieves theme for a shop. If no theme exists, creates one with default values.

**Response**:
```json
{
  "id": "uuid",
  "shopId": "shop-uuid",
  "brandName": "My Shop",
  "tagline": "Quality service you can trust",
  "primaryColor": "#111827",
  "accentColor": "#f59e0b",
  "background": "light",
  "logoUrl": "",
  "createdAt": "2024-12-09T...",
  "updatedAt": "2024-12-09T..."
}
```

#### `PUT /api/shop-theme/:shopId`
Updates theme (or creates if doesn't exist) using upsert pattern.

**Request Body**:
```json
{
  "brandName": "Tyler's Barbershop",
  "tagline": "Premium cuts for the modern man",
  "primaryColor": "#1e293b",
  "accentColor": "#3b82f6",
  "background": "dark",
  "logoUrl": "https://example.com/logo.png"
}
```

### Files Created
```
apps/backend/src/shop-theme/
├── dto/
│   └── update-shop-theme.dto.ts      # Validation DTO
├── shop-theme.controller.ts          # API endpoints
├── shop-theme.service.ts             # Business logic
└── shop-theme.module.ts              # NestJS module
```

---

## Frontend Implementation

### CSS Variables
The theme system sets the following CSS variables on `document.documentElement`:

| Variable | Description | Default |
|----------|-------------|---------|
| `--tp-primary` | Primary brand color | `#111827` |
| `--tp-accent` | Accent/CTA color | `#f59e0b` |
| `--tp-bg` | Background color | `#ffffff` (light) or `#020617` (dark) |
| `--tp-text` | Text color | `#0f172a` (light) or `#f8fafc` (dark) |

### Files Created

#### 1. Theme Hook
**Path**: `apps/tyler-site/src/hooks/useShopTheme.ts`

```typescript
const { theme, isLoading, error, refetch } = useShopTheme();
```

- Fetches theme from API on mount
- Returns theme data with loading/error states
- Provides refetch function to reload theme

#### 2. Theme Provider
**Path**: `apps/tyler-site/src/components/theme/ShopThemeProvider.tsx`

```typescript
export function useShopThemeContext() {
  // Access theme anywhere in component tree
}
```

- Wraps app in React context
- Applies CSS variables when theme loads
- Provides theme data to all child components

#### 3. Admin Theme Editor
**Path**: `apps/tyler-site/app/admin/theme/page.tsx`

Features:
- Form fields for all theme properties
- Color pickers with hex input
- Live preview of color swatches
- Sample button preview
- Success/error messaging
- Save to backend with theme refetch

**Access**: `http://localhost:3000/admin/theme`

---

## Puck Component Integration

### ServicesSection
**New Props**:
- `useThemeColors?: boolean` (default: `true`) - Use theme accent color
- `customAccentColor?: string` - Override accent color

**Behavior**:
- Price text uses `var(--tp-accent)` when `useThemeColors` is true
- Falls back to `customAccentColor` or `#16a34a` (green) if specified

### BookingCtaSection
**New Props**:
- `useThemeColors?: boolean` (default: `true`) - Use theme colors
- `customPrimaryColor?: string` - Override primary color
- `customAccentColor?: string` - Override accent color

**Behavior**:
- Background gradient uses `var(--tp-primary)` to `var(--tp-accent)`
- Button text color uses `var(--tp-accent)`
- Custom colors override theme when specified

### Puck Config Updates
Both components now have additional fields in the builder:
- `useThemeColors` (radio: Yes/No)
- `customAccentColor` (text input for hex color)
- `customPrimaryColor` (text input for hex color - BookingCtaSection only)

---

## Usage Examples

### 1. Using Theme in Custom Components

```tsx
'use client';
import { useShopThemeContext } from '@/components/theme/ShopThemeProvider';

export function MyComponent() {
  const { theme, isLoading } = useShopThemeContext();
  
  if (isLoading) return <div>Loading theme...</div>;
  
  return (
    <div>
      <h1>{theme?.brandName}</h1>
      <p style={{ color: 'var(--tp-accent)' }}>{theme?.tagline}</p>
    </div>
  );
}
```

### 2. Using CSS Variables in Tailwind

```tsx
<button className="bg-[color:var(--tp-accent)] text-white px-4 py-2">
  Book Now
</button>
```

### 3. Using CSS Variables in Inline Styles

```tsx
<div style={{
  background: 'var(--tp-primary)',
  color: 'var(--tp-text)',
}}>
  Content
</div>
```

---

## Testing Checklist

### Backend
- [ ] GET `/api/shop-theme/:shopId` returns default theme if none exists
- [ ] GET `/api/shop-theme/:shopId` returns existing theme
- [ ] PUT `/api/shop-theme/:shopId` creates theme if doesn't exist
- [ ] PUT `/api/shop-theme/:shopId` updates existing theme
- [ ] Validation works (all fields optional, strings only)
- [ ] shopId unique constraint prevents duplicates

### Frontend
- [ ] ShopThemeProvider loads theme on mount
- [ ] CSS variables are set on document.documentElement
- [ ] Theme updates when refetch() is called
- [ ] useShopThemeContext throws error outside provider
- [ ] Theme hook handles API errors gracefully

### Admin Theme Editor
- [ ] Page loads at `/admin/theme`
- [ ] Form populates with current theme values
- [ ] Color pickers work and update hex inputs
- [ ] Hex inputs update color pickers
- [ ] Preview shows selected colors
- [ ] Save button updates backend
- [ ] Success message appears after save
- [ ] Theme updates immediately after save (CSS vars change)
- [ ] Navigation link to builder works

### Puck Components
- [ ] ServicesSection uses theme accent color by default
- [ ] ServicesSection respects useThemeColors=false
- [ ] ServicesSection uses customAccentColor when provided
- [ ] BookingCtaSection uses theme gradient by default
- [ ] BookingCtaSection respects useThemeColors=false
- [ ] BookingCtaSection uses custom colors when provided
- [ ] Puck builder shows new theme fields
- [ ] Theme fields save/load correctly

### Integration
- [ ] Theme persists across page reloads
- [ ] Theme applies to both admin and public pages
- [ ] Multiple shops can have different themes (if multi-tenant)
- [ ] Theme changes don't break existing pages
- [ ] Booking/payment flows still work

---

## Environment Variables Required

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SHOP_ID=your-shop-id
```

---

## Default Theme Values

When a shop has no theme, the system creates one with:

```json
{
  "brandName": "My Shop",
  "tagline": "Quality service you can trust",
  "primaryColor": "#111827",  // Gray-900
  "accentColor": "#f59e0b",   // Amber-500
  "background": "light",
  "logoUrl": ""
}
```

---

## Files Modified

**Backend**:
- `apps/backend/prisma/schema.prisma` - Added ShopTheme model
- `apps/backend/src/app.module.ts` - Imported ShopThemeModule

**Frontend**:
- `apps/tyler-site/app/layout.tsx` - Wrapped with ShopThemeProvider
- `apps/tyler-site/app/admin/builder/page.tsx` - Added theme link and updated Puck config
- `apps/tyler-site/src/components/webbuilder/ServicesSection.tsx` - Added theme support
- `apps/tyler-site/src/components/webbuilder/BookingCtaSection.tsx` - Added theme support

---

## Architecture Decisions

### Why CSS Variables?
- Global scope - accessible anywhere in the app
- No prop drilling required
- Works with Tailwind, inline styles, and CSS modules
- Updates immediately without re-render
- Compatible with SSR/SSG

### Why Upsert Pattern?
- Simpler API - single endpoint for create/update
- No need to check existence before update
- Idempotent - safe to call multiple times
- Better DX - fewer error cases to handle

### Why Optional Fields?
- Allows partial branding
- Shop can start with defaults and customize incrementally
- Easier migration for existing shops
- Fields can be nullable in database

### Why Theme Override Props?
- Individual components can break from theme
- Useful for A/B testing or special sections
- Maintains flexibility while encouraging consistency
- Easy to remove overrides later

---

## Future Enhancements

### Short Term
- [ ] Add font family selection
- [ ] Support custom CSS for advanced users
- [ ] Add theme presets (e.g., "Modern", "Classic", "Bold")
- [ ] Image upload for logo (currently URL only)
- [ ] Dark mode toggle in theme editor

### Medium Term
- [ ] Multiple theme variants per shop (e.g., "Summer", "Holiday")
- [ ] Theme scheduling (activate theme at specific date/time)
- [ ] Color palette generator (suggest complementary colors)
- [ ] Theme preview without saving
- [ ] Export/import theme JSON

### Long Term
- [ ] Per-page theme overrides
- [ ] Component-level theme customization in Puck
- [ ] Theme marketplace (share/buy themes)
- [ ] Advanced typography controls
- [ ] Animation preferences
- [ ] Accessibility contrast checker

---

## Troubleshooting

### CSS Variables Not Applying
1. Check browser DevTools: `document.documentElement.style`
2. Verify ShopThemeProvider wraps your component
3. Check Network tab for successful theme API call
4. Ensure NEXT_PUBLIC_SHOP_ID is set correctly

### Theme Not Updating
1. Call `refetch()` from useShopThemeContext
2. Hard refresh browser (Cmd+Shift+R)
3. Check if theme was saved to backend
4. Verify shopId matches between frontend and backend

### TypeScript Errors
1. Restart TypeScript server in VS Code
2. Check tsconfig.json paths configuration
3. Ensure @/ alias points to correct directory
4. Run `pnpm install` to update dependencies

### Backend Errors
1. Ensure Prisma migration ran successfully
2. Check DATABASE_URL in .env
3. Verify ShopThemeModule imported in AppModule
4. Check logs for validation errors

---

## Performance Considerations

- Theme is fetched once on app mount
- CSS variables update via DOM manipulation (very fast)
- No re-renders required when theme changes
- Puck components use inline styles (no CSS recalculation)
- Default theme creation is automatic and cached

---

## Security Notes

- No authentication on theme endpoints (add JwtAuthGuard if needed)
- Validate hex color format to prevent XSS
- Sanitize logoUrl to prevent injection attacks
- Rate limit PUT endpoint to prevent abuse
- Consider adding shop ownership validation

---

## Maintenance

### Database
- ShopTheme table is indexed on shopId (unique)
- No foreign key to Shop model (loose coupling)
- Safe to delete theme without affecting shop

### API
- GET endpoint is idempotent
- PUT endpoint uses upsert (safe for concurrent requests)
- No cascading deletes

### Frontend
- Provider manages theme state globally
- Components use CSS variables (no direct state)
- Refetch function available for manual refresh

---

## Related Documentation
- [PUCK_COMPONENTS_IMPLEMENTATION.md](../PUCK_COMPONENTS_IMPLEMENTATION.md) - Puck components overview
- [README.md](../README.md) - Project setup and development
- [apps/backend/IMPLEMENTATION_SUMMARY.md](../apps/backend/IMPLEMENTATION_SUMMARY.md) - Backend architecture
