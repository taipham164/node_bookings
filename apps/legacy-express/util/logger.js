/*
Structured logging using Winston
*/

const winston = require('winston');
const path = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production';

// Define custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

winston.addColors(colors);

// Create logger instance
const logger = winston.createLogger({
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    isDevelopment
      ? winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => {
            const { timestamp, level, message, ...args } = info;
            const ts = timestamp.slice(0, 19).replace('T', ' ');
            return `${ts} [${level}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
          }
        )
      )
      : winston.format.combine(
        winston.format.json(),
        winston.format.printf(
          (info) => {
            const { timestamp, level, message, ...args } = info;
            return JSON.stringify({
              timestamp,
              level,
              message,
              ...args
            });
          }
        )
      )
  ),
  defaultMeta: { service: 'bookings-api' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

/**
 * Mask sensitive data in objects
 * @param {object} obj - Object to mask
 * @returns {object} - Object with sensitive data masked
 */
function maskSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveFields = [
    'password', 'token', 'authorization', 'creditCard', 'cardNumber', 'cvv',
    'cardNonce', 'accessToken', 'refreshToken', 'apiKey', 'secret', 'phoneNumber',
    'emailAddress', 'email', 'personalId'
  ];

  const masked = JSON.parse(JSON.stringify(obj));

  const maskFields = (obj) => {
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        maskFields(obj[key]);
      }
    }
  };

  maskFields(masked);
  return masked;
}

/**
 * Create a request logger middleware
 * @returns {function} Express middleware
 */
function requestLogger() {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent')
      };

      if (res.statusCode >= 400) {
        logger.warn('HTTP Request', logData);
      } else {
        logger.info('HTTP Request', logData);
      }
    });

    next();
  };
}

/**
 * Log error with context
 * @param {Error} error - Error to log
 * @param {object} context - Additional context
 */
function logError(error, context = {}) {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    context: maskSensitiveData(context)
  });
}

/**
 * Log API call
 * @param {string} apiName - Name of the API being called
 * @param {string} method - HTTP method
 * @param {object} data - Request data
 */
function logApiCall(apiName, method, data = {}) {
  logger.debug(`Square API Call: ${apiName}`, {
    method,
    data: maskSensitiveData(data)
  });
}

/**
 * Log API response
 * @param {string} apiName - Name of the API
 * @param {number} duration - Duration in ms
 * @param {boolean} success - Whether call was successful
 */
function logApiResponse(apiName, duration, success = true) {
  const level = success ? 'debug' : 'warn';
  logger[level](`Square API Response: ${apiName}`, { duration: `${duration}ms`, success });
}

module.exports = {
  logger,
  maskSensitiveData,
  requestLogger,
  logError,
  logApiCall,
  logApiResponse
};
