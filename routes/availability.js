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
require("dotenv").config();

const locationId = process.env["SQ_LOCATION_ID"];

const {
  bookingsApi,
  catalogApi,
  teamApi,
} = require("../util/square-client");

// the path param for staffId when user is searching for all staff member availability
const ANY_STAFF_PARAMS = "anyStaffMember";

/**
 * Retrieve all the staff that can perform a specific service variation.
 * 1. Get the service using catalog API.
 * 2. Get the booking profiles for all staff members in the current location (that are bookable).
 * 3. Get all active team members for the location.
 * 4. Cross reference 1, 2, and 3 so we can find all available staff members for the service.
 * @param {String} serviceId
 * @return {[CatalogItem, String[]]} array where first item is the service item and
 * second item is the array of all the team member ids that can be booked for the service
 */
async function searchActiveTeamMembers(serviceId) {
  // Send request to get the service associated with the given item variation ID.
  const retrieveServicePromise = catalogApi.retrieveCatalogObject(serviceId, true);

  // Send request to list staff booking profiles for the current location.
  const listBookingProfilesPromise = bookingsApi.listTeamMemberBookingProfiles(true, undefined, undefined, locationId);

  // Send request to list all active team members for this merchant at this location.
  const listActiveTeamMembersPromise = teamApi.searchTeamMembers({
    query: {
      filter: {
        locationIds: [ locationId ],
        status: "ACTIVE"
      }
    }
  });

  const [ { result: services }, { result: { teamMemberBookingProfiles } }, { result: { teamMembers } } ] =
  await Promise.all([ retrieveServicePromise, listBookingProfilesPromise, listActiveTeamMembersPromise ]);
  // We want to filter teamMemberBookingProfiles by checking that the teamMemberId associated with the profile is in our serviceTeamMembers.
  // We also want to verify that each team member is ACTIVE.
  const serviceVariation = services.object;

  const serviceTeamMembers = serviceVariation.itemVariationData.teamMemberIds || [];
  const activeTeamMembers = teamMembers.map(teamMember => teamMember.id);

  const bookableStaff = teamMemberBookingProfiles
    .filter(profile => serviceTeamMembers.includes(profile.teamMemberId) && activeTeamMembers.includes(profile.teamMemberId));
  return [ services, bookableStaff.map(staff => staff.teamMemberId) ];
}

/**
 * GET /availability/:staffId/:serviceId?version
 *
 * This endpoint is in charge of retrieving the availability for the service + team member
 * If the team member is set as anyStaffMember then we retrieve the availability for all team members
 */
router.get("/:staffId/:serviceId", async (req, res, next) => {
  const serviceId = req.params.serviceId;
  const serviceVersion = req.query.version || "";
  const staffId = req.params.staffId;
  
  // Validate required parameters
  if (!serviceId || !staffId) {
    console.warn('Missing required route parameters:', { serviceId: !!serviceId, staffId: !!staffId });
    return res.redirect('/services?error=invalid_params');
  }
  
  const startAt = dateHelpers.getStartAtDate();
  
  // Ensure session exists
  if (!req.session) {
    req.session = {};
  }
  
  // Retrieve multi-service selection from session if available
  const selectedServices = req.session.selectedServices || [serviceId];
  const quantities = req.session.quantities || {};

  // Build serviceDetails and segmentFilters for all selected services and their quantities
  const serviceDetails = [];
  const segmentFilters = [];
  
  for (const sid of selectedServices) {
    try {
      const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
      const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
      
      if (!item) {
        console.warn(`No item found for service variation ${sid}`);
        continue;
      }
      
      const duration = variation.itemVariationData.serviceDuration;
      // Get quantity for this service (default 1)
      const quantity = quantities && quantities[sid] ? parseInt(quantities[sid], 10) : 1;
      
      serviceDetails.push({
        id: sid,
        name: item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : ""),
        duration,
        quantity
      });
      
      // For each quantity, push a segment
      for (let i = 0; i < quantity; i++) {
        segmentFilters.push({
          serviceVariationId: sid,
          durationMinutes: Math.round(Number(duration) / 1000 / 60)
        });
      }
    } catch (serviceError) {
      console.error(`Error fetching service details for ${sid}:`, serviceError);
      // Continue with other services, but log the error
      serviceDetails.push({
        id: sid,
        name: '[Service unavailable]',
        duration: 0,
        quantity: 1
      });
    }
  }

  // If no valid services found, redirect back
  if (segmentFilters.length === 0) {
    console.error('No valid services found for availability search');
    return res.redirect('/services?error=no_valid_services');
  }

  const searchRequest = {
    query: {
      filter: {
        locationId,
        segmentFilters,
        startAtRange: {
          endAt: dateHelpers.getEndAtDate(startAt).toISOString(),
          startAt: startAt.toISOString(),
        },
        intervalMinutes: 30 // Show all possible start times at 30-min intervals
      },
      limit: 100 // Ensure all possible slots are returned
    }
  };
  
  try {
    // get service item - needed to display service details in left pane
    const retrieveServicePromise = catalogApi.retrieveCatalogObject(serviceId, true);
    let availabilities;
    // additional data to send to template
    let additionalInfo;
    
    // search availability for the specific staff member if staff id is passed as a param
    if (staffId === ANY_STAFF_PARAMS) {
      // For "any staff", get all team members who can perform the first service (for left pane info)
      const [ services, teamMembers ] = await searchActiveTeamMembers(serviceId);
      // Set all segmentFilters to allow any of these team members
      for (const seg of searchRequest.query.filter.segmentFilters) {
        seg.teamMemberIdFilter = { any: teamMembers };
      }
      // get availability
      const { result } = await bookingsApi.searchAvailability(searchRequest);
      availabilities = result.availabilities;
      additionalInfo = {
        serviceItem: services.relatedObjects.filter(relatedObject => relatedObject.type === "ITEM")[0],
        serviceVariation: services.object
      };
    } else {
      // Set all segmentFilters to require the selected staffId
      for (const seg of searchRequest.query.filter.segmentFilters) {
        seg.teamMemberIdFilter = { any: [staffId] };
      }
      // get availability
      const availabilityPromise = bookingsApi.searchAvailability(searchRequest);
      // get team member booking profile - needed to display team member details in left pane
      const bookingProfilePromise = bookingsApi.retrieveTeamMemberBookingProfile(staffId);
      
      const [ { result }, { result: services }, { result: { teamMemberBookingProfile } } ] = 
        await Promise.all([ availabilityPromise, retrieveServicePromise, bookingProfilePromise ]);
      
      availabilities = result.availabilities;
      additionalInfo = {
        bookingProfile: teamMemberBookingProfile,
        serviceItem: services.relatedObjects.filter(relatedObject => relatedObject.type === "ITEM")[0],
        serviceVariation: services.object
      };
      
      // Store booking profile in session for later use
      req.session.teamMemberBookingProfile = teamMemberBookingProfile;
    }
    
    // Validate that we have the required service item
    if (!additionalInfo.serviceItem) {
      console.error('No service item found in availability search');
      return res.redirect('/services?error=service_not_found');
    }
    
    // send the serviceId & serviceVersion since it's needed to book an appointment in the next step
    res.render("pages/availability", { 
      availabilities, 
      serviceId, 
      serviceVersion, 
      ...additionalInfo, 
      selectedServices, 
      quantities, 
      serviceDetails 
    });
  } catch (error) {
    console.error('Error in availability search:', error);
    
    // Handle specific API errors gracefully
    if (error.errors) {
      const apiError = error.errors[0];
      if (apiError.code === 'NOT_FOUND') {
        return res.redirect('/services?error=service_not_found');
      } else if (apiError.code === 'INVALID_REQUEST_BODY') {
        return res.redirect('/services?error=invalid_booking_params');
      }
    }
    
    next(error);
  }
});

module.exports = router;