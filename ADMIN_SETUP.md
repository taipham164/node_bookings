# Admin Dashboard Setup Guide

## Overview

The admin dashboard provides comprehensive management tools for your barbershop including:

- **Dashboard**: Real-time overview of appointments, revenue, and customer stats
- **Appointments**: Manage, reschedule, and cancel appointments
- **Customers**: View customer history and manage customer data
- **Staff**: Monitor staff schedules and performance
- **Services**: Manage service catalog and pricing
- **Inventory**: Track supplies and products
- **Reports**: View analytics and financial reports
- **Settings**: Configure business settings

## Features

### Dashboard
- Today's appointment count and status breakdown
- Real-time revenue tracking
- Customer base statistics
- Upcoming appointments preview
- Quick action buttons

### Appointment Management
- View all appointments with filtering
- Filter by date, status, and staff
- Reschedule appointments
- Cancel appointments with reasons
- View appointment details and customer info

### Customer Management
- Full customer directory
- Search customers by name, email, or phone
- View customer history and appointments
- Track customer contact preferences
- Customer statistics

### Staff Management
- View all staff members
- Monitor staff schedules
- Track performance metrics
- View customer satisfaction ratings
- Manage staff availability

### Service Management
- View all services with pricing
- Service duration tracking
- Pricing management
- Service categorization

### Inventory Management
- Track barbershop supplies
- Monitor stock levels
- Get low-stock alerts
- Common barbershop supply categories:
  - Razors & Clippers
  - Hair Products
  - Styling Products
  - Cleaning Supplies
  - Accessories
  - Beverages

### Reports
- Daily, weekly, and monthly reports
- Revenue analytics
- Appointment completion rates
- Cancellation rates
- Customer acquisition metrics
- Export to CSV

## Access Control

The admin system uses role-based access control (RBAC):

### Roles

**Super Administrator** (`super_admin`)
- Full access to all features
- Can manage admin users
- Can manage settings
- Can perform all actions

**Manager** (`manager`)
- Dashboard access
- Appointment management (view, create, edit, reschedule, cancel)
- Customer management (view, create, edit)
- Staff availability management
- Inventory management
- View reports
- Cannot modify settings or manage admin users

**Staff** (`staff`)
- Limited access
- Can view own appointments
- Can view customer information
- Read-only access to services and inventory

**Customer** (`customer`)
- No admin access
- Can only book appointments and view own data

## Setup Instructions

### 1. Firebase Configuration

The admin system uses Firebase Authentication for secure user management. You need to:

1. Set up a Firebase project
2. Enable Authentication with Email/Password
3. Set up Firestore database
4. Configure environment variables

**Environment Variables Required:**
```env
# Firebase Admin SDK (choose one option)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...} # JSON string
# OR
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Optional: Default admin credentials
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=securepassword123
```

### 2. Initial Admin Setup

**Option A: Automatic Setup (Recommended)**
The system automatically creates a default super admin on first startup:
- Email: `admin@barbershop.com` (or `DEFAULT_ADMIN_EMAIL`)
- Password: `admin123` (or `DEFAULT_ADMIN_PASSWORD`)

**Option B: Manual Setup via UI**
1. Visit `/admin/login`
2. Click "Initial Setup (First Time)"
3. Create your first super admin account

**Option C: API Setup**
```javascript
POST /auth/admin/setup
{
  "email": "admin@yourdomain.com",
  "password": "securepassword",
  "displayName": "Super Administrator"
}
```

### 3. Access Admin Dashboard

1. Go to `/admin/login`
2. Sign in with your Firebase admin credentials
3. Access the admin dashboard at `/admin`

### 4. Admin Routes

**Authentication Routes:**
| Route | Description |
|-------|-------------|
| `/admin/login` | Admin login page |
| `/auth/admin/firebase/verify` | Firebase token verification |
| `/auth/admin/logout` | Admin logout |
| `/auth/admin/me` | Current user info |
| `/auth/admin/users` | List admin users (super admin) |
| `/auth/admin/users` (POST) | Create admin user (super admin) |
| `/auth/admin/setup` | Initial setup |

**Dashboard Routes:**
| Route | Description |
|-------|-------------|
| `/admin` | Dashboard home |
| `/admin/appointments` | Appointment management |
| `/admin/appointments/:id` | Appointment details |
| `/admin/customers` | Customer directory |
| `/admin/customers/:id` | Customer details |
| `/admin/staff` | Staff management |
| `/admin/services` | Service catalog |
| `/admin/inventory` | Inventory management |
| `/admin/reports` | Analytics and reports |
| `/admin/settings` | Admin settings |

## Permissions Matrix

### Super Admin
```
✅ Dashboard: View
✅ Appointments: View, Create, Edit, Delete, Reschedule, Cancel
✅ Customers: View, Create, Edit, Delete
✅ Staff: View, Manage Availability
✅ Services: View, Create, Edit, Delete
✅ Inventory: View, Create, Edit, Delete
✅ Reports: View, Export
✅ Settings: View, Edit
✅ Payments: View, Refund
✅ Admin Users: View, Create, Edit, Delete
```

### Manager
```
✅ Dashboard: View
✅ Appointments: View, Create, Edit, Reschedule, Cancel
✅ Customers: View, Create, Edit
✅ Staff: View, Manage Availability
✅ Services: View
✅ Inventory: View, Create, Edit
✅ Reports: View, Export
✅ Settings: View
✅ Payments: View
❌ Admin Users: (No Access)
```

### Staff
```
❌ Dashboard: (No Access)
✅ Appointments: View
✅ Customers: View
✅ Services: View
❌ All Other Features: (No Access)
```

## Key Features

### Real-Time Dashboard
- Automatic time updates
- Live appointment counter
- Revenue tracking from completed appointments
- Customer base overview

### Smart Filtering
- Filter appointments by date
- Filter by appointment status
- Filter by staff member
- Search customers by name, email, or phone

### Appointment Management
- Quick reschedule functionality
- One-click cancellation
- View detailed appointment info
- Track appointment history

### Performance Analytics
- Completion rate calculation
- Cancellation rate tracking
- Average service value
- Customer satisfaction metrics

### Responsive Design
- Works on desktop, tablet, and mobile
- Sidebar navigation
- Collapsible menus on mobile
- Mobile-optimized tables

## Customization

### Adding Custom Metrics

To add custom metrics to the dashboard, edit `util/admin-stats.js`:

```javascript
async function getCustomMetric() {
  // Your custom logic here
  return customValue;
}
```

Then update the dashboard template to display it.

### Custom Inventory Items

Edit `views/pages/admin/inventory.ejs` to add specific inventory categories for your shop.

### Custom Reports

Add new report types in `/admin/reports` by creating report generation functions.

## Firebase Security Features

- **Firebase Authentication**: Industry-standard OAuth2/JWT tokens
- **Role-based Access Control**: Stored in Firestore with custom claims
- **Session Management**: Server-side validation with Firebase ID tokens
- **Permission Checking**: Granular permissions on every route
- **Audit Trail**: All admin actions logged with user context
- **Rate Limiting**: Applied to all admin endpoints
- **CSRF Protection**: Enabled for all forms
- **Secure Sessions**: 24-hour expiration with httpOnly cookies

## Data Storage

**Firebase Auth Users**: Core authentication data
**Firestore Collection** (`admin_users`): Extended admin profiles
```javascript
{
  uid: "firebase-user-id",
  email: "admin@example.com",
  displayName: "John Doe",
  phoneNumber: "+1234567890",
  role: "super_admin", // super_admin, manager, staff
  status: "active", // active, inactive, suspended
  permissions: { dashboard: true, appointments: [...] },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginAt: Timestamp,
  createdBy: "creator-uid",
  notes: "Additional notes"
}
```

## Troubleshooting

### Firebase Authentication Issues
- Check Firebase project configuration
- Verify service account credentials
- Ensure Firestore database is created
- Check Firebase console for user accounts

### Can't Access Admin Dashboard
- Verify Firebase user exists and is enabled
- Check that admin profile exists in Firestore
- Ensure user has appropriate role/status
- Clear browser cache and cookies
- Check browser console for authentication errors

### Initial Setup Issues
- Verify no existing super admin users
- Check Firebase project permissions
- Ensure Firestore write permissions
- Check server logs for initialization errors

### Permission Denied Errors
- Verify user role in Firestore
- Check permission configuration
- Ensure user status is "active"
- Review server logs for permission checks

## Firebase Setup Instructions

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing
3. Enable Authentication > Sign-in method > Email/Password
4. Create Firestore Database in production mode

### 2. Generate Service Account
1. Go to Project Settings > Service Accounts
2. Generate new private key
3. Save JSON file securely
4. Set environment variable or use Google Application Credentials

### 3. Configure Client-Side Firebase
Update the Firebase config in `/views/pages/admin/login.ejs`:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 4. Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin users collection - only readable by authenticated admin users
    match /admin_users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.token.admin == true;
    }
    
    // Other collections...
  }
}
```

## Best Practices

1. **Firebase Security**: 
   - Use service account with minimal permissions
   - Enable MFA for Firebase console access
   - Regularly rotate service account keys
   - Monitor Firebase usage and costs

2. **Admin Management**: 
   - Create manager accounts for assistant managers
   - Regular review of admin user access
   - Document role assignments and changes
   - Use meaningful display names

3. **System Maintenance**:
   - Check reports weekly to track trends
   - Monitor Firebase Auth usage
   - Regular backups of Firestore data
   - Keep inventory updated regularly

4. **Security**: 
   - Change SESSION_SECRET regularly in production
   - Monitor admin login attempts
   - Review permission changes in logs
   - Enable Firebase audit logging

## Support

For issues or feature requests, refer to the main README.md and IMPROVEMENTS_NEEDED.md files.
