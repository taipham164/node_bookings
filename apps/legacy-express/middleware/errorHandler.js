/*
Unified error handling middleware
*/

const { logError } = require('../util/logger');

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, { errors });
    this.errors = errors;
  }
}

/**
 * Authentication error class
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

/**
 * Authorization error class
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

/**
 * Not found error class
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Square API error class
 */
class SquareApiError extends AppError {
  constructor(message, statusCode = 500, squareErrors = []) {
    super(message, statusCode, { squareErrors });
    this.squareErrors = squareErrors;
  }
}

/**
 * Main error handler middleware
 */
function errorHandler(err, req, res, next) {
  logError(err, {
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).render('pages/formatted-error', {
      code: err.statusCode,
      description: err.message,
      shortDescription: getErrorTitle(err.statusCode)
    });
  }

  // Handle Square API errors
  if (err.statusCode && err.errors) {
    const squareError = handleSquareError(err);
    return res.status(squareError.statusCode).render('pages/formatted-error', {
      code: squareError.statusCode,
      description: squareError.message,
      shortDescription: getErrorTitle(squareError.statusCode)
    });
  }

  // Handle generic errors
  res.status(500).render('pages/formatted-error', {
    code: 500,
    description: 'An unexpected error occurred. Please try again later.',
    shortDescription: 'Internal Server Error'
  });
}

/**
 * Handle Square-specific API errors
 * @param {Error} error - Square API error
 * @returns {object} - Normalized error object
 */
function handleSquareError(error) {
  // Time slot not available
  if (error.errors?.some(e => e.detail?.includes('That time slot is no longer available'))) {
    return {
      statusCode: 400,
      message: 'This appointment time is no longer available. Please try booking again.'
    };
  }

  // Stale version
  if (error.errors?.some(e => e.detail?.includes('Stale version'))) {
    return {
      statusCode: 400,
      message: 'The service has been updated. Please try booking it again.'
    };
  }

  // Cancellation period expired
  if (error.errors?.some(e =>
    e.detail?.includes('cannot cancel past cancellation period end') ||
    e.detail?.includes('The cancellation period for this booking has ended')
  )) {
    return {
      statusCode: 400,
      message: 'The booking is past the cancellation period and cannot be cancelled or rescheduled.'
    };
  }

  // Invalid email
  if (error.errors?.some(e => e.code === 'INVALID_VALUE' && e.field === 'email')) {
    return {
      statusCode: 400,
      message: 'Please enter a valid email address.'
    };
  }

  // Default Square error
  return {
    statusCode: error.statusCode || 500,
    message: error.message || 'An error occurred with the booking service.'
  };
}

/**
 * Get human-readable error title based on status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} - Error title
 */
function getErrorTitle(statusCode) {
  const titles = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
    503: 'Service Unavailable'
  };
  return titles[statusCode] || 'Error';
}

/**
 * 404 handler middleware
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Cannot ${req.method} ${req.path}`);
  next(error);
}

/**
 * Async error wrapper for route handlers
 * @param {function} fn - Async route handler
 * @returns {function} - Wrapped handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  SquareApiError,
  errorHandler,
  handleSquareError,
  notFoundHandler,
  asyncHandler
};
