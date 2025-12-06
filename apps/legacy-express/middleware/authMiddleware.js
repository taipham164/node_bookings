/*
Authentication and authorization middleware
*/

const { AuthenticationError, AuthorizationError } = require('./errorHandler');

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req, res, next) {
  if (!req.session?.authenticatedCustomer) {
    return next(new AuthenticationError('Please log in to continue'));
  }

  // Check session expiration
  if (req.session.authenticatedCustomer.sessionExpires &&
      Date.now() > req.session.authenticatedCustomer.sessionExpires) {
    delete req.session.authenticatedCustomer;
    return next(new AuthenticationError('Your session has expired. Please log in again.'));
  }

  // Update last activity timestamp
  req.session.authenticatedCustomer.lastActivity = Date.now();
  next();
}

/**
 * Middleware to check if user owns the resource (for customer-specific endpoints)
 * @param {string} paramName - The request param containing the customer ID
 */
function requireOwnership(paramName = 'customerId') {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      const resourceOwnerId = req.params[paramName];
      const authenticatedId = req.session.authenticatedCustomer.id;

      if (resourceOwnerId !== authenticatedId) {
        return next(new AuthorizationError('You do not have permission to access this resource'));
      }

      next();
    });
  };
}

/**
 * Middleware to verify that user can access their own booking
 */
function requireBookingAccess(req, res, next) {
  requireAuth(req, res, () => {
    // For booking access, we would need to verify the booking belongs to the authenticated customer
    // This would require a database lookup or Square API call
    // For now, we'll allow it if authenticated
    next();
  });
}

/**
 * Middleware to prevent CSRF attacks (token validation)
 */
function csrfProtection(req, res, next) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.body._csrf || req.get('x-csrf-token');
    const sessionToken = req.session?.csrfToken;

    if (!token || token !== sessionToken) {
      return next(new Error('CSRF token validation failed'));
    }
  }

  next();
}

/**
 * Middleware to generate CSRF token for session
 */
function generateCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    const crypto = require('crypto');
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

module.exports = {
  requireAuth,
  requireOwnership,
  requireBookingAccess,
  csrfProtection,
  generateCsrfToken
};
