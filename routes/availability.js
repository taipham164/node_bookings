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
const { safeNumberConversion } = require("../util/bigint-helpers");
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
 * Recursively convert BigInt values to regular numbers in an object
 * @param {any} obj - The object to convert
 * @return {any} The object with BigInt values converted to numbers
 */
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return safeNumberConversion(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }
  
  return obj;
}

/**
 * Filter availability slots to only include those that have enough contiguous time
 * for the total duration of all selected services
 * @param {Array} availabilities - Array of availability objects from Square API
 * @param {Number} totalDurationMinutes - Total duration needed in minutes
 * @param {Array} segmentFilters - Array of segment filters used in the search
 * @return {Array} Filtered array of availability objects
 */
function filterAvailabilitiesByTotalDuration(availabilities, totalDurationMinutes, segmentFilters) {
  if (!availabilities || availabilities.length === 0) {
    return [];
  }
  
  // If we only have one segment or single service, no filtering needed
  if (segmentFilters.length <= 1) {
    return availabilities;
  }
  
  console.log(`DEBUG: Filtering availabilities for total duration: ${totalDurationMinutes} minutes`);
  
  return availabilities.filter(availability => {
    if (!availability.appointmentSegments || availability.appointmentSegments.length === 0) {
      return false;
    }
    
    // Check if this slot can accommodate all segments consecutively
    // For now, we'll use a simple approach: if all segments are returned for the same start time,
    // Square has verified that they can be scheduled consecutively
    const segmentDurations = availability.appointmentSegments.map(seg => seg.durationMinutes || 0);
    const availableSlotDuration = segmentDurations.reduce((sum, duration) => sum + duration, 0);
    
    const hasEnoughTime = availableSlotDuration >= totalDurationMinutes;
    
    if (!hasEnoughTime) {
      console.log(`DEBUG: Rejecting slot ${availability.startAt}: available=${availableSlotDuration}min, needed=${totalDurationMinutes}min`);
    }
    
    return hasEnoughTime;
  });
}

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
  
  // Also create a more immediate start time for better availability search
  const immediateStartAt = new Date();
  // Start from current time to capture immediate availability
  
  // Use the earlier of the two times to maximize availability options
  const searchStartAt = immediateStartAt < startAt ? immediateStartAt : startAt;
  
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
  let totalDurationMinutes = 0;
  
  // Check if selectedServices contains duplicates (expanded) or unique IDs
  const uniqueServices = [...new Set(selectedServices)];
  const isExpanded = selectedServices.length > uniqueServices.length;
  
  // If expanded, group by service ID and count occurrences
  const serviceCountMap = {};
  if (isExpanded) {
    selectedServices.forEach(sid => {
      serviceCountMap[sid] = (serviceCountMap[sid] || 0) + 1;
    });
  }
  
  for (const sid of uniqueServices) {
    try {
      const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
      const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
      
      if (!item) {
        console.warn(`No item found for service variation ${sid}`);
        continue;
      }
      
      const duration = variation.itemVariationData.serviceDuration;
      // Get quantity: if expanded, use count from array; otherwise use quantities object
      const quantity = isExpanded ? serviceCountMap[sid] : (quantities[sid] ? parseInt(quantities[sid], 10) : 1);
      
      console.log(`DEBUG: availability - service ${sid} duration: ${duration}, quantity: ${quantity} (type: ${typeof duration})`);
      
      serviceDetails.push({
        id: sid,
        name: item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : ""),
        duration,
        quantity
      });
      
      // Calculate total duration for all services
      const durationMinutes = Math.round(safeNumberConversion(duration) / 1000 / 60);
      totalDurationMinutes += durationMinutes * quantity;
      
      // For each quantity, push a segment with safe duration conversion
      for (let i = 0; i < quantity; i++) {
        console.log(`DEBUG: availability - segment ${i+1} for service ${sid}: durationMinutes=${durationMinutes}`);
        
        const segment = {
          serviceVariationId: sid,
          durationMinutes: durationMinutes
        };
        
        // Add service variation version if available for more precise matching
        if (serviceVersion) {
          segment.serviceVariationVersion = parseInt(serviceVersion, 10);
        }
        
        segmentFilters.push(segment);
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
  
  console.log(`DEBUG: availability - Total duration needed: ${totalDurationMinutes} minutes for ${segmentFilters.length} segments`);

  // If no valid services found, redirect back
  if (segmentFilters.length === 0) {
    console.error('No valid services found for availability search');
    return res.redirect('/services?error=no_valid_services');
  }

  console.log('DEBUG: availability - segmentFilters:', JSON.stringify(segmentFilters, null, 2));

  // Create multiple search requests to get comprehensive availability
  const baseSearchRequest = {
    query: {
      filter: {
        locationId,
        segmentFilters: segmentFilters.map(seg => ({ ...seg })), // Clone to avoid mutation
        startAtRange: {
          endAt: dateHelpers.getEndAtDate(searchStartAt).toISOString(),
          startAt: searchStartAt.toISOString(),
        }
      }
    }
  };
  
  // Try with simpler segments for broader search
  const simplifiedSegments = segmentFilters.map(seg => ({
    serviceVariationId: seg.serviceVariationId,
    // Remove durationMinutes to let Square determine optimal slots
  }));
  
  const simplifiedSearchRequest = {
    query: {
      filter: {
        locationId,
        segmentFilters: simplifiedSegments,
        startAtRange: {
          endAt: dateHelpers.getEndAtDate(searchStartAt).toISOString(),
          startAt: searchStartAt.toISOString(),
        }
      }
    }
  };
  
  // Create a minimal search request for maximum availability
  const minimalSearchRequest = {
    query: {
      filter: {
        locationId,
        segmentFilters: [{
          serviceVariationId: serviceId, // Use the primary service only
        }],
        startAtRange: {
          endAt: dateHelpers.getEndAtDate(searchStartAt).toISOString(),
          startAt: searchStartAt.toISOString(),
        }
      }
    }
  };
  
  console.log('DEBUG: availability - searchRequest:', JSON.stringify(baseSearchRequest, null, 2));
  
  try {
    // get service item - needed to display service details in left pane
    const retrieveServicePromise = catalogApi.retrieveCatalogObject(serviceId, true);
    let allAvailabilities = [];
    // additional data to send to template
    let additionalInfo;
    
    // Function to get all availability slots with comprehensive search strategies
    const getAllAvailabilities = async (searchReq) => {
      let availabilities = [];
      let cursor = null;
      let hasMore = true;
      let pageCount = 0;
      
      console.log('DEBUG: Starting availability search with request:', JSON.stringify(searchReq, null, 2));
      
      while (hasMore && pageCount < 20) { // Increase page limit for more comprehensive search
        pageCount++;
        const requestWithCursor = { ...searchReq };
        if (cursor) {
          requestWithCursor.cursor = cursor;
        }
        
        console.log(`DEBUG: Fetching availability page ${pageCount}${cursor ? ' with cursor' : ''}`);
        
        try {
          const { result } = await bookingsApi.searchAvailability(requestWithCursor);
          
          console.log(`DEBUG: Page ${pageCount} returned:`, {
            availabilitiesCount: result.availabilities?.length || 0,
            hasCursor: !!result.cursor,
            sampleTimes: result.availabilities?.slice(0, 3).map(a => a.startAt) || []
          });
          
          if (result.availabilities && result.availabilities.length > 0) {
            availabilities = availabilities.concat(result.availabilities);
            console.log(`DEBUG: Retrieved ${result.availabilities.length} slots, total: ${availabilities.length}`);
          }
          
          cursor = result.cursor;
          hasMore = !!cursor;
          
          // If no new results, break to prevent infinite loop
          if (!result.availabilities || result.availabilities.length === 0) {
            hasMore = false;
          }
        } catch (error) {
          console.error(`DEBUG: Error on page ${pageCount}:`, error.message);
          hasMore = false;
        }
      }
      
      console.log(`DEBUG: Final availability count: ${availabilities.length} across ${pageCount} pages`);
      return availabilities;
    };
    
    // search availability for the specific staff member if staff id is passed as a param
    if (staffId === ANY_STAFF_PARAMS) {
      // For "any staff", get all team members who can perform the first service (for left pane info)
      const [ services, teamMembers ] = await searchActiveTeamMembers(serviceId);
      // Set all segmentFilters to allow any of these team members
      for (const seg of baseSearchRequest.query.filter.segmentFilters) {
        seg.teamMemberIdFilter = { any: teamMembers };
      }
      for (const seg of simplifiedSearchRequest.query.filter.segmentFilters) {
        seg.teamMemberIdFilter = { any: teamMembers };
      }
      for (const seg of minimalSearchRequest.query.filter.segmentFilters) {
        seg.teamMemberIdFilter = { any: teamMembers };
      }
      
      // Try multiple search approaches and combine results
      let availabilities1, availabilities2, availabilities3;
      try {
        console.log('DEBUG: Trying detailed search...');
        availabilities1 = await getAllAvailabilities(baseSearchRequest);
        console.log(`DEBUG: Detailed search returned ${availabilities1.length} slots`);
      } catch (error) {
        console.warn('Detailed search failed:', error.message);
        availabilities1 = [];
      }
      
      try {
        console.log('DEBUG: Trying simplified search...');
        availabilities2 = await getAllAvailabilities(simplifiedSearchRequest);
        console.log(`DEBUG: Simplified search returned ${availabilities2.length} slots`);
      } catch (error) {
        console.warn('Simplified search failed:', error.message);
        availabilities2 = [];
      }
      
      try {
        console.log('DEBUG: Trying minimal search...');
        availabilities3 = await getAllAvailabilities(minimalSearchRequest);
        console.log(`DEBUG: Minimal search returned ${availabilities3.length} slots`);
      } catch (error) {
        console.warn('Minimal search failed:', error.message);
        availabilities3 = [];
      }
      
      // Combine and deduplicate results
      const allSlotsMap = new Map();
      [...availabilities1, ...availabilities2, ...availabilities3].forEach(slot => {
        const key = `${slot.startAt}_${slot.appointmentSegments?.[0]?.teamMemberId || 'any'}`;
        if (!allSlotsMap.has(key)) {
          allSlotsMap.set(key, slot);
        }
      });
      
      allAvailabilities = Array.from(allSlotsMap.values()).sort((a, b) => 
        new Date(a.startAt) - new Date(b.startAt)
      );
      
      console.log(`DEBUG: availability - found ${allAvailabilities?.length || 0} total unique availability slots`);
      if (allAvailabilities && allAvailabilities.length > 0) {
        console.log('DEBUG: availability - first few slots:', allAvailabilities.slice(0, 3).map(a => ({
          startAt: a.startAt,
          segments: a.appointmentSegments?.length || 0
        })));
      }
      
      additionalInfo = {
        serviceItem: services.relatedObjects.filter(relatedObject => relatedObject.type === "ITEM")[0],
        serviceVariation: services.object
      };
    } else {
      // Set all segmentFilters to require the selected staffId
      for (const seg of baseSearchRequest.query.filter.segmentFilters) {
        seg.teamMemberIdFilter = { any: [staffId] };
      }
      for (const seg of simplifiedSearchRequest.query.filter.segmentFilters) {
        seg.teamMemberIdFilter = { any: [staffId] };
      }
      for (const seg of minimalSearchRequest.query.filter.segmentFilters) {
        seg.teamMemberIdFilter = { any: [staffId] };
      }
      
      // get team member booking profile - needed to display team member details in left pane
      const bookingProfilePromise = bookingsApi.retrieveTeamMemberBookingProfile(staffId);
      
      const [ { result: services }, { result: { teamMemberBookingProfile } } ] = 
        await Promise.all([ retrieveServicePromise, bookingProfilePromise ]);
      
      console.log(`DEBUG: services object structure:`, {
        hasRelatedObjects: !!services?.relatedObjects,
        relatedObjectsCount: services?.relatedObjects?.length || 0,
        hasObject: !!services?.object,
        objectType: services?.object?.type
      });
      console.log(`DEBUG: services type:`, typeof services);
      console.log(`DEBUG: services.relatedObjects:`, services?.relatedObjects?.length || 'undefined');
      
      // Try multiple search approaches and combine results
      let availabilities1, availabilities2, availabilities3;
      try {
        console.log(`DEBUG: Trying detailed search for staff ${staffId}...`);
        availabilities1 = await getAllAvailabilities(baseSearchRequest);
        console.log(`DEBUG: Detailed search returned ${availabilities1.length} slots for staff ${staffId}`);
      } catch (error) {
        console.warn('Detailed search failed:', error.message);
        availabilities1 = [];
      }
      
      try {
        console.log(`DEBUG: Trying simplified search for staff ${staffId}...`);
        availabilities2 = await getAllAvailabilities(simplifiedSearchRequest);
        console.log(`DEBUG: Simplified search returned ${availabilities2.length} slots for staff ${staffId}`);
      } catch (error) {
        console.warn('Simplified search failed:', error.message);
        availabilities2 = [];
      }
      
      try {
        console.log(`DEBUG: Trying minimal search for staff ${staffId}...`);
        availabilities3 = await getAllAvailabilities(minimalSearchRequest);
        console.log(`DEBUG: Minimal search returned ${availabilities3.length} slots for staff ${staffId}`);
      } catch (error) {
        console.warn('Minimal search failed:', error.message);
        availabilities3 = [];
      }
      
      // Combine and deduplicate results
      const allSlotsMap = new Map();
      [...availabilities1, ...availabilities2, ...availabilities3].forEach(slot => {
        const key = slot.startAt;
        if (!allSlotsMap.has(key)) {
          allSlotsMap.set(key, slot);
        }
      });
      
      allAvailabilities = Array.from(allSlotsMap.values()).sort((a, b) => 
        new Date(a.startAt) - new Date(b.startAt)
      );
      
      console.log(`DEBUG: availability - found ${allAvailabilities?.length || 0} total unique availability slots for staff ${staffId}`);
      
      // Add detailed debugging for times
      if (allAvailabilities && allAvailabilities.length > 0) {
        console.log(`DEBUG: Sample availability times (first 10):`);
        allAvailabilities.slice(0, 10).forEach((slot, index) => {
          const startTime = new Date(slot.startAt);
          console.log(`  ${index + 1}. ${slot.startAt} -> Local: ${startTime.toLocaleString()}`);
        });
        
        // Check for evening slots specifically
        const eveningSlots = allAvailabilities.filter(slot => {
          const hour = new Date(slot.startAt).getHours();
          return hour >= 17; // 5 PM and after
        });
        console.log(`DEBUG: Found ${eveningSlots.length} evening slots (5pm+) out of ${allAvailabilities.length} total`);
        if (eveningSlots.length > 0) {
          console.log('DEBUG: Evening slot examples:', eveningSlots.slice(0, 5).map(slot => ({
            startAt: slot.startAt,
            localTime: new Date(slot.startAt).toLocaleString()
          })));
        }
      }
      
      if (!services || !services.relatedObjects) {
        console.error('ERROR: services object or relatedObjects is missing:', services);
        throw new Error('Failed to retrieve service information from Square API');
      }
      
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
    
    // Filter availability slots to ensure they have enough total duration for all services
    const filteredAvailabilities = filterAvailabilitiesByTotalDuration(allAvailabilities, totalDurationMinutes, segmentFilters);
    console.log(`DEBUG: Filtered ${allAvailabilities.length} slots down to ${filteredAvailabilities.length} slots that have ${totalDurationMinutes} minutes available`);
    
    // Debug the data being passed to template
    console.log('DEBUG: Template data being passed:', {
      availabilities: filteredAvailabilities.length + ' slots',
      serviceId,
      serviceVersion,
      additionalInfo,
      selectedServices,
      quantities,
      serviceDetails
    });
    
    // Convert BigInt values to regular numbers to prevent EJS template errors
    const safeAdditionalInfo = convertBigIntToNumber(additionalInfo);
    const safeServiceDetails = convertBigIntToNumber(serviceDetails);
    const safeAvailabilities = convertBigIntToNumber(filteredAvailabilities);
    
    // send the serviceId & serviceVersion since it's needed to book an appointment in the next step
    res.render("pages/availability", { 
      availabilities: safeAvailabilities, 
      serviceId, 
      serviceVersion, 
      ...safeAdditionalInfo, 
      selectedServices, 
      quantities, 
      serviceDetails: safeServiceDetails 
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