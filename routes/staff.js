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
  bookingsApi,
  catalogApi,
  teamApi
} = require("../util/square-client");

const { safeJSONStringify } = require("../util/bigint-helpers");

/**
 * GET /staff/:serviceId?version
 *
 * This endpoint is in charge of retrieving all the staff associated with a specific service variation at a specific version.
 * It needs to do the following:
 * 1. Get the service variation from the serviceId provided in the path.
 * 2. Get the booking profiles for all staff members in the current location (that are bookable).
 * 3. Get all team members that are active.
 * 4. By cross referencing 1,2,3, we can find those team members who are associated with the service variation,
 *    are active, and bookable at the current location. These are the actual available staff members for the booking.
 */
router.get("/:serviceId", async (req, res, next) => {
  // Always use all selected services from session
  const selectedServices = req.session?.selectedServices || [req.params.serviceId];
  const quantities = req.session?.quantities || {};
  const serviceVersion = req.query.version || "";
  
  // Handle error messages from redirects
  const errorMessage = req.query.error;
  let error = null;
  if (errorMessage === 'no_staff_selected') {
    error = 'Please select a staff member to continue.';
  } else if (errorMessage === 'invalid_service') {
    error = 'The selected service is not available. Please try again.';
  } else if (errorMessage === 'no_staff_available') {
    error = 'No staff members are available for this service at this time.';
  } else if (errorMessage === 'staff_unavailable') {
    error = 'The selected staff member is currently unavailable. Please choose another.';
  }
  
  // Get total price and duration from the session
  const totalPrice = req.session?.totalPrice || 0;
  const totalDuration = req.session?.totalDuration || 0;
  const serviceSessionDetails = req.session?.serviceDetails || {};
  
  try {
    // Validate required parameters
    if (!req.params.serviceId) {
      return res.redirect('/services?error=no_service_selected');
    }

    // Validate location ID is configured
    if (!locationId) {
      throw new Error('Location ID not configured. Please check SQ_LOCATION_ID environment variable.');
    }

    // Group services by ID and count quantities
    const serviceGroups = {};
    selectedServices.forEach(sid => {
      if (serviceGroups[sid]) {
        serviceGroups[sid].quantity += 1;
      } else {
        serviceGroups[sid] = { id: sid, quantity: 1 };
      }
    });

    // Fetch all unique service variations for display
    const serviceDetails = [];
    let mainServiceVariation = null;
    let mainServiceItem = null;
    
    for (const sid of Object.keys(serviceGroups)) {
      const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
      const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
      
      // Store the main service data if this is the service we're displaying staff for
      if (sid === req.params.serviceId) {
        mainServiceVariation = variation;
        mainServiceItem = item;
      }
      
      // Get price from session details or from the fetched variation
      let price = null;
      if (serviceSessionDetails[sid] && serviceSessionDetails[sid].price) {
        price = serviceSessionDetails[sid].price;
      } else if (variation.itemVariationData.priceMoney) {
        // Safe BigInt conversion
        const amount = typeof variation.itemVariationData.priceMoney.amount === 'bigint' 
          ? Number(variation.itemVariationData.priceMoney.amount)
          : variation.itemVariationData.priceMoney.amount;
        
        price = {
          amount: amount,
          currency: variation.itemVariationData.priceMoney.currency
        };
      }
      
      serviceDetails.push({
        id: sid,
        name: item.itemData.name,
        duration: variation.itemVariationData.serviceDuration,
        quantity: serviceGroups[sid].quantity,
        price: price
      });
    }

    // If we didn't find the main service in our loop, fetch it separately
    if (!mainServiceVariation) {
      const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(req.params.serviceId, true);
      mainServiceVariation = variation;
      mainServiceItem = relatedObjects.filter(obj => obj.type === "ITEM")[0];
    }

    // Validate that we have the required service data
    if (!mainServiceVariation || !mainServiceItem) {
      console.error(`Service not found: ${req.params.serviceId}`);
      return res.redirect('/services?error=invalid_service');
    }

    // Validate that the service has team members assigned
    const serviceTeamMembers = mainServiceVariation.itemVariationData.teamMemberIds || [];
    if (serviceTeamMembers.length === 0) {
      console.warn(`No team members assigned to service: ${req.params.serviceId}`);
      return res.redirect(`/services?error=no_staff_available&service=${req.params.serviceId}`);
    }

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

    // Wait until all API calls have completed.
    const [ { result: { teamMemberBookingProfiles } }, { result: { teamMembers } } ] =
      await Promise.all([ listBookingProfilesPromise, listActiveTeamMembersPromise ]);

    // We want to filter teamMemberBookingProfiles by checking that the teamMemberId associated with the profile is in our serviceTeamMembers.
    // We also want to verify that each team member is ACTIVE.
    const serviceVariation = mainServiceVariation;
    const serviceItem = mainServiceItem;

    const activeTeamMembers = teamMembers.map(teamMember => teamMember.id);

    const bookableStaff = teamMemberBookingProfiles
      .filter(profile => serviceTeamMembers.includes(profile.teamMemberId) && activeTeamMembers.includes(profile.teamMemberId));

    // Validate that we have bookable staff available
    if (bookableStaff.length === 0) {
      console.warn(`No bookable staff found for service: ${req.params.serviceId}`);
      return res.redirect(`/services?error=no_staff_available&service=${req.params.serviceId}`);
    }

    // Pass all selectedServices, quantities, serviceDetails, and total price/duration to the view
    res.render("pages/select-staff", { 
      bookableStaff, 
      serviceItem, 
      serviceVariation, 
      serviceVersion, 
      selectedServices, 
      quantities, 
      serviceDetails, 
      totalPrice,
      totalDuration,
      error // Pass any error messages to the template
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/**
 * POST /staff/select
 * 
 * Handles staff member selection before proceeding to the next step.
 * This mimics how service selection works - select first, then submit form.
 */
router.post("/select", async (req, res, next) => {
  console.log('DEBUG: /staff/select route called');
  console.log('DEBUG: /staff/select req.body:', req.body);
  console.log('DEBUG: /staff/select req.session at start:', req.session);
  
  try {
    // Validate required environment configuration
    if (!locationId) {
      throw new Error('Location ID not configured. Please check SQ_LOCATION_ID environment variable.');
    }

    // Get the selected staff member ID from the form
    const selectedStaffId = req.body.staffId;
    
    // Validate that a staff member was selected
    if (!selectedStaffId) {
      const selectedServices = req.session?.selectedServices || [];
      const firstServiceId = selectedServices[0] || req.body.serviceId;
      const serviceVersion = req.body.serviceVersion || req.query.version || '';
      
      if (!firstServiceId) {
        return res.redirect('/services?error=no_service_selected');
      }
      
      return res.redirect(`/staff/${firstServiceId}?version=${serviceVersion}&error=no_staff_selected`);
    }
    
    // Ensure session exists
    if (!req.session) {
      req.session = {};
    }
    
    // Handle "Any Available Staff" selection
    if (selectedStaffId === 'anyStaffMember') {
      // Store special flag for any staff member selection
      req.session.selectedStaffId = 'anyStaffMember';
      req.session.staffProfile = {
        id: 'anyStaffMember',
        displayName: 'Any Available Staff Member',
        description: "Looking for the earliest available appointment with any qualified staff member.",
        profileImageUrl: ""
      };
      
      // Debug: Log the any staff selection
      console.log('DEBUG: /staff/select - Any Staff Member selected');
      console.log('DEBUG: /staff/select session.staffProfile', req.session.staffProfile);
    } else {
      // Store the selected staff in the session
      req.session.selectedStaffId = selectedStaffId;
      
      try {
        // Get staff profile details to store in session
        const { result: { teamMemberBookingProfile } } = await bookingsApi.retrieveTeamMemberBookingProfile(selectedStaffId);
        
        // Validate that we received the profile data
        if (!teamMemberBookingProfile) {
          console.error(`Failed to retrieve booking profile for staff: ${selectedStaffId}`);
          throw new Error('Staff member not found or not available for booking');
        }
        
        // Store the staff profile info in the session
        req.session.teamMemberBookingProfile = teamMemberBookingProfile;
        req.session.staffProfile = {
          id: teamMemberBookingProfile.teamMemberId,
          displayName: teamMemberBookingProfile.displayName,
          description: teamMemberBookingProfile.description || "",
          profileImageUrl: teamMemberBookingProfile.profileImageUrl || ""
        };
        
        // Debug: Log the selected staff info
        console.log('DEBUG: /staff/select session.selectedStaffId', req.session.selectedStaffId);
        console.log('DEBUG: /staff/select session.staffProfile', req.session.staffProfile);
      } catch (apiError) {
        console.error('Error retrieving staff booking profile:', apiError);
        
        // Redirect back to staff selection with error
        const selectedServices = req.session?.selectedServices || [];
        const firstServiceId = selectedServices[0] || req.body.serviceId;
        const serviceVersion = req.body.serviceVersion || req.query.version || '';
        
        if (!firstServiceId) {
          return res.redirect('/services?error=no_service_selected');
        }
        
        return res.redirect(`/staff/${firstServiceId}?version=${serviceVersion}&error=staff_unavailable`);
      }
    }
    
    // Get services from session to pass to availability page
    const selectedServices = req.session.selectedServices || [];
    const firstServiceId = selectedServices[0] || null;
    const serviceVersion = req.body.serviceVersion || req.query.version || '';
    
    // Debug: Log session data to diagnose the issue
    console.log('DEBUG: /staff/select session.selectedServices', req.session.selectedServices);
    console.log('DEBUG: /staff/select selectedServices', selectedServices);
    console.log('DEBUG: /staff/select firstServiceId', firstServiceId);
    console.log('DEBUG: /staff/select full session:', safeJSONStringify(req.session, 2));
    
    if (!firstServiceId) {
      console.log('DEBUG: /staff/select - No firstServiceId, redirecting to services with error');
      return res.redirect('/services?error=no_service_selected');
    }
    
    // CRITICAL FIX: Correct the redirect format to match availability route pattern
    // Route pattern is /:staffId/:serviceId, so staff ID comes first
    res.redirect(`/availability/${selectedStaffId}/${firstServiceId}?version=${serviceVersion}`);
  } catch (error) {
    console.error("Error in staff selection:", error);
    next(error);
  }
});

module.exports = router;