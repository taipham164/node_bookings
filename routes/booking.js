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
    // Debug: print appointmentSegments before booking
    // console.log('DEBUG: appointmentSegments', JSON.stringify(appointmentSegments, null, 2));
  // Debug: log session at booking step
  if (req.session) {
    console.log('DEBUG: /booking/create session.selectedServices', req.session.selectedServices);
    console.log('DEBUG: /booking/create session.quantities', req.session.quantities);
  }
  // Multi-service support: prefer session if not present in body
  let selectedServices = req.body["services[]"] || req.body.services;
  // Fallback to session if not present in body (e.g., user navigates directly to booking)
  if (!selectedServices) {
    selectedServices = req.session.selectedServices || [req.query.serviceId];
  }
  const serviceVariationVersion = req.query.version;
  const staffId = req.query.staffId;
  const startAt = req.query.startAt;
  const customerNote = req.body.customerNote;
  const emailAddress = req.body.emailAddress;
  const familyName = req.body.familyName;
  const givenName = req.body.givenName;

  try {
    // Debug logs for service selection and quantities
    console.log('DEBUG: selectedServices', selectedServices);
    // If multiple services, create appointment segments for each
    let appointmentSegments = [];
    const serviceIds = Array.isArray(selectedServices) ? selectedServices : [selectedServices];
    for (const serviceId of serviceIds) {
      // Retrieve catalog object by the variation ID
      const { result: { object: catalogItemVariation } } = await catalogApi.retrieveCatalogObject(serviceId);
      const durationMinutes = convertMsToMins(catalogItemVariation.itemVariationData.serviceDuration);
      const version = catalogItemVariation.version; // Use the correct version for this service
      appointmentSegments.push({
        durationMinutes,
        serviceVariationId: serviceId,
        serviceVariationVersion: version,
        teamMemberId: staffId,
      });
    }
    if (appointmentSegments.length === 0) {
      // No valid services selected
      return res.render("pages/formatted-error", { error: "No valid services selected for booking." });
    }
    // Debug: print appointmentSegments before booking
    // console.log('DEBUG: appointmentSegments', JSON.stringify(appointmentSegments, null, 2));
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
      // Fetch actual service details for better UX
      let serviceDetails = [];
      if (req.session.selectedServices && req.session.selectedServices.length) {
        for (const sid of req.session.selectedServices) {
          try {
            const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
            const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
            serviceDetails.push({
              id: sid,
              name: item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : ""),
              duration: variation.itemVariationData.serviceDuration
            });
          } catch (e) {
            serviceDetails.push({ id: sid, name: '', duration: 0 });
          }
        }
      }
      return res.render("pages/contact", {
        serviceDetails,
        selectedServices: req.session.selectedServices || [],
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

    // Gather all unique serviceVariationIds and teamMemberIds
    const serviceVariationIds = [...new Set(booking.appointmentSegments.map(seg => seg.serviceVariationId))];
    const teamMemberIds = [...new Set(booking.appointmentSegments.map(seg => seg.teamMemberId))];

    // Fetch all service variations and team member profiles in parallel
    const servicePromises = serviceVariationIds.map(sid =>
      catalogApi.retrieveCatalogObject(sid, true)
        .then(({ result: { object: variation, relatedObjects } }) => {
          const item = relatedObjects.find(obj => obj.type === "ITEM");
          return {
            id: sid,
            name: item ? item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : "") : '[Unknown Service]',
            duration: variation.itemVariationData.serviceDuration,
            priceMoney: variation.itemVariationData.priceMoney || null
          };
        })
        .catch(e => ({
          id: sid,
          name: '[Unknown Service]',
          duration: 0,
          priceMoney: null
        }))
    );
    const teamMemberPromises = teamMemberIds.map(tid =>
      bookingsApi.retrieveTeamMemberBookingProfile(tid)
        .then(({ result: { teamMemberBookingProfile } }) => teamMemberBookingProfile)
        .catch(() => null)
    );

    const serviceDetailsArr = await Promise.all(servicePromises);
    const teamMemberProfiles = (await Promise.all(teamMemberPromises)).filter(Boolean);

    // Aggregate quantities for each service
    const serviceDetailsMap = {};
    for (const segment of booking.appointmentSegments) {
      const sid = segment.serviceVariationId;
      if (!serviceDetailsMap[sid]) {
        // Defensive: ensure duration and priceMoney are numbers, not BigInt or string
        const base = { ...serviceDetailsArr.find(s => s.id === sid), quantity: 0 };
        if (base.duration && typeof base.duration === 'bigint') base.duration = Number(base.duration);
        if (base.duration && typeof base.duration === 'string') base.duration = Number(base.duration);
        if (base.priceMoney && base.priceMoney.amount && typeof base.priceMoney.amount === 'bigint') base.priceMoney.amount = Number(base.priceMoney.amount);
        if (base.priceMoney && base.priceMoney.amount && typeof base.priceMoney.amount === 'string') base.priceMoney.amount = Number(base.priceMoney.amount);
        serviceDetailsMap[sid] = base;
      }
      serviceDetailsMap[sid].quantity += 1;
    }
    const serviceDetails = Object.values(serviceDetailsMap);

    // Defensive location handling
    let location = req.app.locals.location || { address: {}, timezone: 'UTC' };
    if (!location.address) location.address = {};
    if (!location.timezone) location.timezone = 'UTC';

   

    res.render("pages/confirmation", { booking, teamMemberProfiles, serviceDetails, location });
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
