# Booking Source Field Fix

## 🚨 Issue
The Square API was rejecting booking creation with this error:
```
"`CUSTOM_APP` is not a valid enum value for `booking.source`."
```

## 🔧 Solution
Removed the `source: "CUSTOM_APP"` field from the booking creation request since it's not a valid enum value according to Square's API.

## 📝 Changes Made

### File: `routes/booking.js`
**Before**:
```javascript
const { result: { booking } } = await bookingsApi.createBooking({
  booking: {
    appointmentSegments,
    customerId: finalCustomerId,
    customerNote,
    locationId,
    startAt,
    source: "CUSTOM_APP", // ❌ Invalid enum value
  },
  idempotencyKey: crypto.randomUUID(),
});
```

**After**:
```javascript
const { result: { booking } } = await bookingsApi.createBooking({
  booking: {
    appointmentSegments,
    customerId: finalCustomerId,
    customerNote,
    locationId,
    startAt,
    // ✅ Removed invalid source field
    // Tracking can be done via user-agent header or other metadata
  },
  idempotencyKey: crypto.randomUUID(),
});
```

## 🎯 Impact
- **Fixed**: Booking creation now works for existing customers
- **Maintains**: All other functionality including SMS verification flow
- **Tracking**: Bookings can still be identified via:
  - User-agent header: `sample_app_node_bookings`
  - API call patterns
  - Custom customer notes if needed

## 🧪 Testing Status
- ✅ Existing customer SMS verification flow works
- ✅ Booking creation request structure validated
- ✅ All cancellation policies and payment flows intact

## 📋 Valid Booking Source Values
According to Square API documentation, the `source` field is read-only and automatically set by Square based on how the booking was created. Valid values include:
- `MERCHANT` (set by Square when created via merchant dashboard)
- Other Square-internal values

**Note**: Third-party applications cannot set custom source values. The API automatically tracks the source based on the authentication method and API client used.

## ✅ Resolution
Bookings will now process successfully while maintaining all implemented features:
- 2-hour cancellation policy
- SMS phone verification 
- PCI-compliant card handling
- Customer data management
- Existing vs new customer flows

The source tracking functionality was replaced with existing Square mechanisms that automatically identify API-created bookings.
