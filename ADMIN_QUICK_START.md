# Admin Dashboard Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Access the Admin Dashboard

Once logged in as a customer, navigate to:
```
http://localhost:3000/admin
```

### 2. Check Your Role

Your role determines what you can access:
- **Super Admin** (`super_admin`) - Full access
- **Manager** (`manager`) - Staff and appointment management
- **Staff** (`staff`) - Read-only access

### 3. Dashboard Overview

The admin dashboard shows:
- 📊 **Today's Appointments**: Total count with status breakdown
- 💵 **Revenue Tracking**: Total revenue from completed services
- 👥 **Customer Stats**: Total customers and contact info
- ⚠️ **Alerts**: Cancellations and no-shows
- 📅 **Upcoming Appointments**: Next 7 days preview

---

## 📋 Main Features

### 1. Manage Appointments (`/admin/appointments`)

**View All Appointments:**
- See all appointments for a selected date
- Filter by status (Pending, Confirmed, Completed, Cancelled, No-Show)
- Filter by staff member
- Click "Details" to see full appointment info

**Actions:**
- **Reschedule**: Change appointment time
- **Cancel**: Cancel with optional reason
- **View**: See customer and service details

### 2. Manage Customers (`/admin/customers`)

**Customer Directory:**
- Search by name, email, or phone number
- View complete customer list
- See customer creation date
- Track contact information

**Customer Profile:**
- Click customer name to view profile
- See full appointment history
- Review customer preferences
- Track booking patterns

### 3. Staff Management (`/admin/staff`)

**Staff Overview:**
- List all staff members
- View booking profiles
- Monitor performance metrics
- Check customer satisfaction ratings

**Performance Tracking:**
- Total services this month
- Customer satisfaction (4.8/5.0)
- Schedule management

### 4. Service Catalog (`/admin/services`)

**Available Services:**
- View all services with pricing
- Check service duration
- See service popularity
- Manage pricing (if permitted)

**Pricing:**
- Displayed in your local currency
- Duration shown in minutes/hours

### 5. Inventory Management (`/admin/inventory`)

**Common Barbershop Supplies:**
- 💇 **Razors & Clippers**: Professional tools
- 💆 **Hair Products**: Shampoos, conditioners
- 🧴 **Styling Products**: Gels, pomades
- 🧼 **Cleaning Supplies**: Disinfectants
- 🧣 **Accessories**: Towels, capes
- ☕ **Beverages**: Customer refreshments

**Stock Management:**
- Add new items
- Update quantities
- Get low-stock alerts
- Track reorder levels

### 6. Reports & Analytics (`/admin/reports`)

**Available Metrics:**
- 💰 **Total Revenue**: Daily revenue with average per service
- 📅 **Appointment Stats**: Total, completed, cancelled
- 👥 **Customer Base**: Total customers, contact info
- 📊 **Performance**: Completion rate, cancellation rate
- 💹 **Average Revenue**: Per service metrics

**Export Options:**
- Daily Report
- Weekly Report
- Monthly Report
- CSV Export (for Excel/Sheets)

---

## 🎨 Dashboard Layout

### Sidebar Navigation
Located on the left side with quick access to:
- Dashboard (home)
- Appointments
- Customers
- Staff
- Services
- Inventory
- Reports
- Settings

### Top Bar
Shows:
- Current page title
- Current time (updates every second)
- Logout button

### Main Content Area
- Stats cards with key metrics
- Tables with data
- Action buttons
- Empty states when no data

---

## 📊 Common Tasks

### Check Today's Revenue
1. Go to Dashboard (`/admin`)
2. Look at the highlighted **Revenue** card
3. See total revenue and completed service count

### Find a Customer's Booking History
1. Go to Customers (`/admin/customers`)
2. Search for customer name
3. Click on customer name
4. View all their appointments

### Reschedule an Appointment
1. Go to Appointments (`/admin/appointments`)
2. Select the date of the appointment
3. Find the appointment in the list
4. Click "Details"
5. Click "Reschedule" button
6. Select new date/time

### Cancel an Appointment
1. Go to Appointments (`/admin/appointments`)
2. Find the appointment
3. Click on it
4. Click "Cancel Appointment"
5. Optionally add reason
6. Confirm cancellation

### Track Staff Performance
1. Go to Staff (`/admin/staff`)
2. View staff member list
3. Check performance metrics
4. See customer satisfaction rating

### Monitor Inventory
1. Go to Inventory (`/admin/inventory`)
2. View current stock levels
3. Add new items as needed
4. Check low-stock alerts
5. Order when needed

### Generate a Report
1. Go to Reports (`/admin/reports`)
2. View performance metrics
3. Click desired export format (Daily/Weekly/Monthly)
4. Or export as CSV for spreadsheet use

---

## 🔑 Tips & Tricks

### Quick Navigation
- Use the sidebar to jump between sections
- Time updates automatically on dashboard
- Click "Dashboard" to go back to main view

### Filtering Appointments
- Select different dates to see appointments for other days
- Use status filter to see only specific types (e.g., cancelled)
- Filter by staff to see individual staff schedules

### Search Tips
- Search customers by full name or partial name
- Use phone number (with or without formatting)
- Search email addresses

### Reading Status Badges
- 🟡 **Pending**: Awaiting confirmation
- 🔵 **Confirmed**: Scheduled
- 🟢 **Completed**: Service finished
- 🔴 **Cancelled**: Customer cancelled
- 🟠 **No-Show**: Customer didn't show up

### Understanding Metrics
- **Completion Rate**: % of appointments that were completed
- **Cancellation Rate**: % of appointments that were cancelled
- **Average Revenue**: Total revenue ÷ number of services
- **Total Customers**: Unique customer count
- **With Phone**: Customers who provided phone number
- **With Email**: Customers who provided email

---

## ⚙️ Settings & Configuration

### Admin Settings (`/admin/settings`)
- Business name
- Location address
- Operating hours
- Notification preferences
- Report generation
- Data exports

### Permissions
- Some features may be locked based on your role
- Managers can't access admin user management
- Staff can only view appointments and customers

---

## 📧 Customer Communication

**From Admin Dashboard, you can:**
- View customer contact info
- Send appointment reminders
- Follow up on cancellations
- Collect feedback

---

## 📱 Mobile Access

The admin dashboard works on mobile devices:
- Sidebar collapses on small screens
- Tables become scrollable
- Touch-friendly buttons
- Mobile-optimized layout

**Pro Tip**: Keep your phone handy to check appointments on the go!

---

## ❓ FAQ

**Q: Can I edit customer information?**
A: Yes, if you have Manager or Admin role. Click on customer and edit details.

**Q: How often does the dashboard update?**
A: In real-time. Refresh if you don't see latest changes.

**Q: Can I export all customer data?**
A: Yes, use the CSV export feature in Reports section.

**Q: What if I forget my admin password?**
A: Use the login page with your customer credentials.

**Q: How are commissions calculated for staff?**
A: Commission info is in the Reports section under staff performance.

**Q: Can I bulk update appointments?**
A: Individual updates are available. Bulk features coming soon.

---

## 🆘 Troubleshooting

**Not seeing all appointments?**
- Check if you've selected the correct date
- Verify staff filter isn't limiting results
- Check status filter

**Revenue showing as $0?**
- Ensure appointments are marked as "COMPLETED"
- Check that services have pricing configured
- Refresh the page

**Can't access inventory?**
- Verify your role has inventory permissions
- Check if you're logged in as admin
- Reload the page

**Slow performance?**
- Close other browser tabs
- Clear browser cache
- Check internet connection

---

## 📞 Support

For detailed information, see:
- **Setup Guide**: `/ADMIN_SETUP.md`
- **Main README**: `/README.md`
- **Improvements Guide**: `/IMPROVEMENTS_NEEDED.md`

---

**Version**: 1.0.0
**Last Updated**: December 2025
**Status**: Production Ready ✅
