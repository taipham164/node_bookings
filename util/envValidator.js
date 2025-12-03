/*
Environment variable validation schema
*/

const Joi = require('joi');

/**
 * Define environment variable schema
 */
const envSchema = Joi.object({
  // Core configuration
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
  ENVIRONMENT: Joi.string().valid('sandbox', 'production').required(),
  PORT: Joi.number().default(3000),

  // Square API credentials
  SQ_ACCESS_TOKEN: Joi.string().required().messages({
    'any.required': 'SQ_ACCESS_TOKEN is required. Get it from Square Developer Dashboard.'
  }),
  SQ_LOCATION_ID: Joi.string().required().messages({
    'any.required': 'SQ_LOCATION_ID is required. Get it from Square Developer Dashboard.'
  }),
  SQ_APPLICATION_ID: Joi.string()
    .required()
    .not('PLACEHOLDER')
    .messages({
      'any.required': 'SQ_APPLICATION_ID is required. See SQUARE_APPLICATION_ID_SETUP.md',
      'any.only': 'SQ_APPLICATION_ID contains placeholder value. Replace with actual ID.'
    }),

  // Firebase configuration
  FIREBASE_API_KEY: Joi.string().required(),
  FIREBASE_AUTH_DOMAIN: Joi.string().required(),
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_STORAGE_BUCKET: Joi.string().required(),
  FIREBASE_MESSAGING_SENDER_ID: Joi.string().required(),
  FIREBASE_APP_ID: Joi.string().required(),

  // Security
  SESSION_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'SESSION_SECRET must be at least 32 characters',
      'any.required': 'SESSION_SECRET is required for session security'
    }),

  // Optional configurations
  RECAPTCHA_SITE_KEY: Joi.string().optional(),
  SQ_APPLICATION_NAME: Joi.string().default('Booking System'),
  BOOKING_START_AT_MIN: Joi.string().isoDate().optional(),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info')
}).unknown(true); // Allow additional env vars

/**
 * Validate environment variables
 * @returns {object} - Validated environment variables
 * @throws {Error} - If validation fails
 */
function validateEnv() {
  const { error, value } = envSchema.validate(process.env);

  if (error) {
    const messages = error.details.map(detail => `  - ${detail.message}`).join('\n');
    throw new Error(`Environment variable validation failed:\n${messages}`);
  }

  return value;
}

/**
 * Check if in production environment
 * @returns {boolean}
 */
function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production';
}

/**
 * Get secure flag based on environment
 * @returns {boolean}
 */
function getSecureFlag() {
  // Secure flag should be true in production
  if (isProduction()) {
    return true;
  }
  // Can be false in development
  return process.env.COOKIE_SECURE === 'true';
}

module.exports = {
  envSchema,
  validateEnv,
  isProduction,
  getSecureFlag
};
