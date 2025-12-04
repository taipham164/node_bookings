/**
 * Square Booking Policy Integration
 * Handles client approval policies and booking flow management
 */

const { getCancellationPolicy } = require('./cancellation-policy');
const { logger } = require('./logger');

/**
 * Retrieves the business booking policy settings from Square API
 * @returns {Promise<Object>} Booking policy configuration
 */
async function getBookingPolicy() {
  try {
    const { bookingsApi } = require('./square-client');
    const { result } = await bookingsApi.retrieveBusinessBookingProfile();
    
    const profile = result.businessBookingProfile;
      return {
      bookingPolicy: profile.booking_policy, // 'ACCEPT_ALL' or 'REQUIRES_ACCEPTANCE'
      bookingEnabled: profile.booking_enabled,
      allowUserCancel: profile.allow_user_cancel,
      customerTimezoneChoice: profile.customer_timezone_choice,
      appointmentSettings: profile.business_appointment_settings,
      requiresApproval: profile.booking_policy === 'REQUIRES_ACCEPTANCE',
      autoApproval: profile.booking_policy === 'ACCEPT_ALL'
    };
  } catch (error) {
    logger.error('Error fetching booking policy:', error);
    // Return default policy
    return getDefaultBookingPolicy();
  }
}

/**
 * Gets default booking policy when API is unavailable
 * @returns {Object} Default booking policy configuration
 */
function getDefaultBookingPolicy() {  return {
    bookingPolicy: 'ACCEPT_ALL',
    bookingEnabled: true,
    allowUserCancel: true,
    customerTimezoneChoice: 'CUSTOMER_CHOICE',
    requiresApproval: false,
    autoApproval: true,
    appointmentSettings: {
      location_types: ['BUSINESS_LOCATION'],
      alignment_time: 'HALF_HOURLY',
      min_booking_lead_time_seconds: 0,
      max_booking_lead_time_seconds: 31536000,
      any_team_member_booking_enabled: true,
      multiple_service_booking_enabled: true
    }
  };
}

/**
 * Determines booking flow based on policy settings
 * @param {Object} bookingPolicy - Booking policy configuration
 * @returns {Object} Booking flow configuration
 */
function getBookingFlow(bookingPolicy) {
  const isManualApproval = bookingPolicy.requiresApproval;
  
  return {
    requiresApproval: isManualApproval,
    confirmationMessage: isManualApproval 
      ? 'Your booking request has been submitted and is pending approval. You will receive confirmation within 24 hours.'
      : 'Your booking has been confirmed! You will receive a confirmation email shortly.',
    bookingStatus: isManualApproval ? 'PENDING' : 'CONFIRMED',
    nextSteps: isManualApproval
      ? [
          'Wait for booking approval',
          'Check your email for confirmation',
          'Contact us if you need to make changes'
        ]
      : [
          'Prepare for your appointment',
          'Add to your calendar',
          'Contact us if you need to reschedule'
        ]
  };
}

/**
 * Gets complete booking configuration including policies and flow
 * @returns {Promise<Object>} Complete booking configuration
 */
async function getBookingConfiguration() {
  try {
    const [bookingPolicy, cancellationPolicy] = await Promise.all([
      getBookingPolicy(),
      getCancellationPolicy()
    ]);
    
    const bookingFlow = getBookingFlow(bookingPolicy);
    
    return {
      booking: bookingPolicy,
      cancellation: cancellationPolicy,
      flow: bookingFlow,
      policies: {
        requiresApproval: bookingPolicy.requiresApproval,
        allowUserCancel: bookingPolicy.allowUserCancel,
        autoConfirmation: bookingPolicy.autoApproval
      }
    };
  } catch (error) {
    logger.error('Error getting booking configuration:', error);
    throw error;
  }
}

module.exports = {
  getBookingPolicy,
  getDefaultBookingPolicy,
  getBookingFlow,
  getBookingConfiguration
};
