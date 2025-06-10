/*
Copyright 2021 Square Inc.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const express = require("express");
const router = express.Router();
require("dotenv").config();

const locationId = process.env["SQ_LOCATION_ID"];

const {
  catalogApi,
} = require("../util/square-client");

const { safeNumberConversion } = require("../util/bigint-helpers");

/**
 * GET /services
 *
 * This endpoint is in charge of retrieving all of the service items that can be booked for the current location.
 */
router.get("/", async (req, res, next) => {
  const cancel = req.query.cancel;
  const errorMessage = req.query.error;
  const isBackNavigation = req.query.back === 'true';
  
  // Handle error messages
  let error = null;
  if (errorMessage === 'missing_params') {
    error = 'Missing required information. Please start your booking again.';
  } else if (errorMessage === 'no_service_selected') {
    error = 'Please select a service to continue.';
  }
  
  // If this is back navigation, preserve existing session data
  let preservedSession = null;
  if (isBackNavigation && req.session) {
    preservedSession = {
      selectedServices: req.session.selectedServices,
      quantities: req.session.quantities,
      serviceDetails: req.session.serviceDetails,
      totalDuration: req.session.totalDuration,
      totalPrice: req.session.totalPrice,
      selectedStaffId: req.session.selectedStaffId,
      teamMemberBookingProfile: req.session.teamMemberBookingProfile,
      staffProfile: req.session.staffProfile
    };
    console.log('Back navigation to services - preserving session:', preservedSession);
  }
  
  try {
    // Fetch all catalog objects (items and categories)
    const { result: { objects } } = await catalogApi.listCatalog(undefined, undefined);
    if (!objects) {
      return res.render("pages/select-service", { 
        cancel, 
        items: [], 
        allCategories: [], 
        error 
      });
    }

    // Separate items and categories
    // Only include items that are bookable online by customer
    // Only show items where at least one variation has availableForBooking true
    const items = objects.filter(obj => {
      if (obj.type !== "ITEM" || !obj.itemData || obj.itemData.productType !== "APPOINTMENTS_SERVICE" || obj.isDeleted || obj.is_deleted) {
        return false;
      }
      if (!Array.isArray(obj.itemData.variations)) {
        return false;
      }
      // At least one variation must have availableForBooking true
      return obj.itemData.variations.some(variation => {
        return variation.itemVariationData && variation.itemVariationData.availableForBooking === true;
      });
    });

    // Collect all image IDs for all items
    const uniqueImageIds = new Set();
    // Map of itemId -> array of secondary imageIds (exclude primary)
    const itemSecondaryImages = {};
    items.forEach(item => {
      const imageIds = item.itemData.imageIds || [];
      // By convention, the first image is primary
      if (imageIds.length > 1) {
        itemSecondaryImages[item.id] = imageIds.slice(1);
      } else {
        itemSecondaryImages[item.id] = [];
      }
      imageIds.forEach(id => uniqueImageIds.add(id));
    });

    const categories = objects.filter(obj => obj.type === "CATEGORY" && obj.categoryData && !obj.isDeleted && !obj.is_deleted);

    // Build a map of categoryId -> category { id, name, ordinal }
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.id] = {
        id: cat.id,
        name: cat.categoryData.name,
        ordinal: typeof cat.categoryData.ordinal === 'number' ? cat.categoryData.ordinal : (cat.categoryData.locationOverrides && cat.categoryData.locationOverrides[0] && typeof cat.categoryData.locationOverrides[0].ordinal === 'number' ? cat.categoryData.locationOverrides[0].ordinal : 0)
      };
    });

    // Group items by category id for frontend convenience
    let categorized = {};
    items.forEach(item => {
      let catIds = [];
      if (item.itemData.categories && Array.isArray(item.itemData.categories)) {
        catIds = item.itemData.categories.map(catObj => catObj.id);
      } else if (item.itemData.category && item.itemData.category.id) {
        catIds = [item.itemData.category.id];
      } else if (item.itemData.categoryId) {
        catIds = [item.itemData.categoryId];
      }
      catIds.forEach(catId => {
        if (!categorized[catId]) categorized[catId] = [];
        categorized[catId].push(item);
      });
    });

    // --- BEGIN: Fetch booking counts for each service and category ---
    let serviceBookingCounts = {};
    let categoryBookingCounts = {};
    try {
      const { bookingsApi } = require("../util/square-client");
      // Example: retrieve a specific booking by ID (replace with actual booking_id)
      const bookingId = req.query.booking_id || ""; // You must provide booking_id via query or other means
      if (bookingId) {
        const { result } = await bookingsApi.retrieveBooking(bookingId);
        const booking = result.booking;
        if (booking && booking.appointmentSegments) {
          booking.appointmentSegments.forEach(segment => {
            const serviceId = segment.serviceVariationId;
            serviceBookingCounts[serviceId] = (serviceBookingCounts[serviceId] || 0) + 1;
          });
        }
      }
    } catch (err) {
      console.warn("Could not fetch booking info for services:", err);
    }

    // Sum booking counts for each category
    Object.keys(categorized).forEach(catId => {
      let count = 0;
      categorized[catId].forEach(item => {
        if (item.itemData.variations) {
          item.itemData.variations.forEach(variation => {
            count += serviceBookingCounts[variation.id] || 0;
          });
        }
      });
      categoryBookingCounts[catId] = count;
    });

    // Only include categories that have at least one service
    // Sort categories: most booked DESC only (no fallback to name)
    let allCategories = Object.values(categoryMap)
      .filter(cat => categorized[cat.id] && categorized[cat.id].length > 0)
      .sort((a, b) => {
        const countA = categoryBookingCounts[a.id] || 0;
        const countB = categoryBookingCounts[b.id] || 0;
        return countB - countA;
      });

    // For each category, sort its service items: most recently added first, then most booked
    Object.keys(categorized).forEach(catId => {
      categorized[catId].sort((a, b) => {
        // Sort by created_at DESC (most recent first), then by booking count DESC
        const dateA = new Date(a.itemData.created_at || a.created_at || 0);
        const dateB = new Date(b.itemData.created_at || b.created_at || 0);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        // Fallback: most booked service first
        let countA = 0, countB = 0;
        if (a.itemData.variations) {
          a.itemData.variations.forEach(variation => {
            countA += serviceBookingCounts[variation.id] || 0;
          });
        }
        if (b.itemData.variations) {
          b.itemData.variations.forEach(variation => {
            countB += serviceBookingCounts[variation.id] || 0;
          });
        }
        return countB - countA;
      });
    });

    const imageMap = {};
    if (uniqueImageIds.size > 0) {
      for (const imageId of uniqueImageIds) {
        try {
          const { result: { object } } = await catalogApi.retrieveCatalogObject(imageId);
          if (object && object.imageData && object.imageData.url) {
            imageMap[imageId] = object.imageData.url;
          }
        } catch (err) {
          console.warn(`Could not retrieve image ${imageId}:`, err);
        }
      }
    }

    res.render("pages/select-service", { 
      cancel, 
      items, 
      allCategories, 
      categorized, 
      location: req.app.locals.location, 
      imageMap, 
      itemSecondaryImages,
      error,
      preservedSession,
      isBackNavigation
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/**
 * POST /services/select
 * Handles selection of multiple services and their quantities.
 */
router.post("/select", async (req, res, next) => {
  let selectedServices = req.body["services[]"] || req.body.services || [];

  // Robustly parse quantities[<serviceId>] fields from req.body
  let quantities = {};
  for (const key in req.body) {
    const match = key.match(/^quantities\[(.+)\]$/);
    if (match) {
      const serviceId = match[1];
      let val = req.body[key];
      // Parse as integer, fallback to 1 if invalid
      let qty = parseInt(val, 10);
      quantities[serviceId] = isNaN(qty) || qty < 1 ? 1 : qty;
    }
  }

  // If only one service is selected, ensure it's an array
  let serviceIds = Array.isArray(selectedServices) ? selectedServices : [selectedServices];
  // Remove any empty/undefined serviceIds (caused by no selection)
  serviceIds = serviceIds.filter(Boolean);

  // Validate that at least one service is selected
  if (serviceIds.length === 0) {
    return res.redirect('/services?error=no_service_selected');
  }

  // Instead of using quantity, expand serviceIds so each quantity is a separate entry
  let expandedServiceIds = [];
  serviceIds.forEach(sid => {
    let qty = quantities[sid] ? parseInt(quantities[sid], 10) : 1;
    for (let i = 0; i < qty; i++) {
      expandedServiceIds.push(sid);
    }
  });

  // Create proper quantities object that reflects actual quantities
  let expandedQuantities = {};
  serviceIds.forEach(sid => {
    const qty = quantities[sid] ? parseInt(quantities[sid], 10) : 1;
    expandedQuantities[sid] = qty;
  });

  // After building expandedServiceIds, fetch all selected services and check for priceMoney
  const missingPriceIds = [];
  let totalDuration = 0;
  let totalPrice = 0;
  const serviceDetails = {};
  
  for (const sid of expandedServiceIds) {
    try {
      const { result: { object: variation } } = await catalogApi.retrieveCatalogObject(sid);
      if (!variation.itemVariationData.priceMoney) {
        missingPriceIds.push(sid);
      } else {
        // Calculate duration in minutes - ensure numeric type with safe conversion
        const serviceDuration = safeNumberConversion(variation.itemVariationData.serviceDuration);
        totalDuration += serviceDuration;
        
        // Calculate price (amount is in cents) - handle possible BigInt
        const amount = safeNumberConversion(variation.itemVariationData.priceMoney.amount);
        const currency = variation.itemVariationData.priceMoney.currency;
        totalPrice += amount;
        
        // Store details for each service
        serviceDetails[sid] = {
          duration: serviceDuration,
          price: {
            amount, // Store as regular number
            currency
          }
        };
        
        console.log(`DEBUG: Service ${sid} details: duration=${serviceDuration}, amount=${amount}, totalPrice=${totalPrice}`);
      }
    } catch (e) {
      missingPriceIds.push(sid); // If fetch fails, treat as missing price
      console.error(`Error fetching service details for ${sid}:`, e);
    }
  }
  
  if (missingPriceIds.length > 0) {
    // Fetch names for missing price services
    const missingNames = [];
    for (const sid of missingPriceIds) {
      try {
        const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
        const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
        missingNames.push(item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : ""));
      } catch (e) {
        missingNames.push(sid);
      }
    }
    
    // Re-render the services page with error message
    try {
      // Fetch all catalog objects for re-rendering
      const { result: { objects } } = await catalogApi.listCatalog(undefined, undefined);
      let items = [];
      let allCategories = [];
      let categorized = {};
      let imageMap = {};
      let itemSecondaryImages = {};
      
      if (objects) {
        items = objects.filter(obj => obj.type === "ITEM" && obj.itemData && obj.itemData.productType === "APPOINTMENTS_SERVICE" && !obj.is_deleted && !obj.isDeleted);
        const categories = objects.filter(obj => obj.type === "CATEGORY" && obj.categoryData && !obj.is_deleted && !obj.isDeleted);
        
        // Build category map
        const categoryMap = {};
        categories.forEach(cat => {
          categoryMap[cat.id] = {
            id: cat.id,
            name: cat.categoryData.name,
            ordinal: typeof cat.categoryData.ordinal === 'number' ? cat.categoryData.ordinal : 0
          };
        });
        
        // Group items by category
        categorized = {};
        items.forEach(item => {
          let catIds = [];
          if (item.itemData.categories && Array.isArray(item.itemData.categories)) {
            catIds = item.itemData.categories.map(catObj => catObj.id);
          } else if (item.itemData.category && item.itemData.category.id) {
            catIds = [item.itemData.category.id];
          } else if (item.itemData.categoryId) {
            catIds = [item.itemData.categoryId];
          }
          catIds.forEach(catId => {
            if (!categorized[catId]) categorized[catId] = [];
            categorized[catId].push(item);
          });
        });
        
        // Filter categories that have services
        allCategories = Object.values(categoryMap)
          .filter(cat => categorized[cat.id] && categorized[cat.id].length > 0)
          .sort((a, b) => a.ordinal - b.ordinal || a.name.localeCompare(b.name));
      }
      
      return res.render("pages/select-service", {
        cancel: null,
        items,
        allCategories,
        categorized,
        location: req.app.locals.location,
        imageMap,
        itemSecondaryImages,
        error: `The following services require an estimate: ${missingNames.join(", ")}. Please call us for a quote before booking.`
      });
    } catch (renderError) {
      console.error('Error re-rendering services page:', renderError);
      return res.redirect('/services?error=missing_price');
    }
  }

  // Store everything in session
  if (!req.session) req.session = {};
  req.session.selectedServices = expandedServiceIds;
  req.session.quantities = expandedQuantities;
  req.session.serviceDetails = serviceDetails;
  req.session.totalDuration = totalDuration;
  req.session.totalPrice = totalPrice;
  
  // Debug: log session after setting
  console.log('DEBUG: /services/select session.selectedServices', req.session.selectedServices);
  console.log('DEBUG: /services/select session.quantities', req.session.quantities);
  console.log('DEBUG: /services/select session.totalDuration', req.session.totalDuration, typeof req.session.totalDuration);
  console.log('DEBUG: /services/select session.totalPrice', req.session.totalPrice, typeof req.session.totalPrice);

  const firstServiceId = expandedServiceIds[0];
  const version = req.body.version || '';
  
  // Save session before redirect to ensure persistence
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.redirect('/services?error=session_error');
    }
    console.log('DEBUG: Session saved successfully, redirecting to staff page');
    res.redirect(`/staff/${firstServiceId}?version=${version}`);
  });
});

module.exports = router;