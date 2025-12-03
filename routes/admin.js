/*
Admin dashboard and management routes
*/

const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const { requireAdmin, requireRole, requirePermission, attachUserToLocals, attachAdminUtils } = require("../middleware/adminMiddleware");
const { asyncHandler, ValidationError } = require("../middleware/errorHandler");
const { logger } = require("../util/logger");
const {
  getTodaysAppointments,
  getAppointmentStats,
  getRevenueStats,
  getCustomerStats,
  getUpcomingAppointments,
  getServicesWithPricing,
  formatDuration,
  formatCurrency
} = require("../util/admin-stats");
const { ADMIN_ROLES, getRoleDisplayName } = require("../util/admin-roles");
const {
  bookingsApi,
  customersApi,
  catalogApi,
  cardsApi
} = require("../util/square-client");

require("dotenv").config();
const locationId = process.env.SQ_LOCATION_ID;

// Apply admin middleware to all routes
router.use(attachUserToLocals);
router.use(attachAdminUtils);
router.use(requireAdmin);

/**
 * GET /admin
 * Admin dashboard home page
 */
router.get(
  "/",
  requirePermission("dashboard", "view"),
  asyncHandler(async (req, res) => {
    logger.info("Admin dashboard accessed", { userId: req.session.authenticatedCustomer.id });

    const [appointmentStats, revenueStats, customerStats, upcomingAppointments] = await Promise.all([
      getAppointmentStats(locationId),
      getRevenueStats(locationId),
      getCustomerStats(),
      getUpcomingAppointments(locationId, 7)
    ]);

    res.render("pages/admin/dashboard", {
      title: "Admin Dashboard",
      appointmentStats,
      revenueStats,
      customerStats,
      upcomingAppointments,
      formatCurrency,
      formatDuration,
      location: req.app.locals.location
    });
  })
);

/**
 * GET /admin/appointments
 * View all appointments with filtering
 */
router.get(
  "/appointments",
  requirePermission("appointments", "view"),
  asyncHandler(async (req, res) => {
    const { date, status, staffId } = req.query;
    logger.info("Viewing appointments", { userId: req.session.authenticatedCustomer.id, filters: { date, status, staffId } });

    const filterDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
    const endOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate() + 1);

    const { result } = await bookingsApi.listBookings(
      100,
      undefined,
      undefined,
      undefined,
      startOfDay.toISOString(),
      endOfDay.toISOString(),
      locationId
    );

    let appointments = result.bookings || [];

    // Apply filters
    if (status) {
      appointments = appointments.filter(a => a.status === status);
    }
    if (staffId) {
      appointments = appointments.filter(a =>
        a.appointmentSegments?.some(s => s.teamMemberId === staffId)
      );
    }

    res.render("pages/admin/appointments", {
      title: "Appointments Management",
      appointments,
      selectedDate: date || new Date().toISOString().split("T")[0],
      selectedStatus: status,
      selectedStaffId: staffId,
      statuses: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"],
      formatDuration,
      location: req.app.locals.location
    });
  })
);

/**
 * GET /admin/appointments/:appointmentId
 * View appointment details
 */
router.get(
  "/appointments/:appointmentId",
  requirePermission("appointments", "view"),
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;

    const { result: { booking } } = await bookingsApi.retrieveBooking(appointmentId);
    let customerInfo = null;

    if (booking.customerId) {
      try {
        const { result: { customer } } = await customersApi.retrieveCustomer(booking.customerId);
        customerInfo = customer;
      } catch (e) {
        logger.warn("Could not retrieve customer info", { customerId: booking.customerId });
      }
    }

    res.render("pages/admin/appointment-detail", {
      title: "Appointment Details",
      booking,
      customerInfo,
      formatDuration,
      location: req.app.locals.location
    });
  })
);

/**
 * POST /admin/appointments/:appointmentId/reschedule
 * Reschedule an appointment
 */
router.post(
  "/appointments/:appointmentId/reschedule",
  requirePermission("appointments", "reschedule"),
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { newStartAt } = req.body;

    if (!newStartAt) {
      throw new ValidationError("New appointment time is required");
    }

    logger.info("Rescheduling appointment", { appointmentId, newStartAt, userId: req.session.authenticatedCustomer.id });

    const { result: { booking } } = await bookingsApi.retrieveBooking(appointmentId);
    const { result: { booking: updatedBooking } } = await bookingsApi.updateBooking(appointmentId, {
      booking: {
        startAt: newStartAt,
        version: booking.version
      }
    });

    logger.info("Appointment rescheduled successfully", { appointmentId, newStartAt });

    res.json({
      success: true,
      message: "Appointment rescheduled successfully",
      booking: updatedBooking
    });
  })
);

/**
 * POST /admin/appointments/:appointmentId/cancel
 * Cancel an appointment
 */
router.post(
  "/appointments/:appointmentId/cancel",
  requirePermission("appointments", "cancel"),
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    logger.info("Cancelling appointment", { appointmentId, reason, userId: req.session.authenticatedCustomer.id });

    const { result: { booking } } = await bookingsApi.retrieveBooking(appointmentId);
    await bookingsApi.cancelBooking(appointmentId, { bookingVersion: booking.version });

    logger.info("Appointment cancelled successfully", { appointmentId });

    res.json({
      success: true,
      message: "Appointment cancelled successfully"
    });
  })
);

/**
 * GET /admin/customers
 * View all customers
 */
router.get(
  "/customers",
  requirePermission("customers", "view"),
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    logger.info("Viewing customers", { userId: req.session.authenticatedCustomer.id });

    const { result } = await customersApi.listCustomers(100);
    let customers = result.customers || [];

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(c =>
        c.givenName?.toLowerCase().includes(searchLower) ||
        c.familyName?.toLowerCase().includes(searchLower) ||
        c.emailAddress?.toLowerCase().includes(searchLower) ||
        c.phoneNumber?.includes(search)
      );
    }

    res.render("pages/admin/customers", {
      title: "Customers Management",
      customers,
      searchTerm: search,
      location: req.app.locals.location
    });
  })
);

/**
 * GET /admin/customers/:customerId
 * View customer details and history
 */
router.get(
  "/customers/:customerId",
  requirePermission("customers", "view"),
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    logger.info("Viewing customer details", { customerId, userId: req.session.authenticatedCustomer.id });

    const { result: { customer } } = await customersApi.retrieveCustomer(customerId);

    // Get customer's appointments
    const { result: bookingsResult } = await bookingsApi.listBookings(100, undefined, customerId);
    const bookings = bookingsResult.bookings || [];

    res.render("pages/admin/customer-detail", {
      title: "Customer Details",
      customer,
      bookings,
      formatDuration,
      location: req.app.locals.location
    });
  })
);

/**
 * GET /admin/services
 * View and manage services
 */
router.get(
  "/services",
  requirePermission("services", "view"),
  asyncHandler(async (req, res) => {
    logger.info("Viewing services", { userId: req.session.authenticatedCustomer.id });

    const services = await getServicesWithPricing();

    res.render("pages/admin/services", {
      title: "Services Management",
      services,
      formatCurrency,
      formatDuration,
      location: req.app.locals.location
    });
  })
);

/**
 * GET /admin/staff
 * View staff members and their schedule
 */
router.get(
  "/staff",
  requirePermission("staff", "view"),
  asyncHandler(async (req, res) => {
    logger.info("Viewing staff", { userId: req.session.authenticatedCustomer.id });

    // Get staff from bookings (team members)
    // In a real scenario, you'd have a separate staff database
    const { result: teamResult } = await bookingsApi.listTeamMemberBookingProfiles(100);
    const staff = teamResult.teamMemberBookingProfiles || [];

    res.render("pages/admin/staff", {
      title: "Staff Management",
      staff,
      location: req.app.locals.location
    });
  })
);

/**
 * GET /admin/reports
 * View business reports and analytics
 */
router.get(
  "/reports",
  requirePermission("reports", "view"),
  asyncHandler(async (req, res) => {
    const { period = "today" } = req.query;

    logger.info("Viewing reports", { userId: req.session.authenticatedCustomer.id, period });

    const appointmentStats = await getAppointmentStats(locationId);
    const revenueStats = await getRevenueStats(locationId);
    const customerStats = await getCustomerStats();

    res.render("pages/admin/reports", {
      title: "Reports & Analytics",
      appointmentStats,
      revenueStats,
      customerStats,
      period,
      formatCurrency,
      location: req.app.locals.location
    });
  })
);

/**
 * GET /admin/settings
 * Admin settings
 */
router.get(
  "/settings",
  requireRole("super_admin", "manager"),
  asyncHandler(async (req, res) => {
    logger.info("Viewing admin settings", { userId: req.session.authenticatedCustomer.id });

    res.render("pages/admin/settings", {
      title: "Admin Settings",
      location: req.app.locals.location
    });
  })
);

/**
 * GET /admin/inventory
 * Inventory management
 */
router.get(
  "/inventory",
  requirePermission("inventory", "view"),
  asyncHandler(async (req, res) => {
    logger.info("Viewing inventory", { userId: req.session.authenticatedCustomer.id });

    res.render("pages/admin/inventory", {
      title: "Inventory Management",
      inventory: [], // Placeholder for inventory items
      location: req.app.locals.location
    });
  })
);

module.exports = router;
