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
const { safeNumberConversion } = require("../util/bigint-helpers");

/**
 * Fetch tax objects from Square API based on tax IDs
 * @param {string[]} taxIds - Array of tax IDs to fetch
 * @returns {Object} - Map of tax ID to tax object with rate information
 */
async function fetchTaxObjects(taxIds) {
  if (!taxIds || taxIds.length === 0) {
    return {};
  }

  try {
    const taxObjects = {};
    
    // Fetch each tax object individually
    for (const taxId of taxIds) {
      try {
        const { result } = await catalogApi.retrieveCatalogObject(taxId);
        if (result.object && result.object.type === 'TAX') {
          const taxData = result.object.taxData;
          taxObjects[taxId] = {
            id: taxId,
            name: taxData.name || 'Tax',
            percentage: taxData.percentage ? parseFloat(taxData.percentage) / 100 : 0,
            inclusionType: taxData.inclusionType || 'ADDITIVE',
            enabled: taxData.enabled !== false
          };
        }
      } catch (taxError) {
        console.warn(`Failed to fetch tax object ${taxId}:`, taxError.message);
        // Continue with other tax objects
      }
    }
    
    return taxObjects;
  } catch (error) {
    console.error('Error fetching tax objects:', error);
    return {};
  }
}

/**
 * Recursively convert BigInt values to regular numbers in an object/array
 * This prevents EJS template rendering errors with BigInt values
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
    
    // Build serviceDetails from session data (similar to availability route)
    if (selectedServices && selectedServices.length > 0) {
      console.log('Building serviceDetails from session data...');
      
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
          
          if (item) {
            const duration = variation.itemVariationData.serviceDuration;
            const price = variation.itemVariationData.priceMoney;
            // Get quantity: if expanded, use count from array; otherwise use quantities object
            const quantity = isExpanded ? serviceCountMap[sid] : (quantities[sid] ? parseInt(quantities[sid], 10) : 1);
            
            console.log(`DEBUG: contact - service ${sid} duration: ${duration}, quantity: ${quantity}`);
            
            // Build comprehensive service data including tax information
            const serviceData = {
              id: sid,
              name: item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : ""),
              duration,
              price,
              quantity
            };
            
            // Include tax information if available from Square API
            if (variation.itemVariationData.locationOverrides) {
              // Check for location-specific tax overrides
              variation.itemVariationData.locationOverrides.forEach(override => {
                if (override.trackInventory === false && override.priceMoney) {
                  // Additional price/tax information might be here
                  serviceData.locationPrice = override.priceMoney;
                }
              });
            }
            
            // Include item-level tax information if available
            if (item.itemData.taxIds && item.itemData.taxIds.length > 0) {
              serviceData.taxIds = item.itemData.taxIds;
              
              // Fetch actual tax objects for this service
              try {
                const taxObjects = await fetchTaxObjects(item.itemData.taxIds);
                serviceData.taxes = taxObjects;
                console.log(`DEBUG: Fetched tax data for service ${sid}:`, taxObjects);
              } catch (taxError) {
                console.warn(`Failed to fetch tax data for service ${sid}:`, taxError.message);
                serviceData.taxes = {};
              }
            } else {
              serviceData.taxes = {};
            }
            
            // Include pricing type information
            if (variation.itemVariationData.pricingType) {
              serviceData.pricingType = variation.itemVariationData.pricingType;
            }
            
            serviceDetails.push(serviceData);
          } else {
            console.warn(`No item found for service variation ${sid}`);
          }
        } catch (serviceError) {
          console.error(`Error fetching service details for ${sid}:`, serviceError);
          // Add fallback service data
          serviceDetails.push({
            id: sid,
            name: 'Selected Service',
            duration: 3600000, // 1 hour default
            price: { amount: 5000, currency: 'USD' }, // $50 default
            quantity: quantities[sid] ? parseInt(quantities[sid], 10) : 1,
            taxes: {} // No tax data for fallback
          });
        }
      }
    }
    
    console.log('Built serviceDetails:', serviceDetails.length, 'services');
    
    // Convert BigInt values to regular numbers to prevent EJS template errors
    const safeServiceDetails = convertBigIntToNumber(serviceDetails);
    
    console.log('DEBUG: Safe serviceDetails after BigInt conversion:', 
      JSON.stringify(safeServiceDetails, null, 2));
    
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
    
    // Fetch actual team member data
    let teamMemberBookingProfile = null;
    try {
      if (staffId && staffId !== 'anyStaffMember') {
        console.log('Fetching team member profile for staffId:', staffId);
        const { result } = await bookingsApi.retrieveTeamMemberBookingProfile(staffId);
        teamMemberBookingProfile = result.teamMemberBookingProfile;
        console.log('Retrieved team member profile:', teamMemberBookingProfile.displayName);
      } else {
        // Handle "any staff member" case
        teamMemberBookingProfile = {
          displayName: 'Any Available Staff',
          givenName: 'Any Available',
          familyName: 'Staff',
          teamMemberId: 'anyStaffMember'
        };
      }
    } catch (staffError) {
      console.error('Error fetching team member profile:', staffError);
      // Create fallback team member data
      teamMemberBookingProfile = {
        displayName: 'Selected Staff Member',
        givenName: 'Staff',
        familyName: 'Member',
        teamMemberId: staffId
      };
    }
    
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
      serviceDetails: safeServiceDetails,
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