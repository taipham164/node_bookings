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
 * This endpoint is responsible for displaying staff members that can perform the selected service.
 */
router.get("/:serviceId", async (req, res, next) => {
  console.log('DEBUG: /staff/:serviceId route called with serviceId:', req.params.serviceId);
  console.log('DEBUG: /staff/:serviceId req.session:', req.session);
  
  try {
    // Validate required environment configuration
    if (!locationId) {
      throw new Error('Location ID not configured. Please check SQ_LOCATION_ID environment variable.');
    }

    // Validate required parameters
    if (!req.params.serviceId) {
      return res.redirect('/services?error=no_service_selected');
    }

    const serviceVersion = req.query.version || '';
    
    // Get session data with defaults
    const selectedServices = req.session?.selectedServices || [];
    const quantities = req.session?.quantities || {};
    const serviceSessionDetails = req.session?.serviceDetails || {};
    const totalPrice = req.session?.totalPrice || 0;
    const totalDuration = req.session?.totalDuration || 0;

    console.log('DEBUG: /staff/:serviceId selectedServices:', selectedServices);
    console.log('DEBUG: /staff/:serviceId serviceSessionDetails:', serviceSessionDetails);
    console.log('DEBUG: Starting service processing...');

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

    // If no services in session, redirect to services page  
    if (selectedServices.length === 0) {
      console.log('DEBUG: No services selected, redirecting to services page');
      return res.redirect('/services?error=no_service_selected');
    }

    console.log('DEBUG: Processing service groups and fetching catalog data...');
    
    // Group services by ID and count quantities
    const serviceGroups = {};
    selectedServices.forEach(sid => {
      if (serviceGroups[sid]) {
        serviceGroups[sid].quantity += 1;
      } else {
        serviceGroups[sid] = { id: sid, quantity: 1 };
      }
    });
    
    console.log('DEBUG: Service groups:', serviceGroups);

    // Fetch all unique service variations for display
    const serviceDetails = [];
    let mainServiceVariation = null;
    let mainServiceItem = null;
    
    console.log('DEBUG: Starting catalog fetch loop...');
    
    try {
      for (const sid of Object.keys(serviceGroups)) {
        console.log(`DEBUG: Fetching catalog data for service ${sid}...`);
        try {
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
        } catch (catalogError) {
          console.error(`Error fetching service ${sid}:`, catalogError.message);
          // Use session data as fallback
          if (serviceSessionDetails[sid]) {
            serviceDetails.push({
              id: sid,
              name: serviceSessionDetails[sid].name || `Service ${sid}`,
              duration: serviceSessionDetails[sid].duration || 1800000,
              quantity: serviceGroups[sid].quantity,
              price: serviceSessionDetails[sid].price || null
            });
          }
        }
      }

      // If we didn't find the main service in our loop, try to fetch it separately or use fallback
      if (!mainServiceVariation) {
        try {
          const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(req.params.serviceId, true);
          mainServiceVariation = variation;
          mainServiceItem = relatedObjects.filter(obj => obj.type === "ITEM")[0];
        } catch (catalogError) {
          console.error(`Error fetching main service ${req.params.serviceId}:`, catalogError.message);
          // Create fallback service data
          mainServiceVariation = {
            itemVariationData: {
              name: "Regular",
              serviceDuration: serviceSessionDetails[req.params.serviceId]?.duration || 1800000,
              priceMoney: serviceSessionDetails[req.params.serviceId]?.price || { amount: 3500, currency: "USD" },
              teamMemberIds: ["fallback-team-member"]
            }
          };
          mainServiceItem = {
            itemData: {
              name: serviceSessionDetails[req.params.serviceId]?.name || `Service ${req.params.serviceId}`,
              description: "Professional service"
            }
          };
        }
      }
    } catch (generalError) {
      console.error('General error in service processing:', generalError);
      throw generalError;
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

    console.log('DEBUG: About to call team API endpoints...');

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

    console.log('DEBUG: Team API promises created, awaiting results...');

    // Wait until all API calls have completed.
    const [ { result: { teamMemberBookingProfiles } }, { result: { teamMembers } } ] =
      await Promise.all([ listBookingProfilesPromise, listActiveTeamMembersPromise ]);

    console.log('DEBUG: Team API calls completed successfully');
    console.log('DEBUG: teamMemberBookingProfiles count:', teamMemberBookingProfiles?.length || 0);
    console.log('DEBUG: teamMembers count:', teamMembers?.length || 0);

    // We want to filter teamMemberBookingProfiles by checking that the teamMemberId associated with the profile is in our serviceTeamMembers.
    // We also want to verify that each team member is ACTIVE.
    const serviceVariation = mainServiceVariation;
    const serviceItem = mainServiceItem;

    const activeTeamMembers = teamMembers.map(teamMember => teamMember.id);

    console.log('DEBUG: serviceTeamMembers:', serviceTeamMembers);
    console.log('DEBUG: activeTeamMembers:', activeTeamMembers);

    const bookableStaff = teamMemberBookingProfiles
      .filter(profile => serviceTeamMembers.includes(profile.teamMemberId) && activeTeamMembers.includes(profile.teamMemberId));

    console.log('DEBUG: bookableStaff count:', bookableStaff?.length || 0);

    // Validate that we have bookable staff available
    if (bookableStaff.length === 0) {
      console.warn(`No bookable staff found for service: ${req.params.serviceId}`);
      return res.redirect(`/services?error=no_staff_available&service=${req.params.serviceId}`);
    }

    console.log('DEBUG: About to render select-staff page...');

    // Convert any BigInt values to safe JSON before passing to template
    const safeBookableStaff = JSON.parse(safeJSONStringify(bookableStaff));
    const safeServiceItem = JSON.parse(safeJSONStringify(serviceItem));
    const safeServiceVariation = JSON.parse(safeJSONStringify(serviceVariation));
    const safeSelectedServices = JSON.parse(safeJSONStringify(selectedServices));
    const safeQuantities = JSON.parse(safeJSONStringify(quantities));
    const safeServiceDetails = JSON.parse(safeJSONStringify(serviceDetails));
    const safeTotalPrice = JSON.parse(safeJSONStringify(totalPrice));
    const safeTotalDuration = JSON.parse(safeJSONStringify(totalDuration));

    console.log('DEBUG: All data converted to safe JSON, about to render...');

    // Pass all selectedServices, quantities, serviceDetails, and total price/duration to the view
    res.render("pages/select-staff", { 
      bookableStaff: safeBookableStaff, 
      serviceItem: safeServiceItem, 
      serviceVariation: safeServiceVariation, 
      serviceVersion, 
      selectedServices: safeSelectedServices, 
      quantities: safeQuantities, 
      serviceDetails: safeServiceDetails, 
      totalPrice: safeTotalPrice,
      totalDuration: safeTotalDuration,
      error // Pass any error messages to the template
    });
  } catch (error) {
    console.error('ERROR in staff route:', error);
    console.error('ERROR stack:', error.stack);
    console.error('ERROR message:', error.message);
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
    
    // Ensure session is saved before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
      console.log('DEBUG: Session saved before redirect to availability');
      res.redirect(`/availability/${selectedStaffId}/${firstServiceId}?version=${serviceVersion}`);
    });
  } catch (error) {
    console.error("Error in staff selection:", error);
    next(error);
  }
});

module.exports = router;