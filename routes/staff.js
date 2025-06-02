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
  const selectedServices = req.session && req.session.selectedServices ? req.session.selectedServices : [req.params.serviceId];
  const quantities = req.session && req.session.quantities ? req.session.quantities : {};
  const serviceVersion = req.query.version;
  
  // Get total price and duration from the session
  const totalPrice = req.session && req.session.totalPrice ? req.session.totalPrice : 0;
  const totalDuration = req.session && req.session.totalDuration ? req.session.totalDuration : 0;
  const serviceSessionDetails = req.session && req.session.serviceDetails ? req.session.serviceDetails : {};
  
  try {
    // Fetch all selected service variations for display
    const serviceDetails = [];
    for (const sid of selectedServices) {
      const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
      const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
      
      // Get price from session details or from the fetched variation
      let price = null;
      if (serviceSessionDetails[sid] && serviceSessionDetails[sid].price) {
        price = serviceSessionDetails[sid].price;
      } else if (variation.itemVariationData.priceMoney) {
        price = {
          amount: variation.itemVariationData.priceMoney.amount,
          currency: variation.itemVariationData.priceMoney.currency
        };
      }
      
      serviceDetails.push({
        id: sid,
        name: item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : ""),
        duration: variation.itemVariationData.serviceDuration,
        quantity: quantities[sid] ? parseInt(quantities[sid], 10) : 1,
        price: price
      });
    }

    // Add missing definition for retrieveServicePromise
    const retrieveServicePromise = catalogApi.retrieveCatalogObject(req.params.serviceId, true);

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
    const [ { result: services }, { result: { teamMemberBookingProfiles } }, { result: { teamMembers } } ] =
      await Promise.all([ retrieveServicePromise, listBookingProfilesPromise, listActiveTeamMembersPromise ]);

    // We want to filter teamMemberBookingProfiles by checking that the teamMemberId associated with the profile is in our serviceTeamMembers.
    // We also want to verify that each team member is ACTIVE.
    const serviceVariation = services.object;
    const serviceItem = services.relatedObjects.filter(relatedObject => relatedObject.type === "ITEM")[0];

    const serviceTeamMembers = serviceVariation.itemVariationData.teamMemberIds || [];
    const activeTeamMembers = teamMembers.map(teamMember => teamMember.id);

    const bookableStaff = teamMemberBookingProfiles
      .filter(profile => serviceTeamMembers.includes(profile.teamMemberId) && activeTeamMembers.includes(profile.teamMemberId));

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
      totalDuration
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
  try {
    // Get the selected staff member ID from the form
    const selectedStaffId = req.body.staffId;
    
    // Validate that a staff member was selected
    if (!selectedStaffId) {
      return res.status(400).send("Please select a staff member to continue.");
    }
    
    // Store the selected staff in the session
    if (!req.session) req.session = {};
    req.session.selectedStaffId = selectedStaffId;
    
    // Get staff profile details to store in session
    const { result: { teamMemberBookingProfile } } = await bookingsApi.retrieveTeamMemberBookingProfile(selectedStaffId);
    
    // Store the staff profile info in the session
    req.session.staffProfile = {
      id: teamMemberBookingProfile.teamMemberId,
      displayName: teamMemberBookingProfile.displayName,
      description: teamMemberBookingProfile.description || "",
      profileImageUrl: teamMemberBookingProfile.profileImageUrl || ""
    };
    
    // Debug: Log the selected staff info
    console.log('DEBUG: /staff/select session.selectedStaffId', req.session.selectedStaffId);
    console.log('DEBUG: /staff/select session.staffProfile', req.session.staffProfile);
    
    // Get services from session to pass to availability page
    const selectedServices = req.session.selectedServices || [];
    const firstServiceId = selectedServices[0] || null;
    
    // Redirect to the availability (date/time selection) page
    res.redirect(`/availability/${firstServiceId}?staff=${selectedStaffId}`);
  } catch (error) {
    console.error("Error in staff selection:", error);
    next(error);
  }
});

module.exports = router;
