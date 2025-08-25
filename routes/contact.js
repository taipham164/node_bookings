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

const { bookingsApi, catalogApi, teamMembersApi } = require("../util/square-client");
const { getCancellationPolicy, getPolicyTerms } = require("../util/cancellation-policy");
const { getBookingConfiguration } = require("../util/booking-policy");
const { safeNumberConversion } = require("../util/bigint-helpers");

/**
 * Convert BigInt values to regular numbers
 */
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return safeNumberConversion(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
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
 */
router.get("/", async (req, res) => {
  const { serviceId, version: serviceVersion = "", staff: staffId, startAt, back } = req.query;
  const isBackNavigation = back === 'true';
  
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
  }
  
  if (!staffId || !serviceId || !startAt) {
    return res.redirect('/services?error=missing_params');
  }
  
  if (!req.session) req.session = {};
  
  const selectedServices = req.session.selectedServices || [serviceId];
  const quantities = req.session.quantities || {};
  
  const errorMessages = {
    'invalid_email': 'The provided email address is invalid. Please enter a valid email address.'
  };
  const error = errorMessages[req.query.error] || null;

  try {
    // Get cancellation policy
    let cancellationPolicy = null;
    let policyTerms = null;
    try {
      cancellationPolicy = await getCancellationPolicy();
      policyTerms = getPolicyTerms(cancellationPolicy);
    } catch (policyError) {
      // Use defaults
    }
    
    // Build service details
    const serviceDetails = [];
    if (selectedServices?.length > 0) {
      const uniqueServices = [...new Set(selectedServices)];
      const isExpanded = selectedServices.length > uniqueServices.length;
      
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
            const serviceName = item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : "");
            const duration = variation.itemVariationData.serviceDuration;
            const price = variation.itemVariationData.priceMoney;
            const quantity = isExpanded ? serviceCountMap[sid] : (quantities[sid] ? parseInt(quantities[sid], 10) : 1);
            
            serviceDetails.push({
              id: sid,
              name: serviceName,
              duration,
              price,
              quantity
            });
          }
        } catch (serviceError) {
          serviceDetails.push({
            id: sid,
            name: 'Selected Service',
            duration: 3600000,
            price: { amount: 5000, currency: 'USD' },
            quantity: quantities[sid] ? parseInt(quantities[sid], 10) : 1
          });
        }
      }
    }
    
    const safeServiceDetails = convertBigIntToNumber(serviceDetails);
    
    // Create fallback service data
    const serviceItem = {
      id: serviceId,
      itemData: {
        name: 'Selected Service',
        description: 'Service booking'
      }
    };
    
    const serviceVariation = {
      id: serviceId,
      itemVariationData: {
        name: '',
        serviceDuration: 3600000,
        pricingType: 'FIXED_PRICING'
      }
    };
    
    // Get team member data
    let teamMemberBookingProfile = null;
    try {
      if (staffId && staffId !== 'anyStaffMember') {
        const { result } = await bookingsApi.retrieveTeamMemberBookingProfile(staffId);
        teamMemberBookingProfile = result.teamMemberBookingProfile;
        
        try {
          const { result: teamMemberResult } = await teamMembersApi.retrieveTeamMember(staffId);
          if (teamMemberResult.teamMember?.profileImageUrl) {
            teamMemberBookingProfile.profileImageUrl = teamMemberResult.teamMember.profileImageUrl;
          }
          teamMemberBookingProfile.emailAddress = teamMemberResult.teamMember.emailAddress;
          teamMemberBookingProfile.phoneNumber = teamMemberResult.teamMember.phoneNumber;
          teamMemberBookingProfile.status = teamMemberResult.teamMember.status;
        } catch (teamMemberError) {
          // Continue without additional details
        }
      } else {
        teamMemberBookingProfile = {
          displayName: 'Any Available Staff',
          givenName: 'Any Available',
          familyName: 'Staff',
          teamMemberId: 'anyStaffMember'
        };
      }
    } catch (staffError) {
      teamMemberBookingProfile = {
        displayName: 'Selected Staff Member',
        givenName: 'Staff',
        familyName: 'Member',
        teamMemberId: staffId
      };
    }
    
    // Store in session
    req.session.teamMemberBookingProfile = teamMemberBookingProfile;
    req.session.serviceVariation = serviceVariation;
    req.session.serviceId = serviceId;
    req.session.staffId = staffId;
    req.session.startAt = startAt;
    req.session.serviceVersion = serviceVersion;
    
    // Get booking configuration
    let bookingConfig = null;
    try {
      bookingConfig = await getBookingConfiguration();
    } catch (configError) {
      bookingConfig = {
        booking: { requiresApproval: false },
        flow: { 
          requiresApproval: false,
          confirmationMessage: 'Your booking has been confirmed!',
          nextSteps: ['Prepare for your appointment', 'Add to your calendar']
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
      error,
      preservedSession,
      isBackNavigation,
      cancellationPolicy,
      policyTerms,
      bookingConfig,
      requiresApproval: bookingConfig.booking.requiresApproval,
      bookingFlow: bookingConfig.flow
    });
    
  } catch (error) {
    console.error('Error in contact route:', error);
    
    // Emergency fallback
    const fallbackServiceItem = {
      id: serviceId,
      itemData: { name: 'Selected Service', description: 'Service booking' }
    };
    
    const fallbackServiceVariation = {
      id: serviceId,
      itemVariationData: { name: '', serviceDuration: 3600000, pricingType: 'FIXED_PRICING' }
    };
    
    const fallbackTeamMember = {
      displayName: 'Selected Staff Member',
      givenName: 'Staff',
      familyName: 'Member',
      teamMemberId: staffId
    };
    
    res.render("pages/contact", { 
      serviceItem: fallbackServiceItem, 
      serviceVariation: fallbackServiceVariation, 
      serviceVersion, 
      startAt, 
      teamMemberBookingProfile: fallbackTeamMember, 
      selectedServices: [serviceId], 
      quantities: {}, 
      serviceDetails: [],
      error: 'Service details temporarily unavailable.',
      preservedSession,
      isBackNavigation,
      cancellationPolicy: null,
      policyTerms: null
    });
  }
});

module.exports = router;