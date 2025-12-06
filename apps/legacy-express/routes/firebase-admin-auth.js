/*
Firebase Admin Authentication routes
*/

const express = require("express");
const router = express.Router();
const { firebaseAdminManager } = require("../util/firebase-admin");
const { ADMIN_ROLES } = require("../util/admin-roles");
const { requireAdmin, requireRole } = require("../middleware/adminMiddleware");
const { asyncHandler, ValidationError, AuthenticationError } = require("../middleware/errorHandler");
const { logger } = require("../util/logger");

/**
 * POST /auth/admin/firebase/verify
 * Verify Firebase ID token and establish admin session
 */
router.post("/firebase/verify", asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ValidationError("Firebase ID token is required");
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await firebaseAdminManager.verifyIdToken(idToken);
    
    // Check if user is an admin
    const adminUser = await firebaseAdminManager.getAdminUser(decodedToken.uid);
    
    if (!adminUser || adminUser.status !== 'active') {
      logger.warn("Non-admin Firebase user attempted admin access", { 
        uid: decodedToken.uid, 
        email: decodedToken.email 
      });
      throw new AuthenticationError("Admin access denied");
    }

    // Store Firebase user info in session
    req.session.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      phoneNumber: decodedToken.phone_number,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture
    };

    // Update last login
    await firebaseAdminManager.updateLastLogin(decodedToken.uid);

    logger.info("Admin Firebase authentication successful", { 
      uid: decodedToken.uid, 
      email: decodedToken.email,
      role: adminUser.role
    });

    res.json({
      success: true,
      message: "Authentication successful",
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        role: adminUser.role,
        permissions: adminUser.permissions
      },
      redirect: "/admin"
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    logger.error("Firebase ID token verification failed", { error: error.message });
    throw new AuthenticationError("Invalid Firebase authentication token");
  }
}));

/**
 * POST /auth/admin/logout
 * Admin logout and session cleanup
 */
router.post("/logout", asyncHandler(async (req, res) => {
  const firebaseUser = req.session.firebaseUser;
  
  if (firebaseUser) {
    logger.info("Admin user logged out", { 
      uid: firebaseUser.uid, 
      email: firebaseUser.email 
    });
  }

  req.session.destroy((err) => {
    if (err) {
      logger.error("Session destruction error:", { error: err.message });
    }
  });

  res.json({
    success: true,
    message: "Logout successful",
    redirect: "/admin/login"
  });
}));

/**
 * GET /auth/admin/me
 * Get current admin user info
 */
router.get("/me", requireAdmin, asyncHandler(async (req, res) => {
  const adminUser = req.adminUser;
  
  res.json({
    success: true,
    user: {
      uid: adminUser.uid,
      email: adminUser.email,
      displayName: adminUser.displayName,
      phoneNumber: adminUser.phoneNumber,
      role: adminUser.role,
      status: adminUser.status,
      permissions: adminUser.permissions,
      lastLoginAt: adminUser.lastLoginAt,
      createdAt: adminUser.createdAt
    }
  });
}));

/**
 * PUT /auth/admin/profile
 * Update admin user profile
 */
router.put("/profile", requireAdmin, asyncHandler(async (req, res) => {
  const { displayName, phoneNumber } = req.body;
  const adminUser = req.adminUser;

  // Update admin user profile
  await firebaseAdminManager.setAdminUser(adminUser.uid, {
    ...adminUser,
    displayName: displayName || adminUser.displayName,
    phoneNumber: phoneNumber || adminUser.phoneNumber
  });

  logger.info("Admin profile updated", { uid: adminUser.uid });

  res.json({
    success: true,
    message: "Profile updated successfully"
  });
}));

/**
 * GET /auth/admin/users
 * List all admin users (super admin only)
 */
router.get("/users", requireRole("super_admin"), asyncHandler(async (req, res) => {
  const { role, status, limit = 50, startAfter } = req.query;
  
  const filters = {};
  if (role) filters.role = role;
  if (status) filters.status = status;
  if (limit) filters.limit = parseInt(limit);
  if (startAfter) filters.startAfter = startAfter;

  const users = await firebaseAdminManager.listAdminUsers(filters);

  res.json({
    success: true,
    users: users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    })),
    count: users.length
  });
}));

/**
 * POST /auth/admin/users
 * Create new admin user (super admin only)
 */
router.post("/users", requireRole("super_admin"), asyncHandler(async (req, res) => {
  const { email, password, displayName, phoneNumber, role, notes } = req.body;

  // Validation
  if (!email || !password || !role) {
    throw new ValidationError("Email, password, and role are required");
  }

  if (!Object.values(ADMIN_ROLES).includes(role)) {
    throw new ValidationError("Invalid role specified");
  }

  if (password.length < 6) {
    throw new ValidationError("Password must be at least 6 characters long");
  }

  // Create admin user
  const userRecord = await firebaseAdminManager.createAdminUserWithEmail(
    email,
    password,
    {
      displayName,
      phoneNumber,
      role,
      notes,
      createdBy: req.adminUser.uid
    }
  );

  logger.info("New admin user created", { 
    newUserUid: userRecord.uid,
    email: userRecord.email,
    role: role,
    createdBy: req.adminUser.uid
  });

  res.status(201).json({
    success: true,
    message: "Admin user created successfully",
    user: {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: role
    }
  });
}));

/**
 * PUT /auth/admin/users/:uid
 * Update admin user (super admin only)
 */
router.put("/users/:uid", requireRole("super_admin"), asyncHandler(async (req, res) => {
  const { uid } = req.params;
  const { displayName, phoneNumber, role, status, notes } = req.body;

  // Prevent self-role/status change
  if (uid === req.adminUser.uid) {
    if (role && role !== req.adminUser.role) {
      throw new ValidationError("Cannot change your own role");
    }
    if (status && status !== req.adminUser.status) {
      throw new ValidationError("Cannot change your own status");
    }
  }

  // Get current admin user
  const currentAdminUser = await firebaseAdminManager.getAdminUser(uid);
  if (!currentAdminUser) {
    throw new ValidationError("Admin user not found");
  }

  // Update admin user profile
  const updatedData = {
    ...currentAdminUser,
    displayName: displayName || currentAdminUser.displayName,
    phoneNumber: phoneNumber || currentAdminUser.phoneNumber,
    role: role || currentAdminUser.role,
    status: status || currentAdminUser.status,
    notes: notes !== undefined ? notes : currentAdminUser.notes
  };

  await firebaseAdminManager.setAdminUser(uid, updatedData);

  // Update custom claims if role changed
  if (role && role !== currentAdminUser.role) {
    await firebaseAdminManager.setCustomClaims(uid, {
      role: role,
      admin: true
    });
  }

  logger.info("Admin user updated", { 
    uid: uid,
    updatedBy: req.adminUser.uid
  });

  res.json({
    success: true,
    message: "Admin user updated successfully"
  });
}));

/**
 * DELETE /auth/admin/users/:uid
 * Delete admin user (super admin only)
 */
router.delete("/users/:uid", requireRole("super_admin"), asyncHandler(async (req, res) => {
  const { uid } = req.params;

  // Prevent self-deletion
  if (uid === req.adminUser.uid) {
    throw new ValidationError("Cannot delete your own account");
  }

  // Get admin user to log details
  const adminUser = await firebaseAdminManager.getAdminUser(uid);
  if (!adminUser) {
    throw new ValidationError("Admin user not found");
  }

  // Delete admin user
  await firebaseAdminManager.deleteAdminUser(uid, req.adminUser.uid);

  logger.info("Admin user deleted", { 
    uid: uid,
    email: adminUser.email,
    deletedBy: req.adminUser.uid
  });

  res.json({
    success: true,
    message: "Admin user deleted successfully"
  });
}));

/**
 * POST /auth/admin/setup
 * Initial admin setup (only works if no super admin exists)
 */
router.post("/setup", asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }

  // Check if any super admin exists
  const existingSuperAdmins = await firebaseAdminManager.listAdminUsers({ 
    role: ADMIN_ROLES.SUPER_ADMIN, 
    limit: 1 
  });

  if (existingSuperAdmins.length > 0) {
    throw new ValidationError("Super admin already exists. Use normal admin creation.");
  }

  // Create first super admin
  const userRecord = await firebaseAdminManager.createAdminUserWithEmail(
    email,
    password,
    {
      displayName: displayName || "Super Administrator",
      role: ADMIN_ROLES.SUPER_ADMIN,
      notes: "Initial super admin created during setup"
    }
  );

  logger.info("Initial super admin created", { 
    uid: userRecord.uid,
    email: userRecord.email
  });

  res.status(201).json({
    success: true,
    message: "Initial super admin created successfully",
    user: {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName
    }
  });
}));

module.exports = router;