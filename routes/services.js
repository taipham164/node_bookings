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
    let { result: { items } } = await catalogApi.searchCatalogItems({
      enabledLocationIds: [ locationId ],
      productTypes: [ "APPOINTMENTS_SERVICE" ]
    });

    if (!items) {
      items = [];
    }

    res.render("pages/select-service", { cancel, items });
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

  // Ensure all selected services have a quantity (default 1)
  serviceIds.forEach(sid => {
    if (!quantities[sid]) quantities[sid] = 1;
  });

  // After building serviceIds and quantities, fetch all selected services and check for priceMoney
  const missingPriceIds = [];
  for (const sid of serviceIds) {
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
    // Fetch all items for the service selection page so user can adjust selection
    let { result: { items } } = await catalogApi.searchCatalogItems({
      enabledLocationIds: [ locationId ],
      productTypes: [ "APPOINTMENTS_SERVICE" ]
    });
    if (!items) items = [];
    return res.render("pages/select-service", {
      cancel: null,
      items,
      error: `The following services require an estimate: ${missingNames.join(", ")}. Please call us for a quote before booking.`
    });
  }

  if (!req.session) req.session = {};
  req.session.selectedServices = serviceIds;
  req.session.quantities = quantities;

  const firstServiceId = serviceIds[0];
  const version = req.body.version || '';
  res.redirect(`/staff/${firstServiceId}?version=${version}`);
});

module.exports = router;
