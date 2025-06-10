/**
 * Test route for booking policy integration
 */

const express = require("express");
const router = express.Router();
const { getBookingConfiguration } = require("../util/booking-policy");
const { getCancellationPolicy, getPolicyTerms } = require("../util/cancellation-policy");

/**
 * GET /test-booking-policy
 * Test page for booking policy integration
 */
router.get("/", async (req, res, next) => {
  try {
    console.log('Testing booking policy integration...');
    
    // Fetch both booking configuration and cancellation policy
    const [bookingConfig, cancellationPolicy] = await Promise.all([
      getBookingConfiguration().catch(err => {
        console.warn('Booking config failed:', err.message);
        return {
          booking: {
            bookingPolicy: 'ACCEPT_ALL',
            requiresApproval: false,
            autoApproval: true,
            allowUserCancel: true,
            bookingEnabled: true
          },
          flow: {
            requiresApproval: false,
            confirmationMessage: 'Your booking has been confirmed! You will receive a confirmation email shortly.',
            nextSteps: ['Prepare for your appointment', 'Add to your calendar', 'Contact us if you need to reschedule']
          }
        };
      }),
      getCancellationPolicy().catch(err => {
        console.warn('Cancellation policy failed:', err.message);
        return null;
      })
    ]);
    
    const policyTerms = cancellationPolicy ? getPolicyTerms(cancellationPolicy) : null;
    
    console.log('Test results:', {
      bookingConfigAvailable: !!bookingConfig,
      requiresApproval: bookingConfig?.booking?.requiresApproval,
      policyTermsAvailable: !!policyTerms
    });
    
    res.render("pages/booking-policy-test", {
      bookingConfig,
      policyTerms,
      cancellationPolicy,
      testResults: {
        bookingAPI: !!bookingConfig,
        cancellationAPI: !!cancellationPolicy,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in booking policy test:', error);
    res.render("pages/booking-policy-test", {
      bookingConfig: null,
      policyTerms: null,
      cancellationPolicy: null,
      error: error.message,
      testResults: {
        bookingAPI: false,
        cancellationAPI: false,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

module.exports = router;
