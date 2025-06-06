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

const {
  customersApi,
  bookingsApi,
  catalogApi,
} = require("../util/square-client");

/**
 * Normalize phone number to E.164 format for consistency
 * @param {string} phone - Raw phone number input
 * @returns {string} - Normalized phone number
 */
function normalizePhoneNumber(phone) {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Add country code if missing (assuming US)
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Return as-is if already formatted or international
  return `+${digits}`;
}

/**
 * GET /auth/login
 * Display Firebase phone login form
 */
router.get("/login", (req, res) => {
  const error = req.query.error;
  let errorMessage = null;
  
  if (error === 'invalid_phone') {
    errorMessage = 'Please enter a valid phone number.';
  } else if (error === 'no_customer') {
    errorMessage = 'No account found with this phone number. Please check your number or create a new booking.';
  } else if (error === 'verification_failed') {
    errorMessage = 'Phone verification failed. Please try again.';
  } else if (error === 'too_many_requests') {
    errorMessage = 'Too many verification attempts. Please try again later.';
  }
  
  // Pass Firebase config to template
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
  
  res.render("pages/firebase-phone-login", { 
    error: errorMessage,
    firebaseConfig: JSON.stringify(firebaseConfig),
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || ''
  });
});

/**
 * POST /auth/verify-firebase-token
 * Verify Firebase ID token and log in user
 */
router.post("/verify-firebase-token", async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    
    console.log('verify-firebase-token called with phoneNumber:', phoneNumber);
    
    if (!phoneNumber) {
      console.error('No phone number provided');
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    console.log('Normalized phone number:', normalizedPhone);
    
    // Validate phone number format
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      console.error('Invalid phone number format:', normalizedPhone);
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    // Check if Square client is available
    if (!customersApi) {
      console.error('Square Customers API not available');
      return res.status(500).json({ error: 'Square API not configured' });
    }
    
    console.log('Searching for customer in Square with phone:', normalizedPhone);
    
    // Search for customer by phone number in Square
    const { result: { customers } } = await customersApi.searchCustomers({
      query: {
        filter: {
          phoneNumber: {
            exact: normalizedPhone
          }
        }
      }
    });
    
    console.log('Customer search result:', customers ? customers.length : 0, 'customers found');
    
    if (!customers || customers.length === 0) {
      console.error('No customer found with phone number:', normalizedPhone);
      return res.status(404).json({ error: 'No customer found with this phone number' });
    }
    
    // Customer found - create session
    const customer = customers[0];
    console.log('Customer found:', customer.id, customer.givenName, customer.familyName);
    
    if (!req.session) req.session = {};
    req.session.authenticatedCustomer = {
      id: customer.id,
      givenName: customer.givenName,
      familyName: customer.familyName,
      emailAddress: customer.emailAddress,
      phoneNumber: customer.phoneNumber,
      loginTime: Date.now(),
      firebaseVerified: true
    };
    
    console.log('Session created successfully for customer:', customer.id);
    res.json({ success: true, redirectUrl: '/auth/appointments' });
    
  } catch (error) {
    console.error('Error in verify-firebase-token:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

/**
 * GET /auth/appointments
 * Display customer's past and upcoming appointments
 */
router.get("/appointments", async (req, res, next) => {
  console.log('=== /auth/appointments route called ===');
  
  try {
    console.log('Step 1: Checking authentication...');
    
    // Check if user is authenticated
    if (!req.session?.authenticatedCustomer) {
      console.log('No authenticated customer found, redirecting to login');
      return res.redirect('/auth/login');
    }
    
    const customer = req.session.authenticatedCustomer;
    const customerId = customer.id;
    
    console.log('Step 2: Loading appointments for customer:', customerId);
    console.log('Customer details:', {
      id: customer.id,
      givenName: customer.givenName,
      familyName: customer.familyName,
      phoneNumber: customer.phoneNumber
    });
    
    // Check if location ID is configured
    console.log('Step 3: Checking location configuration...');
    console.log('SQ_LOCATION_ID:', process.env.SQ_LOCATION_ID);
    
    if (!process.env.SQ_LOCATION_ID) {
      console.error('SQ_LOCATION_ID not configured');
      return res.render("pages/customer-appointment", {
        customer,
        upcomingAppointments: [],
        pastAppointments: [],
        hasAppointments: false,
        error: 'Location not configured. Please contact administrator.'
      });
    }
    
    // Check if bookingsApi is available
    console.log('Step 4: Checking bookings API availability...');
    if (!bookingsApi) {
      console.error('Bookings API not available');
      return res.render("pages/customer-appointment", {
        customer,
        upcomingAppointments: [],
        pastAppointments: [],
        hasAppointments: false,
        error: 'Booking system not configured. Please contact administrator.'
      });
    }      console.log('Step 5: Searching for bookings...');
    
    // List all bookings for this customer
    // Parameters: limit, cursor, customerId, teamMemberId, locationId, startAtMin, startAtMax
    const { result: { bookings } } = await bookingsApi.listBookings(
      100, // limit - maximum number of bookings to return
      undefined, // cursor - for pagination
      customerId, // customerId - filter by customer
      undefined, // teamMemberId - not filtering by team member
      process.env.SQ_LOCATION_ID, // locationId - filter by location
      undefined, // startAtMin - not filtering by start time
      undefined  // startAtMax - not filtering by start time
    );
    
    console.log(`Step 6: Found ${bookings ? bookings.length : 0} bookings for customer ${customerId}`);
      if (!bookings || bookings.length === 0) {
      return res.render("pages/customer-appointment", {
        customer,
        upcomingAppointments: [],
        pastAppointments: [],
        hasAppointments: false
      });
    }
    
    // Separate upcoming and past appointments
    const now = new Date();
    const upcomingBookings = [];
    const pastBookings = [];
    
    bookings.forEach(booking => {
      const appointmentDate = new Date(booking.startAt);
      if (appointmentDate > now && booking.status !== 'CANCELLED') {
        upcomingBookings.push(booking);
      } else {
        pastBookings.push(booking);
      }
    });
    
    // Sort appointments
    upcomingBookings.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    pastBookings.sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
    
    // Get service and staff details for each appointment
    const processBookings = async (bookings) => {
      const processedBookings = [];
      
      for (const booking of bookings) {
        try {
          // Get unique service variation IDs and team member IDs
          const serviceVariationIds = [...new Set(booking.appointmentSegments.map(seg => seg.serviceVariationId))];
          const teamMemberIds = [...new Set(booking.appointmentSegments.map(seg => seg.teamMemberId))];
          
          // Fetch service details
          const servicePromises = serviceVariationIds.map(async (sid) => {
            try {
              const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(sid, true);
              const item = relatedObjects.find(obj => obj.type === "ITEM");
              return {
                id: sid,
                name: item ? item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : "") : '[Unknown Service]',
                duration: variation.itemVariationData.serviceDuration
              };
            } catch (e) {
              return { id: sid, name: '[Unknown Service]', duration: 0 };
            }
          });
          
          // Fetch team member details
          const teamMemberPromises = teamMemberIds.map(async (tid) => {
            try {
              const { result: { teamMemberBookingProfile } } = await bookingsApi.retrieveTeamMemberBookingProfile(tid);
              return teamMemberBookingProfile;
            } catch (e) {
              return { teamMemberId: tid, displayName: '[Unknown Staff]' };
            }
          });
          
          const [serviceDetails, teamMemberProfiles] = await Promise.all([
            Promise.all(servicePromises),
            Promise.all(teamMemberPromises)
          ]);
          
          // Calculate total duration
          const totalDuration = booking.appointmentSegments.reduce((total, segment) => {
            const service = serviceDetails.find(s => s.id === segment.serviceVariationId);
            return total + (service ? Number(service.duration) : 0);
          }, 0);
          
          processedBookings.push({
            ...booking,
            serviceDetails,
            teamMemberProfiles,
            totalDuration,
            formattedStartTime: new Date(booking.startAt).toLocaleString(),
            formattedDate: new Date(booking.startAt).toLocaleDateString(),
            formattedTime: new Date(booking.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        } catch (error) {
          console.error(`Error processing booking ${booking.id}:`, error);
          // Include booking with minimal info if processing fails
          processedBookings.push({
            ...booking,
            serviceDetails: [{ name: '[Service details unavailable]', duration: 0 }],
            teamMemberProfiles: [{ displayName: '[Staff details unavailable]' }],
            totalDuration: 0,
            formattedStartTime: new Date(booking.startAt).toLocaleString(),
            formattedDate: new Date(booking.startAt).toLocaleDateString(),
            formattedTime: new Date(booking.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      }
      
      return processedBookings;
    };
    
    const [upcomingAppointments, pastAppointments] = await Promise.all([
      processBookings(upcomingBookings),
      processBookings(pastBookings)
    ]);
      res.render("pages/customer-appointment", {
      customer,
      upcomingAppointments,
      pastAppointments,
      hasAppointments: upcomingAppointments.length > 0 || pastAppointments.length > 0
    });
    
  } catch (error) {
    console.error('Error fetching appointments:', error);
    next(error);
  }
});

/**
 * POST /auth/logout
 * Log out the authenticated customer
 */
router.post("/logout", (req, res) => {
  if (req.session) {
    delete req.session.authenticatedCustomer;
  }
  res.redirect('/services');
});

/**
 * GET /auth/check-customer
 * Check if customer exists with phone number (for Firebase frontend)
 */
router.get("/check-customer/:phoneNumber", async (req, res) => {
  try {
    const phoneNumber = normalizePhoneNumber(req.params.phoneNumber);
    
    // Search for customer by phone number
    const { result: { customers } } = await customersApi.searchCustomers({
      query: {
        filter: {
          phoneNumber: {
            exact: phoneNumber
          }
        }
      }
    });
    
    if (!customers || customers.length === 0) {
      return res.json({ exists: false });
    }
    
    res.json({ 
      exists: true, 
      customer: {
        givenName: customers[0].givenName,
        familyName: customers[0].familyName
      }
    });
    
  } catch (error) {
    console.error('Error checking customer:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add to your auth.js for custom tracking
const analytics = {
  loginAttempt: (phoneNumber) => {
    console.log('Login attempt:', phoneNumber);
    // Add to your analytics service
  },
  loginSuccess: (customerId) => {
    console.log('Login success:', customerId);
    // Track successful logins
  },
  loginFailure: (error, phoneNumber) => {
    console.log('Login failure:', error, phoneNumber);
    // Track failures for debugging
  }
};

module.exports = router;