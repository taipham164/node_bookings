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
const { asyncHandler, ValidationError } = require("../middleware/errorHandler");
const { logger } = require("../util/logger");

/**
 * GET /staff/:serviceId?version
 *
 * This endpoint is responsible for displaying staff members that can perform the selected service.
 */
router.get("/:serviceId", asyncHandler(async (req, res, next) => {
  logger.debug('/staff/:serviceId route called with serviceId:', req.params.serviceId);
  logger.debug('/staff/:serviceId req.session:', req.session);
  
  const isBackNavigation = req.query.back === 'true';
  
  // If this is back navigation, preserve existing session data
  let preservedSession = null;
  if (isBackNavigation && req.session) {
    preservedSession = {
      selectedServices: req.session.selectedServices,
      quantities: req.session.quantities,
      serviceDetails: req.session.serviceDetails,
      totalDuration: req.session.totalDuration,
      totalPrice: req.session.totalPrice,
      selectedStaffId: req.session.selectedStaffId,
      teamMemberBookingProfile: req.session.teamMemberBookingProfile,
      staffProfile: req.session.staffProfile
    };
    logger.debug('Back navigation to staff - preserving session:', preservedSession);
  }
  
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

    logger.debug('/staff/:serviceId selectedServices:', selectedServices);
    logger.debug('/staff/:serviceId serviceSessionDetails:', serviceSessionDetails);
    logger.debug('Starting service processing...');

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
      logger.debug('No services selected, redirecting to services page');
      return res.redirect('/services?error=no_service_selected');
    }

    logger.debug('Processing service groups and fetching catalog data...');
    
    // Group services by ID and count quantities
    const serviceGroups = {};
    selectedServices.forEach(sid => {
      if (serviceGroups[sid]) {
        serviceGroups[sid].quantity += 1;
      } else {
        serviceGroups[sid] = { id: sid, quantity: 1 };
      }
    });
    
    logger.debug('Service groups:', serviceGroups);

    // Fetch all unique service variations for display
    const serviceDetails = [];
    let mainServiceVariation = null;
    let mainServiceItem = null;
    
    logger.debug('Starting catalog fetch loop...');
    
    try {
      for (const sid of Object.keys(serviceGroups)) {
        logger.debug(`Fetching catalog data for service ${sid}...`);
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
          logger.error(`Error fetching service ${sid}:`, catalogError.message);
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
          logger.error(`Error fetching main service ${req.params.serviceId}:`, catalogError.message);
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
      logger.error('General error in service processing:', generalError);
      throw generalError;
    }

    // Validate that we have the required service data
    if (!mainServiceVariation || !mainServiceItem) {
      logger.error(`Service not found: ${req.params.serviceId}`);
      return res.redirect('/services?error=invalid_service');
    }

    // Validate that the service has team members assigned
    const serviceTeamMembers = mainServiceVariation.itemVariationData.teamMemberIds || [];
    if (serviceTeamMembers.length === 0) {
      logger.warn(`No team members assigned to service: ${req.params.serviceId}`);
      return res.redirect(`/services?error=no_staff_available&service=${req.params.serviceId}`);
    }

    logger.debug('About to call team API endpoints...');

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

    logger.debug('Team API promises created, awaiting results...');

    // Wait until all API calls have completed.
    const [ { result: { teamMemberBookingProfiles } }, { result: { teamMembers } } ] =
      await Promise.all([ listBookingProfilesPromise, listActiveTeamMembersPromise ]);

    logger.debug('Team API calls completed successfully');
    logger.debug('teamMemberBookingProfiles count:', teamMemberBookingProfiles?.length || 0);
    logger.debug('teamMembers count:', teamMembers?.length || 0);

    // We want to filter teamMemberBookingProfiles by checking that the teamMemberId associated with the profile is in our serviceTeamMembers.
    // We also want to verify that each team member is ACTIVE.
    const serviceVariation = mainServiceVariation;
    const serviceItem = mainServiceItem;

    const activeTeamMembers = teamMembers.map(teamMember => teamMember.id);

    logger.debug('serviceTeamMembers:', serviceTeamMembers);
    logger.debug('activeTeamMembers:', activeTeamMembers);

    const bookableStaff = teamMemberBookingProfiles
      .filter(profile => serviceTeamMembers.includes(profile.teamMemberId) && activeTeamMembers.includes(profile.teamMemberId));

    logger.debug('bookableStaff count:', bookableStaff?.length || 0);

    // Validate that we have bookable staff available
    if (bookableStaff.length === 0) {
      logger.warn(`No bookable staff found for service: ${req.params.serviceId}`);
      return res.redirect(`/services?error=no_staff_available&service=${req.params.serviceId}`);
    }

    logger.debug('About to render select-staff page...');

    // Convert any BigInt values to safe JSON before passing to template
    const safeBookableStaff = JSON.parse(safeJSONStringify(bookableStaff));
    const safeServiceItem = JSON.parse(safeJSONStringify(serviceItem));
    const safeServiceVariation = JSON.parse(safeJSONStringify(serviceVariation));
    const safeSelectedServices = JSON.parse(safeJSONStringify(selectedServices));
    const safeQuantities = JSON.parse(safeJSONStringify(quantities));
    const safeServiceDetails = JSON.parse(safeJSONStringify(serviceDetails));
    const safeTotalPrice = JSON.parse(safeJSONStringify(totalPrice));
    const safeTotalDuration = JSON.parse(safeJSONStringify(totalDuration));

    logger.debug('All data converted to safe JSON, about to render...');

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
      preservedSession,
      isBackNavigation,
      error // Pass any error messages to the template
    });
  } catch (error) {
    logger.error('ERROR in staff route:', error);
    logger.error('ERROR stack:', error.stack);
    logger.error('ERROR message:', error.message);
    next(error);
  }
}));

/**
 * POST /staff/select
 * 
 * Handles staff member selection before proceeding to the next step.
 * This mimics how service selection works - select first, then submit form.
 */
router.post("/select", asyncHandler(async (req, res, next) => {
  logger.debug('/staff/select route called');
  logger.debug('/staff/select req.body:', req.body);
  logger.debug('/staff/select req.session at start:', req.session);
  
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
      logger.debug('/staff/select - Any Staff Member selected');
      logger.debug('/staff/select session.staffProfile', req.session.staffProfile);
    } else {
      // Store the selected staff in the session
      req.session.selectedStaffId = selectedStaffId;
      
      try {
        // Get staff profile details to store in session
        const { result: { teamMemberBookingProfile } } = await bookingsApi.retrieveTeamMemberBookingProfile(selectedStaffId);
        
        // Validate that we received the profile data
        if (!teamMemberBookingProfile) {
          logger.error(`Failed to retrieve booking profile for staff: ${selectedStaffId}`);
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
        logger.debug('/staff/select session.selectedStaffId', req.session.selectedStaffId);
        logger.debug('/staff/select session.staffProfile', req.session.staffProfile);
      } catch (apiError) {
        logger.error('Error retrieving staff booking profile:', apiError);
        
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
    logger.debug('/staff/select session.selectedServices', req.session.selectedServices);
    logger.debug('/staff/select selectedServices', selectedServices);
    logger.debug('/staff/select firstServiceId', firstServiceId);
    logger.debug('/staff/select full session:', safeJSONStringify(req.session, 2));
    
    if (!firstServiceId) {
      logger.debug('/staff/select - No firstServiceId, redirecting to services with error');
      return res.redirect('/services?error=no_service_selected');
    }
    
    // CRITICAL FIX: Correct the redirect format to match availability route pattern
    // Route pattern is /:staffId/:serviceId, so staff ID comes first
    
    // Ensure session is saved before redirect
    req.session.save((err) => {
      if (err) {
        logger.error('Session save error:', err);
      }
      logger.debug('Session saved before redirect to availability');
      res.redirect(`/availability/${selectedStaffId}/${firstServiceId}?version=${serviceVersion}`);
    });
  } catch (error) {
    logger.error("Error in staff selection:", error);
    next(error);
  }
}));

module.exports = router;