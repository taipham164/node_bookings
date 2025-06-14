// Debug: Log complete booking object to understand creator attribution

const express = require("express");
const router = express.Router();
const { bookingsApi } = require("../util/square-client");

/**
 * GET /debug/booking/:bookingId
 * Debug endpoint to see the complete booking object structure
 */
router.get("/booking/:bookingId", async (req, res) => {
  const bookingId = req.params.bookingId;
  
  try {
    console.log('🔍 DEBUG: Retrieving booking details for:', bookingId);
    
    const { result: { booking } } = await bookingsApi.retrieveBooking(bookingId);
    
    // Log the complete booking object
    console.log('📋 COMPLETE BOOKING OBJECT:');
    console.log(JSON.stringify(booking, null, 2));
    
    // Focus on creator details
    console.log('👤 CREATOR DETAILS:');
    if (booking.creatorDetails) {
      console.log('Creator Type:', booking.creatorDetails.creatorType);
      console.log('Team Member ID:', booking.creatorDetails.teamMemberId);
      console.log('Customer ID:', booking.creatorDetails.customerId);
    } else {
      console.log('No creator details found');
    }
    
    // Focus on customer info
    console.log('🙋 CUSTOMER INFO:');
    console.log('Customer ID:', booking.customerId);
    
    // Focus on source info
    console.log('📍 SOURCE INFO:');
    console.log('Source:', booking.source);
    
    res.json({
      message: 'Booking debug information logged to console',
      bookingId: bookingId,
      customerId: booking.customerId,
      creatorDetails: booking.creatorDetails || null,
      source: booking.source || null,
      fullBooking: booking
    });
    
  } catch (error) {
    console.error('❌ Error retrieving booking:', error);
    res.status(500).json({
      error: 'Failed to retrieve booking',
      details: error.message
    });
  }
});

module.exports = router;
