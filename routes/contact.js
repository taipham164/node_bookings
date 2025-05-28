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

const {
  bookingsApi,
  catalogApi,
} = require("../util/square-client");

/**
 * GET /contact
 *
 * Render the contact information form prior to creating a booking
 *
 *  accepted query params are:
 * `serviceId` - the ID of the service
 * `staffId` - the ID of the staff
 * `startAt` - starting time of the booking
 * `version` - the version of the service initially selected
 */
router.get("/", async (req, res, next) => {
  const serviceId = req.query.serviceId;
  const serviceVersion = req.query.version;
  const staffId = req.query.staff;
  const startAt = req.query.startAt;
  // Retrieve multi-service selection from session if available
  const selectedServices = req.session && req.session.selectedServices ? req.session.selectedServices : [serviceId];
  const quantities = req.session && req.session.quantities ? req.session.quantities : {};
  try {
    // Build serviceDetails for all selected services
    const serviceDetails = [];
    for (const sid of selectedServices) {
      const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
      const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
      serviceDetails.push({
        id: sid,
        name: item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : ""),
        duration: variation.itemVariationData.serviceDuration,
        quantity: quantities[sid] || 1
      });
    }
    // Send request to get the service associated with the given item variation ID, and related objects.
    const retrieveServicePromise = catalogApi.retrieveCatalogObject(serviceId, true);
    // Send request to get the team member profile of the staff selected
    const retrieveTeamMemberPromise = bookingsApi.retrieveTeamMemberBookingProfile(staffId);
    const [ { result: { object : serviceVariation, relatedObjects } }, { result: { teamMemberBookingProfile } } ] = await Promise.all([ retrieveServicePromise, retrieveTeamMemberPromise ]);
    const serviceItem = relatedObjects.filter(relatedObject => relatedObject.type === "ITEM")[0];
    res.render("pages/contact", { serviceItem, serviceVariation, serviceVersion, startAt, teamMemberBookingProfile, selectedServices, quantities, serviceDetails });
  } catch (error) {
    console.error(error);
    next(error);
  }
});


module.exports = router;
