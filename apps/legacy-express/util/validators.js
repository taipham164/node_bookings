/*
Validation utilities for input sanitization and validation
*/

const Joi = require('joi');
const validator = require('validator');

/**
 * Normalize phone number to E.164 format
 * @param {string} phone - Raw phone number input
 * @returns {string|null} - Normalized phone number or null if invalid
 */
function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;

  const digits = phone.replace(/\D/g, '');

  // Support US numbers (10 digits)
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // Support US numbers with country code (11 digits starting with 1)
  else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  // Support international formats with 7-15 digits
  else if (digits.length >= 7 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return false;
  return /^\+\d{10,15}$/.test(normalized);
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return validator.isEmail(email);
}

/**
 * Validate person name
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100 && /^[a-zA-Z\s'-]+$/.test(trimmed);
}

/**
 * Validate postal code
 * @param {string} postalCode - Postal code to validate
 * @returns {boolean} - True if valid
 */
function isValidPostalCode(postalCode) {
  if (!postalCode || typeof postalCode !== 'string') return false;
  const trimmed = postalCode.trim();
  // Accept 5-10 digit postal codes (supports US and other formats)
  return /^\d{5,10}$/.test(trimmed) || /^[A-Z0-9]{5,10}$/i.test(trimmed);
}

/**
 * Validate service ID (UUID format)
 * @param {string} serviceId - Service ID to validate
 * @returns {boolean} - True if valid
 */
function isValidServiceId(serviceId) {
  if (!serviceId || typeof serviceId !== 'string') return false;
  return validator.isUUID(serviceId);
}

/**
 * Validate booking date (ISO string)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid
 */
function isValidBookingDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && date > new Date();
}

/**
 * Joi schema for customer data validation
 */
const customerDataSchema = Joi.object({
  givenName: Joi.string().min(1).max(100).required(),
  familyName: Joi.string().min(1).max(100).required(),
  emailAddress: Joi.string().email().required(),
  phoneNumber: Joi.string().min(10).max(20).required(),
  postalCode: Joi.string().min(5).max(10).optional(),
  customerNote: Joi.string().max(500).optional()
});

/**
 * Joi schema for booking data validation
 */
const bookingDataSchema = Joi.object({
  serviceId: Joi.string().uuid().required(),
  staffId: Joi.string().uuid().required(),
  startAt: Joi.string().isoDate().required(),
  customerId: Joi.string().uuid().optional(),
  givenName: Joi.string().min(1).max(100).optional(),
  familyName: Joi.string().min(1).max(100).optional(),
  emailAddress: Joi.string().email().optional(),
  phoneNumber: Joi.string().min(10).max(20).required(),
  cardNonce: Joi.string().optional(),
  postalCode: Joi.string().min(5).max(10).optional()
});

/**
 * Joi schema for payment data validation
 */
const paymentDataSchema = Joi.object({
  cardId: Joi.string().required(),
  amount: Joi.number().integer().positive().required(),
  currency: Joi.string().length(3).optional().default('USD'),
  bookingId: Joi.string().uuid().optional()
});

/**
 * Validate customer data
 * @param {object} data - Customer data to validate
 * @returns {object} - { valid: boolean, errors: array }
 */
function validateCustomerData(data) {
  const { error, value } = customerDataSchema.validate(data, { abortEarly: false });
  return {
    valid: !error,
    errors: error ? error.details.map(d => d.message) : [],
    value
  };
}

/**
 * Validate booking data
 * @param {object} data - Booking data to validate
 * @returns {object} - { valid: boolean, errors: array }
 */
function validateBookingData(data) {
  const { error, value } = bookingDataSchema.validate(data, { abortEarly: false });
  return {
    valid: !error,
    errors: error ? error.details.map(d => d.message) : [],
    value
  };
}

/**
 * Validate payment data
 * @param {object} data - Payment data to validate
 * @returns {object} - { valid: boolean, errors: array }
 */
function validatePaymentData(data) {
  const { error, value } = paymentDataSchema.validate(data, { abortEarly: false });
  return {
    valid: !error,
    errors: error ? error.details.map(d => d.message) : [],
    value
  };
}

module.exports = {
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidEmail,
  isValidName,
  isValidPostalCode,
  isValidServiceId,
  isValidBookingDate,
  validateCustomerData,
  validateBookingData,
  validatePaymentData,
  customerDataSchema,
  bookingDataSchema,
  paymentDataSchema
};
