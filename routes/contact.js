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
  const serviceId = req.query.serviceId;
  const serviceVersion = req.query.version;
  const staffId = req.query.staff;
  const startAt = req.query.startAt;
  
  // Validate required parameters
  if (!staffId || !serviceId || !startAt) {
    console.warn('Missing required parameters for contact page:', { 
      serviceId: !!serviceId, 
      staffId: !!staffId, 
      startAt: !!startAt 
    });
    return res.redirect('/services?error=missing_params');
  }
  
  // Ensure session exists
  if (!req.session) {
    req.session = {};
  }
  
  // Retrieve multi-service selection from session if available
  const selectedServices = req.session.selectedServices || [serviceId];
  const quantities = req.session.quantities || {};
  
  // Handle error messages from redirects
  const errorMessage = req.query.error;
  let error = null;
  if (errorMessage === 'invalid_email') {
    error = 'The provided email address is invalid. Please enter a valid email address.';
  }
  
  try {
    // Build serviceDetails for all selected services
    const serviceDetails = [];
    for (const sid of selectedServices) {
      try {
        const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
        const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
        
        if (!item) {
          console.warn(`No item found for service variation ${sid}`);
          serviceDetails.push({
            id: sid,
            name: '[Service unavailable]',
            duration: 0,
            quantity: quantities[sid] || 1
          });
          continue;
        }
        
        serviceDetails.push({
          id: sid,
          name: item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : ""),
          duration: variation.itemVariationData.serviceDuration,
          quantity: quantities[sid] || 1
        });
      } catch (serviceError) {
        console.error(`Error fetching service ${sid}:`, serviceError);
        serviceDetails.push({
          id: sid,
          name: '[Service unavailable]',
          duration: 0,
          quantity: quantities[sid] || 1
        });
      }
    }
    
    // Send request to get the service associated with the given item variation ID, and related objects.
    const retrieveServicePromise = catalogApi.retrieveCatalogObject(serviceId, true);
    // Send request to get the team member profile of the staff selected
    const retrieveTeamMemberPromise = bookingsApi.retrieveTeamMemberBookingProfile(staffId);
    
    const [ { result: { object : serviceVariation, relatedObjects } }, { result: { teamMemberBookingProfile } } ] = 
      await Promise.all([ retrieveServicePromise, retrieveTeamMemberPromise ]);
    
    const serviceItem = relatedObjects.filter(relatedObject => relatedObject.type === "ITEM")[0];
    
    if (!serviceItem) {
      console.error('No service item found for serviceId:', serviceId);
      return res.redirect('/services?error=service_not_found');
    }
    
    // Store team member info in session for later use
    req.session.teamMemberBookingProfile = teamMemberBookingProfile;
    req.session.serviceVariation = serviceVariation;
    
    res.render("pages/contact", { 
      serviceItem, 
      serviceVariation, 
      serviceVersion, 
      startAt, 
      teamMemberBookingProfile, 
      selectedServices, 
      quantities, 
      serviceDetails,
      error // Pass any error messages to the template
    });
  } catch (error) {
    console.error('Error in contact route:', error);
    
    // If it's a specific API error, handle gracefully
    if (error.errors) {
      const apiError = error.errors[0];
      if (apiError.code === 'NOT_FOUND') {
        return res.redirect('/services?error=service_not_found');
      }
    }
    
    next(error);
  }
});

module.exports = router;