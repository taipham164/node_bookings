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
const { safeNumberConversion, safeJSONStringify, convertMsToMins, convertVersion, hasSquareError } = require("../util/bigint-helpers");
const { normalizePhoneNumber, isValidPhoneNumber, isValidEmail, isValidPostalCode } = require("../util/validators");
const { logger, logApiCall, logApiResponse } = require("../util/logger");
const express = require("express");
const router = express.Router();
const {
  bookingsApi,
  catalogApi,
  customersApi,
  cardsApi
} = require("../util/square-client");
const { asyncHandler, ValidationError, SquareApiError } = require("../middleware/errorHandler");
const crypto = require("crypto");

require("dotenv").config();
const locationId = process.env["SQ_LOCATION_ID"];

/**
 * POST /booking/create
 * Create a new booking with customer information
 */
router.post("/create", asyncHandler(async (req, res, next) => {
  // Ensure session exists
  if (!req.session) {
    req.session = {};
  }

  // Multi-service support: prefer session if not present in body
  let selectedServices = req.body["services[]"] || req.body.services;
  if (!selectedServices && req.session.selectedServices) {
    selectedServices = req.session.selectedServices;
  } else if (!selectedServices) {
    selectedServices = [req.query.serviceId];
  }

  const staffId = req.query.staffId;
  const startAt = req.query.startAt;
  const customerNote = req.body.existingCustomerNote || req.body.serviceNote || "";
  const customerId = req.body.customerId;
  const emailAddress = req.body.emailAddress;
  const familyName = req.body.familyName;
  const givenName = req.body.givenName;
  const phoneNumber = req.body.phoneNumber;
  const cardNonce = req.body.cardNonce;
  const postalCode = req.body.postalCode;

  // Validate phone number
  if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
    throw new ValidationError("Please enter a valid phone number.");
  }

  // Validate new customer fields if creating new customer
  if (!customerId) {
    if (!givenName || !familyName) {
      throw new ValidationError("Please fill in all required fields: name and email address.");
    }
    if (!isValidEmail(emailAddress)) {
      throw new ValidationError("Please enter a valid email address.");
    }
    if (!cardNonce) {
      throw new ValidationError("Please provide valid payment information.");
    }
    if (!isValidPostalCode(postalCode)) {
      throw new ValidationError("Please enter a valid postal code.");
    }
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber.trim());
  logger.info("Creating booking", { customerId: customerId || "new", staffId });

  // Build appointment segments for multiple services
  const appointmentSegments = [];
  const serviceIds = Array.isArray(selectedServices) ? selectedServices : [selectedServices];

  for (const serviceId of serviceIds) {
    logApiCall("catalogApi.retrieveCatalogObject", "GET", { serviceId });
    const { result: { object: catalogItemVariation } } = await catalogApi.retrieveCatalogObject(serviceId);
    const durationMinutes = convertMsToMins(catalogItemVariation.itemVariationData.serviceDuration);
    const version = convertVersion(catalogItemVariation.version);

    appointmentSegments.push({
      durationMinutes,
      serviceVariationId: serviceId,
      serviceVariationVersion: version,
      teamMemberId: staffId
    });
  }

  if (appointmentSegments.length === 0) {
    throw new ValidationError("No valid services selected for booking.");
  }

  // Determine customer ID
  let finalCustomerId;
  if (customerId) {
    finalCustomerId = customerId;
    logger.info("Using existing customer", { customerId });

    // Save new card for existing customer if provided
    if (cardNonce) {
      try {
        logApiCall("cardsApi.createCard", "POST", { customerId });
        await cardsApi.createCard({
          idempotencyKey: crypto.randomUUID(),
          sourceId: cardNonce,
          card: {
            customerId: finalCustomerId,
            billingAddress: { postalCode, country: "US" }
          }
        });
        logger.info("Card saved for existing customer", { customerId });
      } catch (cardError) {
        logger.warn("Failed to save card for existing customer", { customerId, error: cardError.message });
        // Don't fail the booking if card saving fails
      }
    }
  } else {
    // Create new customer
    finalCustomerId = await getCustomerID(givenName, familyName, emailAddress, normalizedPhone);
    logger.info("Created new customer", { customerId: finalCustomerId });

    // Save card for new customer
    if (cardNonce) {
      try {
        logApiCall("cardsApi.createCard", "POST", { customerId: finalCustomerId });
        await cardsApi.createCard({
          idempotencyKey: crypto.randomUUID(),
          sourceId: cardNonce,
          card: {
            customerId: finalCustomerId,
            billingAddress: { postalCode, country: "US" }
          }
        });
        logger.info("Card saved for new customer", { customerId: finalCustomerId });
      } catch (cardError) {
        logger.warn("Failed to save card for new customer", { customerId: finalCustomerId, error: cardError.message });
      }
    }
  }

  // Create booking
  logApiCall("bookingsApi.createBooking", "POST", { customerId: finalCustomerId, staffId });
  const { result: { booking } } = await bookingsApi.createBooking({
    booking: {
      appointmentSegments,
      customerId: finalCustomerId,
      customerNote,
      locationId,
      startAt
    },
    idempotencyKey: crypto.randomUUID()
  });

  logger.info("Booking created successfully", { bookingId: booking.id });
  res.redirect("/booking/" + booking.id);
}));

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
        const base = { ...serviceDetailsArr.find(s => s.id === sid), quantity: 0 };
        
        // Safe BigInt conversion
        if (base.duration) {
          base.duration = safeNumberConversion(base.duration);
        }
        if (base.priceMoney?.amount) {
          base.priceMoney.amount = safeNumberConversion(base.priceMoney.amount);
        }
        
        serviceDetailsMap[sid] = base;
      }
      serviceDetailsMap[sid].quantity += 1;
    }    const serviceDetails = Object.values(serviceDetailsMap);

    // Fetch customer information
    let customerInfo = null;
    if (booking.customerId) {
      try {
        const { result: { customer } } = await customersApi.retrieveCustomer(booking.customerId);
        customerInfo = customer;
        console.log('Retrieved customer info for booking:', customer.givenName, customer.familyName);
      } catch (customerError) {
        console.error('Error retrieving customer information:', customerError);
        // Continue without customer info if retrieval fails
      }
    }

    // Defensive location handling
    let location = req.app.locals.location || { address: {}, timezone: 'UTC' };
    if (!location.address) location.address = {};
    if (!location.timezone) location.timezone = 'UTC';

    res.render("pages/confirmation", { booking, teamMemberProfiles, serviceDetails, location, customerInfo });
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
 * Return the id of a customer that matches the firstName, lastName and email
 * If such customer doesn't exist, create a new customer.
 * Updated to support phone numbers for login feature.
 *
 * @param {string} givenName
 * @param {string} familyName
 * @param {string} emailAddress
 * @param {string} phoneNumber - Optional phone number
 */
async function getCustomerID(givenName, familyName, emailAddress, phoneNumber = null) {
  // First, search by email address
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

    // If a matching customer is found, update their phone number if provided and different
    if (matchingCustomers.length > 0) {
      const existingCustomer = matchingCustomers[0];
      
      // Update phone number if provided and different from existing
      if (phoneNumber && existingCustomer.phoneNumber !== phoneNumber) {
        try {
          await customersApi.updateCustomer(existingCustomer.id, {
            phoneNumber: phoneNumber
          });
          console.log(`Updated phone number for customer ${existingCustomer.id}`);
        } catch (updateError) {
          console.warn('Failed to update customer phone number:', updateError);
          // Continue with booking even if phone update fails
        }
      }
      
      return existingCustomer.id;
    }
  }

  // If no matching customer is found, create a new customer
  const customerData = {
    emailAddress,
    familyName,
    givenName,
    idempotencyKey: crypto.randomUUID(),
    referenceId: "BOOKINGS-SAMPLE-APP",
  };
  
  // Add phone number if provided
  if (phoneNumber) {
    customerData.phoneNumber = phoneNumber;
  }

  const { result: { customer } } = await customersApi.createCustomer(customerData);

  return customer.id;
}

module.exports = router;