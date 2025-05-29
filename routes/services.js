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

/**
 * GET /services
 *
 * This endpoint is in charge of retrieving all of the service items that can be booked for the current location.
 */
router.get("/", async (req, res, next) => {
  const cancel = req.query.cancel;
  try {

    // Fetch all catalog objects (items and categories)
    const { result: { objects } } = await catalogApi.listCatalog(undefined, undefined);
    if (!objects) {
      return res.render("pages/select-service", { cancel, items: [], allCategories: [] });
    }

    // Separate items and categories
    const items = objects.filter(obj => obj.type === "ITEM" && obj.itemData && obj.itemData.productType === "APPOINTMENTS_SERVICE" && !obj.isDeleted && !obj.is_deleted);

    const uniqueImageIds = new Set();
    items.forEach(item => {
      const imageIds = item.itemData.imageIds || [];
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
      let cursor = undefined;
      do {
        const { result } = await bookingsApi.searchBookings({
          query: {
            filter: {
              locationId: locationId
            }
          },
          cursor
        });
        const bookings = result.bookings || [];
        bookings.forEach(booking => {
          if (booking.appointmentSegments) {
            booking.appointmentSegments.forEach(segment => {
              const serviceId = segment.serviceVariationId;
              serviceBookingCounts[serviceId] = (serviceBookingCounts[serviceId] || 0) + 1;
            });
          }
        });
        cursor = result.cursor;
      } while (cursor);
    } catch (err) {
      console.warn("Could not fetch booking counts for services:", err);
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
    let allCategories = Object.values(categoryMap)
      .filter(cat => categorized[cat.id] && categorized[cat.id].length > 0)
      .sort((a, b) => {
        // Sort by booking count DESC, then ordinal, then name
        const countA = categoryBookingCounts[a.id] || 0;
        const countB = categoryBookingCounts[b.id] || 0;
        if (countA !== countB) return countB - countA;
        if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal;
        return a.name.localeCompare(b.name);
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

    res.render("pages/select-service", { cancel, items, allCategories, categorized, location: req.app.locals.location, imageMap });
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

  // Instead of using quantity, expand serviceIds so each quantity is a separate entry
  let expandedServiceIds = [];
  serviceIds.forEach(sid => {
    let qty = quantities[sid] ? parseInt(quantities[sid], 10) : 1;
    for (let i = 0; i < qty; i++) {
      expandedServiceIds.push(sid);
    }
  });

  // For downstream compatibility, set all quantities to 1
  let expandedQuantities = {};
  expandedServiceIds.forEach(sid => { expandedQuantities[sid] = 1; });


  // After building expandedServiceIds, fetch all selected services and check for priceMoney
  const missingPriceIds = [];
  for (const sid of expandedServiceIds) {
    try {
      const { result: { object: variation } } = await catalogApi.retrieveCatalogObject(sid);
      if (!variation.itemVariationData.priceMoney) {
        missingPriceIds.push(sid);
      }
    } catch (e) {
      missingPriceIds.push(sid); // If fetch fails, treat as missing price
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
    // Fetch all catalog objects (items and categories) for the service selection page so user can adjust selection
    const { result: { objects } } = await catalogApi.listCatalog(undefined, undefined);
    let items = [];
    let allCategories = [];
    let categorized = {};
    if (objects) {
      items = objects.filter(obj => obj.type === "ITEM" && obj.itemData && obj.itemData.productType === "APPOINTMENTS_SERVICE" && !obj.is_deleted && !obj.isDeleted);
      const categories = objects.filter(obj => obj.type === "CATEGORY" && obj.categoryData && !obj.is_deleted && !obj.isDeleted);
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
      // Only include categories that have at least one service
      allCategories = Object.values(categoryMap)
        .filter(cat => categorized[cat.id] && categorized[cat.id].length > 0)
        .sort((a, b) => {
          if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal;
          return a.name.localeCompare(b.name);
        });
    }
    return res.render("pages/select-service", {
      cancel: null,
      items,
      allCategories,
      categorized,
      location: req.app.locals.location,
      error: `The following services require an estimate: ${missingNames.join(", ")}. Please call us for a quote before booking.`
    });
  }

  if (!req.session) req.session = {};
  req.session.selectedServices = expandedServiceIds;
  req.session.quantities = expandedQuantities;
  // Debug: log session after setting
  console.log('DEBUG: /services/select session.selectedServices', req.session.selectedServices);
  console.log('DEBUG: /services/select session.quantities', req.session.quantities);

  const firstServiceId = expandedServiceIds[0];
  const version = req.body.version || '';
  res.redirect(`/staff/${firstServiceId}?version=${version}`);
});

module.exports = router;
