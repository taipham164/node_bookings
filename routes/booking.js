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

const dateHelpers = require("../util/date-helpers");
const express = require("express");
const router = express.Router();
const {
  bookingsApi,
  catalogApi,
  customersApi,
} = require("../util/square-client");
const crypto = require("crypto");

require("dotenv").config();
const locationId = process.env["SQ_LOCATION_ID"];

/**
 * POST /booking/create
 *
 * Create a new booking, booking details and customer information is submitted
 * by form data. Create a new customer if necessary, otherwise use an existing
 * customer that matches the `firstName`, `lastName` and `emailAddress`
 * to create the booking.
 *
 * accepted query params are:
 * `serviceId` - the ID of the service
 * `staffId` - the ID of the staff
 * `startAt` - starting time of the booking
 * `serviceVariationVersion` - the version of the service initially selected
 */
router.post("/create", async (req, res, next) => {
  // Multi-service support
  const selectedServices = req.body["services[]"] || req.body.services || [req.query.serviceId];
  const quantities = req.body.quantities || {};
  const serviceVariationVersion = req.query.version;
  const staffId = req.query.staffId;
  const startAt = req.query.startAt;
  const customerNote = req.body.customerNote;
  const emailAddress = req.body.emailAddress;
  const familyName = req.body.familyName;
  const givenName = req.body.givenName;

  try {
    // If multiple services, create appointment segments for each
    let appointmentSegments = [];
    const serviceIds = Array.isArray(selectedServices) ? selectedServices : [selectedServices];
    for (const serviceId of serviceIds) {
      // Retrieve catalog object by the variation ID
      const { result: { object: catalogItemVariation } } = await catalogApi.retrieveCatalogObject(serviceId);
      const durationMinutes = convertMsToMins(catalogItemVariation.itemVariationData.serviceDuration);
      const version = catalogItemVariation.version; // Use the correct version for this service
      const qty = quantities[serviceId] ? parseInt(quantities[serviceId], 10) : 1;
      for (let i = 0; i < qty; i++) {
        appointmentSegments.push({
          durationMinutes,
          serviceVariationId: serviceId,
          serviceVariationVersion: version,
          teamMemberId: staffId,
        });
      }
    }
    // Create booking
    const { result: { booking } } = await bookingsApi.createBooking({
      booking: {
        appointmentSegments,
        customerId: await getCustomerID(givenName, familyName, emailAddress),
        customerNote,
        locationId,
        startAt,
      },
      idempotencyKey: crypto.randomUUID(),
    });
    res.redirect("/booking/" + booking.id);
  } catch (error) {
    // Handle invalid email error gracefully
    if (error.errors && error.errors.some(e => e.code === 'INVALID_VALUE' && e.field === 'email')) {
      return res.render("pages/contact", {
        serviceDetails: req.session.selectedServices ? req.session.selectedServices.map(sid => ({ id: sid, name: '', duration: 0, quantity: req.session.quantities[sid] || 1 })) : [],
        selectedServices: req.session.selectedServices || [],
        quantities: req.session.quantities || {},
        teamMemberBookingProfile: req.session.teamMemberBookingProfile || {},
        serviceVariation: req.session.serviceVariation || {},
        serviceVersion: req.query.version || '',
        startAt: req.query.startAt || '',
        location: req.app.locals.location,
        error: 'The provided email address is invalid. Please enter a valid email address.'
      });
    }
    console.error(error);
    next(error);
  }
});

/**
 * POST /booking/:bookingId/reschedule
 *
 * Update an existing booking, you may update the starting date
 */
router.post("/:bookingId/reschedule", async (req, res, next) => {
  const bookingId = req.params.bookingId;
  const startAt = req.query.startAt;

  try {
    const { result: { booking } } = await bookingsApi.retrieveBooking(bookingId);
    const updateBooking = {
      startAt,
      version: booking.version,
    };

    const { result: { booking: newBooking } } = await bookingsApi.updateBooking(bookingId, { booking: updateBooking });

    res.redirect("/booking/" + newBooking.id);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/**
 * POST /booking/:bookingId/delete
 *
 * delete a booking by booking ID
 */
router.post("/:bookingId/delete", async (req, res, next) => {
  const bookingId = req.params.bookingId;

  try {
    const { result: { booking } } = await bookingsApi.retrieveBooking(bookingId);
    await bookingsApi.cancelBooking(bookingId, { bookingVersion: booking.version });

    res.redirect("/services?cancel=success");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/**
 * GET /booking/:bookingId
 *
 * This endpoint is in charge of aggregating data for the given booking id in order to render a booking confirmation page.
 * It will do the following steps:
 * 1. Get the booking associated with the given bookingID
 * 2. Get information about the team member, location, service, etc, based on the information from 1.
 */
router.get("/:bookingId", async (req, res, next) => {
  const bookingId = req.params.bookingId;
  try {
    // Retrieve the booking provided by the bookingId.
    const { result: { booking } } = await bookingsApi.retrieveBooking(bookingId);

    // Build serviceDetails for all appointment segments (group by serviceVariationId)
    const serviceDetailsMap = {};
    for (const segment of booking.appointmentSegments) {
      const sid = segment.serviceVariationId;
      if (!serviceDetailsMap[sid]) {
        // Fetch name/duration for this service variation
        const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
        const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
        serviceDetailsMap[sid] = {
          id: sid,
          name: item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : ""),
          duration: variation.itemVariationData.serviceDuration,
          quantity: 0
        };
      }
      serviceDetailsMap[sid].quantity += 1;
    }
    const serviceDetails = Object.values(serviceDetailsMap);

    const serviceVariationId = booking.appointmentSegments[0].serviceVariationId;
    const teamMemberId = booking.appointmentSegments[0].teamMemberId;

    // Make API call to get service variation details
    const retrieveServiceVariationPromise = catalogApi.retrieveCatalogObject(serviceVariationId, true);

    // Make API call to get team member details
    const retrieveTeamMemberPromise = bookingsApi.retrieveTeamMemberBookingProfile(teamMemberId);

    // Wait until all API calls have completed
    const [ { result: service }, { result: { teamMemberBookingProfile } } ] =
      await Promise.all([ retrieveServiceVariationPromise, retrieveTeamMemberPromise ]);

    const serviceVariation = service.object;
    const serviceItem = service.relatedObjects.filter(relatedObject => relatedObject.type === "ITEM")[0];

    // Debug log: print booking object on confirmation page
    try {
      console.log('DEBUG: booking (confirmation)', JSON.stringify(booking, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2));
    } catch (e) {
      console.log('DEBUG: booking (confirmation) [BigInt serialization error]', booking);
    }

    let location = null;
    try {
      location = req.app.locals.location;
    } catch (e) {}

    res.render("pages/confirmation", { booking, serviceItem, serviceVariation, teamMemberBookingProfile, serviceDetails, location });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/**
 * GET /booking/:bookingId/reschedule
 *
 * Get availability for the service variation & team member of the
 * existing booking so the user can reschedule the booking
 */
router.get("/:bookingId/reschedule", async (req, res, next) => {
  const bookingId = req.params.bookingId;
  try {
    // Retrieve the booking provided by the bookingId.
    const { result: { booking } } = await bookingsApi.retrieveBooking(bookingId);
    const { serviceVariationId, teamMemberId, serviceVariationVersion } = booking.appointmentSegments[0];
    const startAt = dateHelpers.getStartAtDate();
    const searchRequest = {
      query: {
        filter: {
          locationId,
          segmentFilters: [
            {
              serviceVariationId,
              teamMemberIdFilter: {
                any: [ teamMemberId ],
              }
            },
          ],
          startAtRange: {
            endAt: dateHelpers.getEndAtDate(startAt).toISOString(),
            startAt: startAt.toISOString(),
          },
        }
      }
    };
    // get availability
    const { result: { availabilities } } = await bookingsApi.searchAvailability(searchRequest);
    res.render("pages/reschedule", { availabilities, bookingId, serviceId: serviceVariationId, serviceVersion: serviceVariationVersion });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/**
 * Convert a duration in milliseconds to minutes
 *
 * @param {*} duration - duration in milliseconds
 * @returns {Number} - duration in minutes
 */
function convertMsToMins(duration) {
  return Math.round(Number(duration) / 1000 / 60);
}

/**
 * Return the id of a customer that matches the firstName, lastName and email
 * If such customer doesn't exist, create a new customer.
 *
 * @param {string} givenName
 * @param {string} familyName
 * @param {string} emailAddress
 */
async function getCustomerID(givenName, familyName, emailAddress) {
  const { result: { customers } } = await customersApi.searchCustomers({
    query: {
      filter: {
        emailAddress: {
          exact: emailAddress,
        }
      }
    }
  });

  if (customers && customers.length > 0) {
    const matchingCustomers = customers.filter(customer =>
      customer.givenName === givenName &&
      customer.familyName === familyName
    );

    // If a matching customer is found, return the first matching customer
    if (matchingCustomers.length > 0) {
      return matchingCustomers[0].id;
    }
  }

  // If no matching customer is found, create a new customer and return its ID
  const { result: { customer } } = await customersApi.createCustomer({
    emailAddress,
    familyName,
    givenName,
    idempotencyKey: crypto.randomUUID(),
    referenceId: "BOOKINGS-SAMPLE-APP",
  });

  return customer.id;
}

module.exports = router;
