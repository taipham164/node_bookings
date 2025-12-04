/*
Admin and role-based access control middleware with Firebase Auth
*/

const { AuthenticationError, AuthorizationError } = require("./errorHandler");
const { hasPermission, ADMIN_ROLES, getRoleDisplayName } = require("../util/admin-roles");
const { firebaseAdminManager } = require("../util/firebase-admin");
const { logger } = require("../util/logger");

/**
 * Check if user is authenticated via Firebase
 */
function requireAuth(req, res, next) {
  if (!req.session?.firebaseUser) {
    return next(new AuthenticationError("Admin authentication required"));
  }

  // Update last activity
  req.session.firebaseUser.lastActivity = Date.now();
  next();
}

/**
 * Check if user is an admin (any admin role)
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const firebaseUser = req.session.firebaseUser;
      
      // Get admin user profile from Firestore
      const adminUser = await firebaseAdminManager.getAdminUser(firebaseUser.uid);
      
      if (!adminUser || adminUser.status !== 'active') {
        logger.warn("Unauthorized admin access attempt", {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          path: req.path
        });
        return next(new AuthorizationError("Admin access required"));
      }

      // Attach admin user to request for downstream use
      req.adminUser = adminUser;
      
      // Update last login timestamp
      await firebaseAdminManager.updateLastLogin(firebaseUser.uid);

      next();
    } catch (error) {
      logger.error("Admin authentication error", { error: error.message });
      return next(new AuthenticationError("Admin authentication failed"));
    }
  });
}

/**
 * Check if user has specific role
 * @param {...string} allowedRoles - Role names to allow
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    requireAdmin(req, res, () => {
      const adminUser = req.adminUser;

      if (!adminUser.role || !allowedRoles.includes(adminUser.role)) {
        logger.warn("Insufficient role for admin action", {
          uid: adminUser.uid,
          requiredRole: allowedRoles,
          userRole: adminUser.role,
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
    requireAdmin(req, res, () => {
      const adminUser = req.adminUser;

      if (!adminUser.hasPermission(resource, action)) {
        logger.warn("Permission denied", {
          uid: adminUser.uid,
          role: adminUser.role,
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
  if (req.adminUser) {
    res.locals.user = req.adminUser;
    res.locals.isAdmin = true;
  } else if (req.session?.firebaseUser) {
    res.locals.user = req.session.firebaseUser;
    res.locals.isAdmin = false;
  }
  next();
}

/**
 * Attach admin utilities to request
 */
function attachAdminUtils(req, res, next) {
  res.locals.hasPermission = (resource, action) => {
    if (req.adminUser) {
      return req.adminUser.hasPermission(resource, action);
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
