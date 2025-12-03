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

### 1. Enable Admin Access

Currently, admin access is controlled through the `role` field in the user session. To set a user as admin:

```javascript
req.session.authenticatedCustomer.role = "super_admin"; // or "manager", "staff"
```

### 2. Create an Admin User (Manual Setup)

For development/testing, you can manually set admin role:

1. Log in with your customer account
2. In browser console, execute:
```javascript
// In browser DevTools console:
// This sets your session to admin (for testing only)
fetch('/api/set-admin-role', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log(d));
```

### 3. Access Admin Dashboard

Once set as admin, visit:
```
https://yourdomain.com/admin
```

### 4. Admin Routes

Available admin routes:

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

## Security Notes

- All admin routes require authentication
- Permissions are checked on every request
- Sessions expire after 24 hours
- CSRF protection enabled
- Rate limiting applied to all admin endpoints
- Sensitive data is masked in logs

## Troubleshooting

### Can't Access Admin Dashboard
- Verify you're logged in as customer first
- Check that your role is set to `super_admin` or `manager`
- Clear browser cache and cookies
- Check console for error messages

### Missing Appointment Data
- Ensure your Square API credentials are correct
- Check that appointments exist in your Square account
- Verify location ID is correct

### Performance Issues
- Admin stats are cached for better performance
- Clear browser cache if data seems stale
- Check network tab for slow API calls

## Best Practices

1. **Delegate Management**: Create manager accounts for assistant managers
2. **Regular Reviews**: Check reports weekly to track trends
3. **Inventory**: Keep inventory updated regularly
4. **Backups**: Regularly export reports for record-keeping
5. **Security**: Change SESSION_SECRET regularly in production

## Support

For issues or feature requests, refer to the main README.md and IMPROVEMENTS_NEEDED.md files.
