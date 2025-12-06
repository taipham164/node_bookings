/*
Admin role and permissions management
*/

/**
 * Admin roles for the barbershop
 */
const ADMIN_ROLES = {
  SUPER_ADMIN: "super_admin",    // Full access to everything
  MANAGER: "manager",            // Can manage staff, appointments, reports
  STAFF: "staff",               // Can view own appointments and customer info
  CUSTOMER: "customer"           // Regular customer (no admin access)
};

/**
 * Permission mapping for different roles
 */
const ROLE_PERMISSIONS = {
  super_admin: {
    dashboard: true,
    appointments: ["view", "create", "edit", "delete", "reschedule", "cancel"],
    staff: ["view", "create", "edit", "delete", "manage_availability"],
    customers: ["view", "create", "edit", "delete"],
    services: ["view", "create", "edit", "delete"],
    inventory: ["view", "create", "edit", "delete"],
    reports: ["view", "export"],
    settings: ["view", "edit"],
    payments: ["view", "refund"],
    admin_users: ["view", "create", "edit", "delete"]
  },
  manager: {
    dashboard: true,
    appointments: ["view", "create", "edit", "reschedule", "cancel"],
    staff: ["view", "manage_availability"],
    customers: ["view", "create", "edit"],
    services: ["view"],
    inventory: ["view", "create", "edit"],
    reports: ["view", "export"],
    settings: ["view"],
    payments: ["view"],
    admin_users: []
  },
  staff: {
    dashboard: false,
    appointments: ["view"],
    staff: [],
    customers: ["view"],
    services: ["view"],
    inventory: [],
    reports: [],
    settings: [],
    payments: [],
    admin_users: []
  },
  customer: {
    dashboard: false,
    appointments: [],
    staff: [],
    customers: [],
    services: [],
    inventory: [],
    reports: [],
    settings: [],
    payments: [],
    admin_users: []
  }
};

/**
 * Check if user has a specific permission
 * @param {object} user - User object with role
 * @param {string} resource - Resource name (e.g., 'appointments')
 * @param {string} action - Action name (e.g., 'create')
 * @returns {boolean}
 */
function hasPermission(user, resource, action) {
  if (!user || !user.role) return false;

  const permissions = ROLE_PERMISSIONS[user.role];
  if (!permissions) return false;

  const resourcePerms = permissions[resource];
  if (!resourcePerms) return false;

  if (typeof resourcePerms === "boolean") return resourcePerms;
  if (Array.isArray(resourcePerms)) return resourcePerms.includes(action);

  return false;
}

/**
 * Get user's role display name
 */
function getRoleDisplayName(role) {
  const names = {
    super_admin: "Super Administrator",
    manager: "Manager",
    staff: "Staff Member",
    customer: "Customer"
  };
  return names[role] || "Unknown";
}

module.exports = {
  ADMIN_ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
  getRoleDisplayName
};
