/*
Copyright 2021 Square Inc.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const { bookingsApi } = require('./square-client');
const { logger } = require('./logger');

/**
 * Retrieve the business booking profile and extract cancellation policy information
 * @returns {Object} Cancellation policy data
 */
async function getCancellationPolicy() {
  try {
    logger.debug('Fetching business booking profile from Square API...');
    
    // Retrieve the business booking profile
    const { result } = await bookingsApi.retrieveBusinessBookingProfile();
    const businessBookingProfile = result.businessBookingProfile;
    
    logger.debug('Business booking profile received:', {
      hasProfile: !!businessBookingProfile,
      hasAppointmentSettings: !!(businessBookingProfile?.business_appointment_settings),
      allowUserCancel: businessBookingProfile?.allow_user_cancel,
      bookingPolicy: businessBookingProfile?.booking_policy
    });
    
    if (!businessBookingProfile || !businessBookingProfile.business_appointment_settings) {
      logger.warn('No business appointment settings found, using default policy');
      return getDefaultCancellationPolicy();
    }
    
    const settings = businessBookingProfile.business_appointment_settings;
    
    logger.debug('Appointment settings:', {
      cancellation_window_seconds: settings.cancellation_window_seconds,
      cancellation_fee_money: settings.cancellation_fee_money,
      cancellation_policy: settings.cancellation_policy,
      cancellation_policy_text: settings.cancellation_policy_text
    });
      // Extract cancellation policy information
    const policy = {
      // Convert seconds to hours for cancellation window
      cancellationWindowHours: settings.cancellation_window_seconds ? 
        Math.round(settings.cancellation_window_seconds / 3600) : 24,
      
      // Extract cancellation fee if available
      cancellationFee: settings.cancellation_fee_money ? {
        amount: settings.cancellation_fee_money.amount,
        currency: settings.cancellation_fee_money.currency || 'USD'
      } : null,
      
      // Use custom policy text if available, otherwise generate from settings
      policyText: settings.cancellation_policy_text || null,
      
      // Policy type (ACCEPT_ALL, REQUIRES_ACCEPTANCE, etc.)
      policyType: settings.cancellation_policy || 'STANDARD',
      
      // Whether customers can cancel their own bookings
      allowUserCancel: businessBookingProfile.allow_user_cancel !== false,
      
      // Raw settings for advanced use
      rawSettings: settings
    };
    
    // If no custom text, generate policy text from settings
    if (!policy.policyText) {
      policy.policyText = generatePolicyText(policy);
    }
    
    return policy;
    
  } catch (error) {
    logger.error('Error retrieving cancellation policy from Square API:', error);
    logger.warn('Falling back to default cancellation policy');
    return getDefaultCancellationPolicy();
  }
}

/**
 * Generate policy text from settings
 * @param {Object} policy - Policy object with settings
 * @returns {string} Generated policy text
 */
function generatePolicyText(policy) {
  const windowHours = policy.cancellationWindowHours || 2;
  const hasFee = policy.cancellationFee && (policy.cancellationFee.amount > 0 || policy.cancellationFee.percentage > 0);
  
  let text = `Cancellation Policy:\n\n`;
  
  // Advance cancellation (no charge)
  text += `• Cancel ${windowHours}+ hours before your appointment: No charge\n`;
  
  // Late cancellation with fee
  text += `• Cancel within ${windowHours} hours: `;
  if (hasFee) {
    if (policy.cancellationFee.percentage) {
      text += `${policy.cancellationFee.percentage}% of service fee charged\n`;
    } else {
      const feeAmount = (policy.cancellationFee.amount / 100).toFixed(2);
      text += `$${feeAmount} cancellation fee\n`;
    }
  } else {
    text += `50% of service fee charged\n`;
  }
  
  // No-show policy
  text += `• No-show: 50% of service fee charged`;
  if (policy.noShowPolicy?.holdCard) {
    text += ` + card authorization hold\n`;
  } else {
    text += `\n`;
  }
  
  text += `\nWe ask that you please reschedule or cancel at least ${windowHours} hours before the beginning of your appointment or you may be charged a cancellation fee.\n\n`;
  
  if (policy.allowUserCancel && policy.allowUserReschedule) {
    text += `Clients may reschedule or cancel their own appointments before the cut-off time through our online booking site. `;
  }
  
  text += `Your payment method secures your appointment slot and will be charged for late cancellations or no-shows.`;
  
  return text;
}

/**
 * Get structured policy terms for HTML rendering
 * @param {Object} policy - Policy object
 * @returns {Object} Structured policy terms
 */
function getPolicyTerms(policy) {
  const windowHours = policy.cancellationWindowHours || 2;
  const hasFee = policy.cancellationFee && (policy.cancellationFee.amount > 0 || policy.cancellationFee.percentage > 0);
  
  let lateCancelCharge = '50% of service fee charged';
  if (hasFee) {
    if (policy.cancellationFee.percentage) {
      lateCancelCharge = `${policy.cancellationFee.percentage}% of service fee charged`;
    } else {
      const feeAmount = (policy.cancellationFee.amount / 100).toFixed(2);
      lateCancelCharge = `$${feeAmount} cancellation fee`;
    }
  }
  
  let noShowCharge = '50% of service fee charged';
  if (policy.noShowPolicy?.holdCard) {
    noShowCharge += ' + card hold';
  }
  
  return {
    advanceCancel: {
      timeframe: `${windowHours}+ hours before`,
      charge: 'No charge'
    },
    lateCancel: {
      timeframe: `within ${windowHours} hours`,
      charge: lateCancelCharge
    },
    noShow: {
      timeframe: 'No-show',
      charge: noShowCharge
    },
    allowUserCancel: policy.allowUserCancel,
    allowUserReschedule: policy.allowUserReschedule || policy.allowUserCancel,
    windowHours: windowHours,
    cutOffHours: policy.cutOffHours || windowHours,
    noShowPolicy: policy.noShowPolicy,
    policyDescription: `We ask that you please reschedule or cancel at least ${windowHours} hours before the beginning of your appointment or you may be charged a cancellation fee.`
  };
}

/**
 * Default cancellation policy fallback
 * @returns {Object} Default policy object
 */
function getDefaultCancellationPolicy() {
  return {
    cancellationWindowHours: 2, // 2 hours cut-off time
    cancellationFee: {
      amount: 5000, // 50% of average service price (in cents) - this will be calculated dynamically
      currency: 'USD',
      percentage: 50 // 50% of service price
    },
    policyText: `Cancellation Policy:

• Cancel 2+ hours before your appointment: No charge
• Cancel within 2 hours: 50% of service fee charged
• No-show: 50% of service fee charged

We ask that you please reschedule or cancel at least 2 hours before the beginning of your appointment or you may be charged a cancellation fee.

Clients may reschedule or cancel their own appointments before the cut-off time through our online booking site. Your payment method secures your appointment slot and will be charged for late cancellations or no-shows.`,
    policyType: 'CUSTOM_POLICY',
    allowUserCancel: true,
    allowUserReschedule: true,
    cutOffHours: 2,
    noShowPolicy: {
      enabled: true,
      holdCard: true,
      chargeFullAmount: true,
      description: "Card will be authorized and charged for full service amount in case of no-show"
    },
    rawSettings: null
  };
}

module.exports = {
  getCancellationPolicy,
  getPolicyTerms,
  generatePolicyText,
  getDefaultCancellationPolicy
};
