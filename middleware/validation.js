/*
Request validation middleware
*/

const { ValidationError } = require('./errorHandler');

/**
 * Create a validation middleware using Joi schema
 * @param {object} schema - Joi schema to validate against
 * @param {string} dataSource - Where to get data from ('body', 'query', 'params')
 * @returns {function} Express middleware
 */
function validate(schema, dataSource = 'body') {
  return (req, res, next) => {
    const data = req[dataSource];

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new ValidationError('Validation failed', errors));
    }

    // Replace with validated data
    req[dataSource] = value;
    next();
  };
}

/**
 * Validate request body against schema
 * @param {object} schema - Joi schema
 * @returns {function} Express middleware
 */
function validateBody(schema) {
  return validate(schema, 'body');
}

/**
 * Validate request query parameters
 * @param {object} schema - Joi schema
 * @returns {function} Express middleware
 */
function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * Validate request params
 * @param {object} schema - Joi schema
 * @returns {function} Express middleware
 */
function validateParams(schema) {
  return validate(schema, 'params');
}

/**
 * Middleware to ensure request has valid content-type
 */
function validateContentType(req, res, next) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded'))) {
      return next(new ValidationError('Invalid Content-Type. Expected application/json or application/x-www-form-urlencoded'));
    }
  }
  next();
}

/**
 * Middleware to limit request body size
 * @param {string} limit - Max size (e.g., '10kb', '1mb')
 */
function limitBodySize(limit = '10kb') {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    const maxSize = parseSize(limit);

    if (contentLength > maxSize) {
      return next(new ValidationError(`Request body too large. Maximum size is ${limit}`));
    }

    next();
  };
}

/**
 * Parse size string to bytes
 * @param {string} size - Size string (e.g., '10kb', '1mb')
 * @returns {number} - Size in bytes
 */
function parseSize(size) {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+)(kb|mb|gb|b)$/);
  if (!match) return 10 * 1024; // Default 10KB

  return parseInt(match[1], 10) * units[match[2]];
}

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateContentType,
  limitBodySize
};
