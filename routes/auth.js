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
  teamMembersApi,
} = require("../util/square-client");

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone) {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return `+${digits}`;
}

/**
 * GET /auth/login
 */
router.get("/login", (req, res) => {
  // Check existing valid session
  if (req.session?.authenticatedCustomer) {
    const customer = req.session.authenticatedCustomer;
    if (!customer.sessionExpires || Date.now() < customer.sessionExpires) {
      return res.redirect('/auth/appointments');
    } else {
      delete req.session.authenticatedCustomer;
    }
  }
  
  const error = req.query.error;
  const errorMessages = {
    'invalid_phone': 'Please enter a valid phone number.',
    'no_customer': 'No account found with this phone number.',
    'verification_failed': 'Phone verification failed. Please try again.',
    'too_many_requests': 'Too many attempts. Please try again later.',
    'session_expired': 'Your session has expired. Please log in again.'
  };
  
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
  
  res.render("pages/firebase-phone-login", { 
    error: errorMessages[error] || null,
    firebaseConfig: JSON.stringify(firebaseConfig),
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || ''
  });
});

/**
 * POST /auth/verify-firebase-token
 */
router.post("/verify-firebase-token", async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    if (!customersApi) {
      return res.status(500).json({ error: 'Square API not configured' });
    }
    
    const { result: { customers } } = await customersApi.searchCustomers({
      query: {
        filter: {
          phoneNumber: {
            exact: normalizedPhone
          }
        }
      }
    });
    
    if (!customers || customers.length === 0) {
      return res.status(404).json({ error: 'No customer found with this phone number' });
    }
    
    const customer = customers[0];
    
    req.session.authenticatedCustomer = {
      id: customer.id,
      givenName: customer.givenName,
      familyName: customer.familyName,
      emailAddress: customer.emailAddress,
      phoneNumber: customer.phoneNumber,
      loginTime: Date.now(),
      lastActivity: Date.now(),
      firebaseVerified: true,
      sessionExpires: Date.now() + (24 * 60 * 60 * 1000)
    };
    
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
    
    res.json({ success: true, redirectUrl: '/auth/appointments' });
    
  } catch (error) {
    console.error('Error in verify-firebase-token:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

/**
 * GET /auth/appointments
 */
router.get("/appointments", async (req, res) => {
  try {
    if (!req.session?.authenticatedCustomer) {
      return res.redirect('/auth/login');
    }
    
    const customer = req.session.authenticatedCustomer;
    
    if (customer.sessionExpires && Date.now() > customer.sessionExpires) {
      delete req.session.authenticatedCustomer;
      return res.redirect('/auth/login?error=session_expired');
    }
    
    customer.lastActivity = Date.now();
    req.session.authenticatedCustomer = customer;
    
    if (!bookingsApi) {
      return res.render("pages/customer-appointment", {
        customer,
        upcomingAppointments: [],
        pastAppointments: [],
        hasAppointments: false,
        error: 'Booking system not available.'
      });
    }
    
    const { result } = await bookingsApi.listBookings(100, undefined, customer.id);
    const bookings = result.bookings || [];
    
    if (bookings.length === 0) {
      return res.render("pages/customer-appointment", {
        customer,
        upcomingAppointments: [],
        pastAppointments: [],
        hasAppointments: false
      });
    }

    const processedBookings = [];
    const now = new Date();
    
    for (const booking of bookings) {
      try {
        let startAt;
        if (booking.startAt) {
          startAt = new Date(booking.startAt);
        } else if (booking.appointmentSegments?.[0]?.startAt) {
          startAt = new Date(booking.appointmentSegments[0].startAt);
        } else {
          continue;
        }
        
        const processedBooking = {
          id: booking.id,
          startAt: startAt,
          formattedDate: startAt.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          }),
          formattedTime: startAt.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true
          }),
          status: booking.status || 'PENDING',
          serviceDetails: [],
          teamMemberProfiles: [],
          totalDuration: 0,
          totalPrice: 0,
          isPast: startAt < now
        };
        
        if (booking.appointmentSegments) {
          let totalDuration = 0;
          let totalPrice = 0;
          
          for (const segment of booking.appointmentSegments) {
            if (segment.bookingStatus) {
              processedBooking.status = segment.bookingStatus;
            }
            
            // Fetch service details
            if (segment.serviceVariation) {
              try {
                const { result: { object: variation, relatedObjects } } = await catalogApi.retrieveCatalogObject(segment.serviceVariation, true);
                const item = relatedObjects.filter(obj => obj.type === "ITEM")[0];
                
                if (item) {
                  const serviceName = item.itemData.name + (variation.itemVariationData.name ? (" - " + variation.itemVariationData.name) : "");
                  const serviceDuration = variation.itemVariationData.serviceDuration || 3600000;
                  const servicePrice = variation.itemVariationData.priceMoney || { amount: 0, currency: 'USD' };
                  
                  processedBooking.serviceDetails.push({
                    id: variation.id,
                    name: serviceName,
                    duration: serviceDuration,
                    price: servicePrice
                  });
                  
                  totalDuration += serviceDuration;
                  totalPrice += Number(servicePrice.amount) || 0;
                }
              } catch (serviceError) {
                processedBooking.serviceDetails.push({
                  name: 'Service (unavailable)',
                  duration: 3600000,
                  price: { amount: 0, currency: 'USD' }
                });
                totalDuration += 3600000;
              }
            }
            
            // Fetch team member details
            if (segment.teamMemberId && !processedBooking.teamMemberProfiles.find(tm => tm.teamMemberId === segment.teamMemberId)) {
              try {
                const { result: teamResult } = await bookingsApi.retrieveTeamMemberBookingProfile(segment.teamMemberId);
                
                if (teamResult.teamMemberBookingProfile) {
                  const teamMember = {
                    teamMemberId: segment.teamMemberId,
                    displayName: teamResult.teamMemberBookingProfile.displayName || 'Staff Member'
                  };
                  
                  if (teamMembersApi) {
                    try {
                      const { result: memberResult } = await teamMembersApi.retrieveTeamMember(segment.teamMemberId);
                      if (memberResult.teamMember?.profileImageUrl) {
                        teamMember.profileImageUrl = memberResult.teamMember.profileImageUrl;
                      }
                      teamMember.emailAddress = memberResult.teamMember.emailAddress;
                    } catch (avatarError) {
                      // Continue without avatar
                    }
                  }
                  
                  processedBooking.teamMemberProfiles.push(teamMember);
                }
              } catch (teamError) {
                processedBooking.teamMemberProfiles.push({
                  displayName: 'Staff Member (unavailable)',
                  teamMemberId: segment.teamMemberId
                });
              }
            }
          }
          
          processedBooking.totalDuration = totalDuration || 3600000;
          processedBooking.totalPrice = totalPrice;
        }
        
        // Add fallbacks if empty
        if (processedBooking.serviceDetails.length === 0) {
          processedBooking.serviceDetails.push({
            name: 'Service',
            duration: 3600000,
            price: { amount: 0, currency: 'USD' }
          });
          processedBooking.totalDuration = 3600000;
        }
        
        if (processedBooking.teamMemberProfiles.length === 0) {
          processedBooking.teamMemberProfiles.push({ displayName: 'Staff Member' });
        }
        
        processedBookings.push(processedBooking);
        
      } catch (bookingError) {
        continue;
      }
    }
    
    const upcomingAppointments = processedBookings
      .filter(apt => !apt.isPast)
      .sort((a, b) => a.startAt - b.startAt);
    
    return res.render("pages/customer-appointment", {
      customer,
      upcomingAppointments,
      pastAppointments: [],
      hasAppointments: upcomingAppointments.length > 0
    });
    
  } catch (error) {
    console.error('Route error:', error);
    res.render("pages/customer-appointment", {
      customer: req.session?.authenticatedCustomer || { givenName: 'Guest', familyName: '', emailAddress: '', phoneNumber: '' },
      upcomingAppointments: [],
      pastAppointments: [],
      hasAppointments: false,
      error: `Error: ${error.message}`
    });
  }
});

/**
 * POST /auth/logout
 */
router.post("/logout", (req, res) => {
  if (req.session) {
    delete req.session.authenticatedCustomer;
  }
  res.redirect('/services');
});

/**
 * POST /auth/ping
 */
router.post("/ping", (req, res) => {
  if (req.session?.authenticatedCustomer) {
    const customer = req.session.authenticatedCustomer;
    
    if (!customer.sessionExpires || Date.now() < customer.sessionExpires) {
      customer.lastActivity = Date.now();
      req.session.authenticatedCustomer = customer;
      res.json({ success: true, sessionValid: true });
    } else {
      delete req.session.authenticatedCustomer;
      res.json({ success: false, sessionValid: false });
    }
  } else {
    res.json({ success: false, sessionValid: false });
  }
});

module.exports = router;