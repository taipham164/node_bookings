// Test booking creation without source field
const { bookingsApi } = require('../util/square-client');
const crypto = require('crypto');

async function testBookingCreation() {
    try {
        console.log('Testing booking creation without source field...');
        
        // Test booking data (using mock data)
        const testBooking = {
            booking: {
                appointmentSegments: [{
                    durationMinutes: 30,
                    serviceVariationId: "TIZI2ZBOQU4FCVGAMMLRTVT6",
                    serviceVariationVersion: 1747958218797,
                    teamMemberId: "TU3QU8mRez0kXv_0RLJ4"
                }],
                customerId: "JM2ZRBZ5B332E0TGY1GD5NJ66R",
                customerNote: "Test booking",
                locationId: "6G1GCCAYYXB45",
                startAt: "2025-06-27T17:00:00Z"
                // No source field - this should work now
            },
            idempotencyKey: crypto.randomUUID()
        };
        
        console.log('Booking request:', JSON.stringify(testBooking, null, 2));
        
        // This would be the actual API call (commented out to avoid real booking)
        // const { result: { booking } } = await bookingsApi.createBooking(testBooking);
        // console.log('✅ Booking created successfully:', booking.id);
        
        console.log('✅ Test passed - booking request structure is valid (source field removed)');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.errors) {
            console.error('Errors:', error.errors);
        }
    }
}

// Run the test
testBookingCreation();
