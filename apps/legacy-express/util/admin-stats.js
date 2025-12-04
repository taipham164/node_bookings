/*
Admin dashboard statistics and analytics utilities
*/

const { bookingsApi, customersApi, catalogApi } = require("./square-client");
const { logger } = require("./logger");

/**
 * Get today's appointments
 */
async function getTodaysAppointments(locationId) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { result } = await bookingsApi.listBookings(
      100,
      undefined,
      undefined,
      undefined,
      startOfDay.toISOString(),
      endOfDay.toISOString(),
      locationId
    );

    return result.bookings || [];
  } catch (error) {
    logger.error("Failed to get today's appointments", { error: error.message });
    return [];
  }
}

/**
 * Get appointment statistics
 */
async function getAppointmentStats(locationId) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { result } = await bookingsApi.listBookings(
      100,
      undefined,
      undefined,
      undefined,
      startOfDay.toISOString(),
      endOfDay.toISOString(),
      locationId
    );

    const bookings = result.bookings || [];
    const now = new Date();

    return {
      total: bookings.length,
      upcoming: bookings.filter(b => new Date(b.startAt) > now).length,
      completed: bookings.filter(b => new Date(b.startAt) <= now && b.status === "COMPLETED").length,
      cancelled: bookings.filter(b => b.status === "CANCELLED").length,
      noShow: bookings.filter(b => b.status === "NO_SHOW").length
    };
  } catch (error) {
    logger.error("Failed to get appointment stats", { error: error.message });
    return {
      total: 0,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0
    };
  }
}

/**
 * Get revenue estimate based on appointments
 */
async function getRevenueStats(locationId) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { result } = await bookingsApi.listBookings(
      100,
      undefined,
      undefined,
      undefined,
      startOfDay.toISOString(),
      endOfDay.toISOString(),
      locationId
    );

    const bookings = result.bookings || [];
    let totalRevenue = 0;
    let completedCount = 0;

    // Calculate revenue from completed appointments
    for (const booking of bookings) {
      if (booking.status === "COMPLETED" && booking.appointmentSegments) {
        for (const segment of booking.appointmentSegments) {
          try {
            const { result: { object } } = await catalogApi.retrieveCatalogObject(segment.serviceVariationId);
            if (object.itemVariationData?.priceMoney?.amount) {
              totalRevenue += Number(object.itemVariationData.priceMoney.amount);
              completedCount++;
            }
          } catch (e) {
            // Continue if service not found
          }
        }
      }
    }

    return {
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      completedCount,
      averageValue: completedCount > 0 ? (totalRevenue / completedCount / 100).toFixed(2) : 0
    };
  } catch (error) {
    logger.error("Failed to get revenue stats", { error: error.message });
    return {
      totalRevenue: 0,
      completedCount: 0,
      averageValue: 0
    };
  }
}

/**
 * Get customer statistics
 */
async function getCustomerStats() {
  try {
    const { result } = await customersApi.listCustomers(100);
    const customers = result.customers || [];

    return {
      total: customers.length,
      active: customers.filter(c => c.createdAt).length,
      withPhone: customers.filter(c => c.phoneNumber).length,
      withEmail: customers.filter(c => c.emailAddress).length
    };
  } catch (error) {
    logger.error("Failed to get customer stats", { error: error.message });
    return {
      total: 0,
      active: 0,
      withPhone: 0,
      withEmail: 0
    };
  }
}

/**
 * Get upcoming appointments for the next 7 days
 */
async function getUpcomingAppointments(locationId, days = 7) {
  try {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    const { result } = await bookingsApi.listBookings(
      100,
      undefined,
      undefined,
      undefined,
      startDate.toISOString(),
      endDate.toISOString(),
      locationId
    );

    const bookings = (result.bookings || []).sort((a, b) =>
      new Date(a.startAt) - new Date(b.startAt)
    );

    return bookings.slice(0, 10); // Return top 10
  } catch (error) {
    logger.error("Failed to get upcoming appointments", { error: error.message });
    return [];
  }
}

/**
 * Get services list with pricing
 */
async function getServicesWithPricing() {
  try {
    const { result } = await catalogApi.listCatalog(undefined, "ITEM_VARIATION");
    const items = result.objects || [];

    const services = [];
    for (const item of items) {
      if (item.itemVariationData) {
        services.push({
          id: item.id,
          name: item.itemVariationData.name || "Unknown",
          price: item.itemVariationData.priceMoney?.amount || 0,
          duration: item.itemVariationData.serviceDuration || 0
        });
      }
    }

    return services;
  } catch (error) {
    logger.error("Failed to get services", { error: error.message });
    return [];
  }
}

/**
 * Format time duration in human-readable format
 */
function formatDuration(milliseconds) {
  if (!milliseconds) return "N/A";
  const minutes = Math.round(milliseconds / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

/**
 * Format currency
 */
function formatCurrency(cents, currency = "USD") {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency
  }).format(dollars);
}

module.exports = {
  getTodaysAppointments,
  getAppointmentStats,
  getRevenueStats,
  getCustomerStats,
  getUpcomingAppointments,
  getServicesWithPricing,
  formatDuration,
  formatCurrency
};
