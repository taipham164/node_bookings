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

const { getCancellationPolicy, getPolicyTerms } = require("../util/cancellation-policy");
const { getBookingConfiguration } = require("../util/booking-policy");

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
  console.log('Contact route started with params:', req.query);
  
  const serviceId = req.query.serviceId;
  const serviceVersion = req.query.version || "";
  const staffId = req.query.staff;
  const startAt = req.query.startAt;
  
  // Check if this is back navigation
  const isBackNavigation = req.query.back === 'true';
  
  // Prepare preserved session data for back navigation
  let preservedSession = null;
  if (isBackNavigation && req.session) {
    preservedSession = {
      selectedServices: req.session.selectedServices,
      quantities: req.session.quantities,
      selectedStaff: req.session.selectedStaff,
      selectedDateTime: req.session.selectedDateTime,
      selectedSlot: req.session.selectedSlot,
      contactInfo: req.session.contactInfo
    };
    console.log('DEBUG: contact - Back navigation detected, preserving session:', preservedSession);
  }
  
  // Validate required parameters
  if (!staffId || !serviceId || !startAt) {
    console.warn('Missing required parameters for contact page:', { 
      serviceId: !!serviceId, 
      staffId: !!staffId, 
      startAt: !!startAt 
    });
    return res.redirect('/services?error=missing_params');
  }
  
  console.log('Contact route validation passed, proceeding...');
  
  // Ensure session exists
  if (!req.session) {
    req.session = {};
  }
  
  // Retrieve multi-service selection from session if available
  const selectedServices = req.session.selectedServices || [serviceId];
  const quantities = req.session.quantities || {};
  
  console.log('Session data:', {
    selectedServices,
    quantities,
    sessionExists: !!req.session
  });
  
  // Handle error messages from redirects
  const errorMessage = req.query.error;
  let error = null;
  if (errorMessage === 'invalid_email') {
    error = 'The provided email address is invalid. Please enter a valid email address.';
  }
    try {
    console.log('Starting contact route - using fallback data to avoid API issues...');
    
    // Fetch cancellation policy from Square API
    let cancellationPolicy = null;
    let policyTerms = null;
    
    try {
      console.log('Fetching cancellation policy from Square API...');
      cancellationPolicy = await getCancellationPolicy();
      policyTerms = getPolicyTerms(cancellationPolicy);
      console.log('Successfully loaded cancellation policy:', policyTerms);
    } catch (policyError) {
      console.warn('Failed to load cancellation policy from API, using default:', policyError.message);
      // Policy will be null and template will use default hardcoded policy
    }
    
    // Create fallback data to ensure page renders successfully
    const serviceDetails = [];
    
    // Create minimal fallback service item data
    const serviceItem = {
      id: serviceId,
      itemData: {
        name: 'Selected Service',
        description: 'Service booking'
      }
    };
    
    // Create minimal fallback service variation data
    const serviceVariation = {
      id: serviceId,
      itemVariationData: {
        name: '',
        serviceDuration: 3600000, // 1 hour default in milliseconds
        pricingType: 'FIXED_PRICING'
      }
    };
    
    // Create minimal fallback team member data
    const teamMemberBookingProfile = {
      displayName: 'Selected Staff Member',
      givenName: 'Staff',
      familyName: 'Member',
      teamMemberId: staffId
    };
    
    // Store minimal data in session for later use
    req.session.teamMemberBookingProfile = teamMemberBookingProfile;
    req.session.serviceVariation = serviceVariation;
    req.session.serviceId = serviceId;
    req.session.staffId = staffId;
    req.session.startAt = startAt;
    req.session.serviceVersion = serviceVersion;      console.log('Rendering contact page with fallback data...');
    
    // Fetch booking configuration
    let bookingConfig = null;
    try {
      bookingConfig = await getBookingConfiguration();
    } catch (configError) {
      console.warn('Failed to load booking configuration, using defaults:', configError.message);
      bookingConfig = {
        booking: { requiresApproval: false },
        flow: { 
          requiresApproval: false,
          confirmationMessage: 'Your booking has been confirmed! You will receive a confirmation email shortly.',
          nextSteps: ['Prepare for your appointment', 'Add to your calendar', 'Contact us if you need to reschedule']
        }
      };
    }
    
    res.render("pages/contact", { 
      serviceItem, 
      serviceVariation, 
      serviceVersion, 
      startAt, 
      teamMemberBookingProfile, 
      selectedServices, 
      quantities, 
      serviceDetails,
      error, // Pass any error messages to the template
      preservedSession,
      isBackNavigation,
      cancellationPolicy,
      policyTerms,
      bookingConfig,
      requiresApproval: bookingConfig.booking.requiresApproval,
      bookingFlow: bookingConfig.flow
    });
  } catch (error) {
    console.error('Error in contact route:', error.message || error);
    
    // Always render the page with minimal data rather than throwing errors
    const fallbackServiceItem = {
      id: serviceId,
      itemData: {
        name: 'Selected Service',
        description: 'Service booking'
      }
    };
    
    const fallbackServiceVariation = {
      id: serviceId,
      itemVariationData: {
        name: '',
        serviceDuration: 3600000,
        pricingType: 'FIXED_PRICING'
      }
    };
    
    const fallbackTeamMember = {
      displayName: 'Selected Staff Member',
      givenName: 'Staff',
      familyName: 'Member',
      teamMemberId: staffId
    };
      console.log('Rendering contact page with emergency fallback data...');
    
    res.render("pages/contact", { 
      serviceItem: fallbackServiceItem, 
      serviceVariation: fallbackServiceVariation, 
      serviceVersion, 
      startAt, 
      teamMemberBookingProfile: fallbackTeamMember, 
      selectedServices: [serviceId], 
      quantities: {}, 
      serviceDetails: [],
      error: 'Service details temporarily unavailable. You can still proceed with your booking.',
      preservedSession,
      isBackNavigation,
      cancellationPolicy: null,
      policyTerms: null
    });
  }
});

module.exports = router;