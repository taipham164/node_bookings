/**
 * Card Authorization Utility for No-Show Protection
 * Handles card holds and authorizations for appointment bookings
 */

const { paymentsApi } = require('./square-client');
const { randomUUID } = require('crypto');
const { logger } = require('./logger');

/**
 * Create a card authorization (hold) for appointment booking
 * @param {Object} cardData - Card information from Web Payments SDK
 * @param {Object} appointmentData - Appointment details
 * @returns {Promise<Object>} Authorization result
 */
async function createCardAuthorization(cardData, appointmentData) {
  try {
    const requestBody = {
      idempotencyKey: randomUUID(),
      sourceId: cardData.sourceId, // From Web Payments SDK
      amountMoney: {
        amount: appointmentData.totalAmount, // Service price in cents
        currency: appointmentData.currency || 'USD'
      },
      autocomplete: false, // This creates an authorization (hold) instead of immediate charge
      note: `Authorization hold for appointment on ${appointmentData.appointmentDate}`,
      orderInfo: {
        orderSource: {
          name: 'Online Booking System'
        }
      },
      appointmentId: appointmentData.appointmentId,
      referenceId: `auth-${appointmentData.appointmentId}`,
      delayCapture: true // Hold the funds without capturing
    };

    const { result } = await paymentsApi.createPayment(requestBody);
    
    return {
      authorizationId: result.payment.id,
      status: result.payment.status, // Should be 'AUTHORIZED'
      amountMoney: result.payment.amountMoney,
      cardDetails: result.payment.cardDetails,
      createdAt: result.payment.createdAt,
      expiresAt: calculateAuthorizationExpiry(),
      appointmentId: appointmentData.appointmentId,
      holdType: 'NO_SHOW_PROTECTION'
    };
  } catch (error) {
    logger.error('Error creating card authorization:', error);
    throw new Error(`Failed to authorize payment method: ${error.message}`);
  }
}

/**
 * Capture an authorized payment (charge the held amount)
 * @param {string} authorizationId - Square payment ID from authorization
 * @param {number} captureAmount - Amount to capture in cents (can be less than authorized amount)
 * @returns {Promise<Object>} Capture result
 */
async function captureAuthorization(authorizationId, captureAmount = null) {
  try {
    const requestBody = {
      idempotencyKey: randomUUID(),
      ...(captureAmount && { amountMoney: { amount: captureAmount, currency: 'USD' } })
    };

    const { result } = await paymentsApi.completePayment(authorizationId, requestBody);
    
    return {
      paymentId: result.payment.id,
      status: result.payment.status, // Should be 'COMPLETED'
      capturedAmount: result.payment.amountMoney,
      capturedAt: result.payment.updatedAt,
      reason: 'NO_SHOW_FEE'
    };
  } catch (error) {
    logger.error('Error capturing authorization:', error);
    throw new Error(`Failed to capture payment: ${error.message}`);
  }
}

/**
 * Cancel an authorization (release the hold)
 * @param {string} authorizationId - Square payment ID from authorization
 * @returns {Promise<Object>} Cancellation result
 */
async function cancelAuthorization(authorizationId) {
  try {
    const requestBody = {
      idempotencyKey: randomUUID()
    };

    const { result } = await paymentsApi.cancelPayment(authorizationId, requestBody);
    
    return {
      paymentId: result.payment.id,
      status: result.payment.status, // Should be 'CANCELED'
      canceledAt: result.payment.updatedAt,
      reason: 'APPOINTMENT_COMPLETED_OR_CANCELED'
    };
  } catch (error) {
    logger.error('Error canceling authorization:', error);
    throw new Error(`Failed to release payment hold: ${error.message}`);
  }
}

/**
 * Calculate when the authorization expires (typically 7 days)
 * @returns {string} Expiration date in ISO format
 */
function calculateAuthorizationExpiry() {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
  return expiryDate.toISOString();
}

/**
 * Get authorization status
 * @param {string} authorizationId - Square payment ID
 * @returns {Promise<Object>} Authorization status
 */
async function getAuthorizationStatus(authorizationId) {
  try {
    const { result } = await paymentsApi.getPayment(authorizationId);
    
    return {
      paymentId: result.payment.id,
      status: result.payment.status,
      amountMoney: result.payment.amountMoney,
      cardDetails: result.payment.cardDetails,
      createdAt: result.payment.createdAt,
      updatedAt: result.payment.updatedAt,
      isExpired: new Date() > new Date(calculateAuthorizationExpiry())
    };
  } catch (error) {
    logger.error('Error getting authorization status:', error);
    throw new Error(`Failed to get authorization status: ${error.message}`);
  }
}

/**
 * Process cancellation fee based on timing and policy
 * @param {string} authorizationId - Square payment ID
 * @param {Object} cancellationData - Cancellation details
 * @returns {Promise<Object>} Processing result
 */
async function processCancellationFee(authorizationId, cancellationData) {
  try {
    const { hoursBeforeAppointment, serviceAmount, cancellationPolicy } = cancellationData;
    
    // Determine fee based on cancellation timing
    let feeAmount = 0;
    let feeReason = '';
    
    if (hoursBeforeAppointment < cancellationPolicy.cutOffHours) {
      // Late cancellation - charge percentage or fixed fee
      if (cancellationPolicy.cancellationFee?.percentage) {
        feeAmount = Math.round(serviceAmount * (cancellationPolicy.cancellationFee.percentage / 100));
        feeReason = `${cancellationPolicy.cancellationFee.percentage}% late cancellation fee`;
      } else {
        feeAmount = cancellationPolicy.cancellationFee?.amount || Math.round(serviceAmount * 0.5);
        feeReason = 'Late cancellation fee';
      }
    } else if (hoursBeforeAppointment === 0) {
      // No-show - charge full amount
      feeAmount = serviceAmount;
      feeReason = 'No-show fee';
    }
    
    if (feeAmount > 0) {
      // Capture the fee amount
      const captureResult = await captureAuthorization(authorizationId, feeAmount);
      return {
        ...captureResult,
        feeAmount: feeAmount,
        feeReason: feeReason,
        originalAmount: serviceAmount
      };
    } else {
      // No fee - release the authorization
      const cancelResult = await cancelAuthorization(authorizationId);
      return {
        ...cancelResult,
        feeAmount: 0,
        feeReason: 'Canceled within allowed timeframe',
        originalAmount: serviceAmount
      };
    }
  } catch (error) {
    logger.error('Error processing cancellation fee:', error);
    throw new Error(`Failed to process cancellation fee: ${error.message}`);
  }
}

module.exports = {
  createCardAuthorization,
  captureAuthorization,
  cancelAuthorization,
  getAuthorizationStatus,
  processCancellationFee,
  calculateAuthorizationExpiry
};
