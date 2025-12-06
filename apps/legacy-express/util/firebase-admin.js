/*
Firebase Admin SDK configuration and utilities
*/

const admin = require('firebase-admin');
const { logger } = require('./logger');
const { ADMIN_ROLES, ROLE_PERMISSIONS, hasPermission, getRoleDisplayName } = require('./admin-roles');

let firebaseAdmin = null;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebaseAdmin() {
  try {
    if (firebaseAdmin) return firebaseAdmin;

    // Initialize with service account key or default credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    } else {
      // For development, use default project
      firebaseAdmin = admin.initializeApp();
    }

    logger.info('Firebase Admin SDK initialized successfully');
    return firebaseAdmin;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', { error: error.message });
    throw error;
  }
}

/**
 * Firebase Admin User Management Class
 */
class FirebaseAdminManager {
  constructor() {
    this.admin = initializeFirebaseAdmin();
    this.auth = this.admin.auth();
    this.firestore = this.admin.firestore();
    
    // Admin user collection in Firestore
    this.adminUsersCollection = 'admin_users';
  }

  /**
   * Verify Firebase ID token and get user info
   */
  async verifyIdToken(idToken) {
    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.warn('Invalid Firebase ID token:', { error: error.message });
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Get admin user profile by Firebase UID
   */
  async getAdminUser(uid) {
    try {
      const doc = await this.firestore
        .collection(this.adminUsersCollection)
        .doc(uid)
        .get();

      if (!doc.exists) {
        return null;
      }

      const userData = doc.data();
      return {
        uid,
        ...userData,
        hasPermission: (resource, action) => hasPermission(userData, resource, action),
        getRoleDisplayName: () => getRoleDisplayName(userData.role)
      };
    } catch (error) {
      logger.error('Error fetching admin user:', { uid, error: error.message });
      throw error;
    }
  }

  /**
   * Create or update admin user profile
   */
  async setAdminUser(uid, userData) {
    try {
      const adminData = {
        email: userData.email,
        displayName: userData.displayName || null,
        phoneNumber: userData.phoneNumber || null,
        role: userData.role || ADMIN_ROLES.STAFF,
        status: userData.status || 'active',
        permissions: ROLE_PERMISSIONS[userData.role] || ROLE_PERMISSIONS.staff,
        createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: userData.lastLoginAt || null,
        createdBy: userData.createdBy || null,
        notes: userData.notes || null
      };

      await this.firestore
        .collection(this.adminUsersCollection)
        .doc(uid)
        .set(adminData, { merge: true });

      logger.info('Admin user profile updated:', { uid, role: adminData.role });
      return adminData;
    } catch (error) {
      logger.error('Error setting admin user:', { uid, error: error.message });
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(uid) {
    try {
      await this.firestore
        .collection(this.adminUsersCollection)
        .doc(uid)
        .update({
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      logger.warn('Failed to update last login:', { uid, error: error.message });
    }
  }

  /**
   * Get all admin users (super admin only)
   */
  async listAdminUsers(filters = {}) {
    try {
      let query = this.firestore.collection(this.adminUsersCollection);

      // Apply filters
      if (filters.role) {
        query = query.where('role', '==', filters.role);
      }
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      // Order by creation date
      query = query.orderBy('createdAt', 'desc');

      // Apply pagination
      if (filters.limit) {
        query = query.limit(parseInt(filters.limit));
      }
      if (filters.startAfter) {
        query = query.startAfter(filters.startAfter);
      }

      const snapshot = await query.get();
      const users = [];

      snapshot.forEach(doc => {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          ...userData,
          // Convert Firestore timestamps to regular dates
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
          updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
          lastLoginAt: userData.lastLoginAt?.toDate?.() || userData.lastLoginAt
        });
      });

      return users;
    } catch (error) {
      logger.error('Error listing admin users:', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete admin user
   */
  async deleteAdminUser(uid, deletedBy) {
    try {
      // Delete from Firestore
      await this.firestore
        .collection(this.adminUsersCollection)
        .doc(uid)
        .delete();

      // Optionally disable the Firebase Auth user (don't delete to preserve audit trail)
      await this.auth.updateUser(uid, { disabled: true });

      logger.info('Admin user deleted:', { uid, deletedBy });
      return true;
    } catch (error) {
      logger.error('Error deleting admin user:', { uid, error: error.message });
      throw error;
    }
  }

  /**
   * Set custom claims for a user (for role-based access)
   */
  async setCustomClaims(uid, claims) {
    try {
      await this.auth.setCustomUserClaims(uid, claims);
      logger.info('Custom claims set:', { uid, claims });
    } catch (error) {
      logger.error('Error setting custom claims:', { uid, error: error.message });
      throw error;
    }
  }

  /**
   * Create admin user with email and password (for initial setup)
   */
  async createAdminUserWithEmail(email, password, userData = {}) {
    try {
      // Create Firebase Auth user
      const userRecord = await this.auth.createUser({
        email: email,
        password: password,
        displayName: userData.displayName || null,
        phoneNumber: userData.phoneNumber || null,
        disabled: false
      });

      // Set custom claims for role
      await this.setCustomClaims(userRecord.uid, {
        role: userData.role || ADMIN_ROLES.STAFF,
        admin: true
      });

      // Create admin profile in Firestore
      await this.setAdminUser(userRecord.uid, {
        email: userRecord.email,
        displayName: userRecord.displayName,
        phoneNumber: userRecord.phoneNumber,
        role: userData.role || ADMIN_ROLES.STAFF,
        status: 'active',
        createdBy: userData.createdBy || null,
        notes: userData.notes || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      logger.info('Admin user created successfully:', { 
        uid: userRecord.uid, 
        email: userRecord.email,
        role: userData.role 
      });

      return userRecord;
    } catch (error) {
      logger.error('Error creating admin user:', { email, error: error.message });
      throw error;
    }
  }

  /**
   * Check if user exists and is admin
   */
  async isAdminUser(uid) {
    try {
      const adminUser = await this.getAdminUser(uid);
      return adminUser && adminUser.status === 'active';
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize default super admin (for first-time setup)
   */
  async initializeDefaultAdmin() {
    try {
      // Check if any super admin exists
      const adminUsers = await this.listAdminUsers({ role: ADMIN_ROLES.SUPER_ADMIN, limit: 1 });
      
      if (adminUsers.length === 0) {
        logger.info('No super admin found. Creating default admin...');
        
        const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@barbershop.com';
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
        
        await this.createAdminUserWithEmail(defaultEmail, defaultPassword, {
          displayName: 'Super Administrator',
          role: ADMIN_ROLES.SUPER_ADMIN,
          notes: 'Default admin created during initialization'
        });

        logger.info('Default super admin created:', { 
          email: defaultEmail,
          password: defaultPassword 
        });
        logger.warn('IMPORTANT: Change the default admin password after first login!');
      } else {
        logger.info('Super admin already exists, skipping default admin creation');
      }
    } catch (error) {
      logger.error('Failed to initialize default admin:', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
const firebaseAdminManager = new FirebaseAdminManager();

module.exports = {
  firebaseAdmin,
  firebaseAdminManager,
  initializeFirebaseAdmin
};