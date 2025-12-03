/*
Admin and role-based access control middleware
*/

const { AuthenticationError, AuthorizationError } = require("./errorHandler");
const { hasPermission, ADMIN_ROLES } = require("../util/admin-roles");
const { logger } = require("../util/logger");

/**
 * Check if user is authenticated
 */
function requireAuth(req, res, next) {
  if (!req.session?.authenticatedCustomer) {
    return next(new AuthenticationError("Admin authentication required"));
  }

  // Update last activity
  req.session.authenticatedCustomer.lastActivity = Date.now();
  next();
}

/**
 * Check if user is an admin (any admin role)
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const user = req.session.authenticatedCustomer;
    const adminRoles = Object.values(ADMIN_ROLES);

    if (!user.role || !adminRoles.includes(user.role)) {
      logger.warn("Unauthorized admin access attempt", {
        customerId: user.id,
        role: user.role,
        path: req.path
      });
      return next(new AuthorizationError("Admin access required"));
    }

    next();
  });
}

/**
 * Check if user has specific role
 * @param {...string} allowedRoles - Role names to allow
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      const user = req.session.authenticatedCustomer;

      if (!user.role || !allowedRoles.includes(user.role)) {
        logger.warn("Insufficient role for admin action", {
          customerId: user.id,
          requiredRole: allowedRoles,
          userRole: user.role,
          path: req.path
        });
        return next(
          new AuthorizationError(`Required role: ${allowedRoles.join(" or ")}`)
        );
      }

      next();
    });
  };
}

/**
 * Check if user has specific permission
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 */
function requirePermission(resource, action) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      const user = req.session.authenticatedCustomer;

      if (!hasPermission(user, resource, action)) {
        logger.warn("Permission denied", {
          customerId: user.id,
          role: user.role,
          resource,
          action,
          path: req.path
        });
        return next(
          new AuthorizationError(
            `Permission denied: ${resource}/${action}`
          )
        );
      }

      next();
    });
  };
}

/**
 * Make user data available to all views
 */
function attachUserToLocals(req, res, next) {
  if (req.session?.authenticatedCustomer) {
    res.locals.user = req.session.authenticatedCustomer;
    res.locals.isAdmin = Object.values(ADMIN_ROLES).includes(
      req.session.authenticatedCustomer.role
    );
  }
  next();
}

/**
 * Attach admin utilities to request
 */
function attachAdminUtils(req, res, next) {
  const { hasPermission, getRoleDisplayName } = require("../util/admin-roles");

  res.locals.hasPermission = (resource, action) => {
    if (req.session?.authenticatedCustomer) {
      return hasPermission(req.session.authenticatedCustomer, resource, action);
    }
    return false;
  };

  res.locals.getRoleDisplayName = getRoleDisplayName;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireRole,
  requirePermission,
  attachUserToLocals,
  attachAdminUtils
};
