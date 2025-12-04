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

const { asyncHandler, ValidationError, AuthenticationError } = require("../middleware/errorHandler");
const { logger } = require("../util/logger");
const { validatePhoneNumber, validateEmail } = require("../util/validators");
const {
  customersApi,
  bookingsApi,
  catalogApi,
  teamMembersApi,
} = require("../util/square-client");

// Import card management utility
const {
  createCardOnFile,
  listCustomerCards,
  getCard,
  disableCard,
  getCustomerWithCards
} = require("../util/card-management");

// Import BigInt helper (same as contact.js)
const { safeNumberConversion } = require("../util/bigint-helpers");

/**
 * Convert BigInt values to regular numbers (same as contact.js)
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
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
    location: {
      businessName: process.env.SQ_APPLICATION_NAME || 'Booking System',
      logoUrl: null
    }
  });
});

/**
 * POST /auth/verify-firebase-token
 */
router.post("/verify-firebase-token", asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    throw new ValidationError('Phone number is required');
  }
  
  if (!validatePhoneNumber(phoneNumber)) {
    throw new ValidationError('Invalid phone number format');
  }
  
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  logger.info('Firebase token verification attempted', { phoneNumber: normalizedPhone });
  
  if (!customersApi) {
    throw new Error('Square API not configured');
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
    logger.warn('Customer not found for phone verification', { phoneNumber: normalizedPhone });
    throw new AuthenticationError('No customer found with this phone number');
  }
  
  const customer = customers[0];
  
  // Convert customer data to safe format (no BigInt values)
  const safeCustomerData = convertBigIntToNumber({
    id: customer.id,
    givenName: customer.givenName,
    familyName: customer.familyName,
    emailAddress: customer.emailAddress,
    phoneNumber: customer.phoneNumber,
    version: customer.version
  });
  
  req.session.authenticatedCustomer = {
    ...safeCustomerData,
    loginTime: Date.now(),
    lastActivity: Date.now(),
    firebaseVerified: true,
    sessionExpires: Date.now() + (24 * 60 * 60 * 1000)
  };
  
  req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
  
  logger.info('Customer authentication successful', { customerId: customer.id });
  res.json({ success: true, redirectUrl: '/auth/appointments' });
}));

/**
 * GET /auth/appointments
 */
router.get("/appointments", asyncHandler(async (req, res) => {
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
        error: 'Booking system not available.',
        location: {
          businessName: process.env.SQ_APPLICATION_NAME || 'Booking System',
          logoUrl: null
        }
      });
    }
    
    try {
      const { result } = await bookingsApi.listBookings(100, undefined, customer.id);
      const bookings = result.bookings || [];
      
      if (bookings.length === 0) {
        return res.render("pages/customer-appointment", {
          customer,
          upcomingAppointments: [],
          pastAppointments: [],
          hasAppointments: false,
          location: {
            businessName: process.env.SQ_APPLICATION_NAME || 'Booking System',
            logoUrl: null
          }
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
                  } else {
                    throw new Error('Team member data incomplete');
                  }
                } catch (teamError) {
                  logger.warn('Team member fetch failed, using fallback', { 
                    teamMemberId: segment.teamMemberId, 
                    error: teamError.message 
                  });
                  // Add fallback team member
                  processedBooking.teamMemberProfiles.push({
                    displayName: 'Staff Member',
                    teamMemberId: segment.teamMemberId
                  });
                }
              } else {
                // No team member ID, add generic staff
                processedBooking.teamMemberProfiles.push({
                  displayName: 'Staff Member'
                });
              }
            }
            
            processedBooking.totalDuration = totalDuration || 3600000;
            processedBooking.totalPrice = totalPrice;
          } else {
            // No appointment segments, add fallback data
            processedBooking.serviceDetails.push({
              name: 'Scheduled Service',
              duration: 3600000,
              price: { amount: 0, currency: 'USD' }
            });
            processedBooking.teamMemberProfiles.push({
              displayName: 'Staff Member'
            });
            processedBooking.totalDuration = 3600000;
            processedBooking.totalPrice = 0;
          }
          
          processedBookings.push(processedBooking);
          
        } catch (bookingError) {
          logger.warn('Error processing individual booking', { 
            bookingId: booking.id, 
            error: bookingError.message 
          });
          continue;
        }
      }
      
      const upcomingAppointments = processedBookings
        .filter(apt => !apt.isPast)
        .sort((a, b) => a.startAt - b.startAt);
      
      logger.info('Processed customer appointments', { 
        customerId: customer.id,
        totalBookings: processedBookings.length, 
        upcomingAppointments: upcomingAppointments.length 
      });
      
      return res.render("pages/customer-appointment", {
        customer,
        upcomingAppointments,
        pastAppointments: [],
        hasAppointments: upcomingAppointments.length > 0,
        location: {
          businessName: process.env.SQ_APPLICATION_NAME || 'Booking System',
          logoUrl: null
        }
      });
      
    } catch (apiError) {
      logger.error('Bookings API error', { error: apiError.message, customerId: customer.id });
      return res.render("pages/customer-appointment", {
        customer,
        upcomingAppointments: [],
        pastAppointments: [],
        hasAppointments: false,
        error: `API Error: ${apiError.message}. Please try again later.`,
        location: {
          businessName: process.env.SQ_APPLICATION_NAME || 'Booking System',
          logoUrl: null
        }
      });
    }
    
}));

/**
 * GET /auth/edit-profile
 */
router.get("/edit-profile", async (req, res) => {
  if (!req.session?.authenticatedCustomer) {
    return res.redirect('/auth/login');
  }
  
  const customer = req.session.authenticatedCustomer;
  
  // Check session validity
  if (customer.sessionExpires && Date.now() > customer.sessionExpires) {
    delete req.session.authenticatedCustomer;
    return res.redirect('/auth/login?error=session_expired');
  }
  
  const error = req.query.error;
  const success = req.query.success;
  
  const errorMessages = {
    'invalid_email': 'Please enter a valid email address.',
    'invalid_phone': 'Please enter a valid phone number.',
    'update_failed': 'Failed to update profile. Please try again.',
    'invalid_name': 'Please enter a valid name.'
  };
  
  const successMessages = {
    'profile_updated': 'Your profile has been updated successfully!'
  };
  
  res.render("pages/edit-profile", {
    customer,
    error: errorMessages[error] || null,
    success: successMessages[success] || null,
    location: {
      businessName: process.env.SQ_APPLICATION_NAME || 'Booking System',
      logoUrl: null
    }
  });
});

/**
 * POST /auth/update-profile
 */
router.post("/update-profile", asyncHandler(async (req, res) => {
  if (!req.session?.authenticatedCustomer) {
    return res.redirect('/auth/login');
  }
  
  const customer = req.session.authenticatedCustomer;
  const { givenName, familyName, emailAddress, phoneNumber } = req.body;
  
  // Validation
  if (!givenName || !familyName) {
    return res.redirect('/auth/edit-profile?error=invalid_name');
  }
  
  if (emailAddress && !validateEmail(emailAddress)) {
    return res.redirect('/auth/edit-profile?error=invalid_email');
  }
  
  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    return res.redirect('/auth/edit-profile?error=invalid_phone');
  }
    
    // Normalize phone number if provided
    let normalizedPhone = customer.phoneNumber;
    if (phoneNumber) {
      normalizedPhone = normalizePhoneNumber(phoneNumber);
    }
    
    // Prepare Square API update request with proper structure
    const updateCustomerRequest = {
      givenName: givenName.trim(),
      familyName: familyName.trim()
    };
    
    // Only include fields that have values to avoid clearing existing data
    if (emailAddress && emailAddress.trim()) {
      updateCustomerRequest.emailAddress = emailAddress.trim();
    }
    
    if (phoneNumber && phoneNumber.trim()) {
      updateCustomerRequest.phoneNumber = normalizedPhone;
    }
    
    logger.info('Updating customer profile', { customerId: customer.id, fields: Object.keys(updateCustomerRequest) });
    
    // Update customer in Square with proper error handling
    const { result: updatedCustomer } = await customersApi.updateCustomer(customer.id, updateCustomerRequest);
    
    logger.info('Customer profile updated successfully', { customerId: updatedCustomer.customer.id });
    
    // Convert Square API response to safe format before storing in session
    const safeCustomerData = convertBigIntToNumber({
      id: updatedCustomer.customer.id,
      givenName: updatedCustomer.customer.givenName,
      familyName: updatedCustomer.customer.familyName,
      emailAddress: updatedCustomer.customer.emailAddress || customer.emailAddress,
      phoneNumber: updatedCustomer.customer.phoneNumber || customer.phoneNumber,
      version: updatedCustomer.customer.version
    });
    
    // Update session with safe data (no BigInt values)
    req.session.authenticatedCustomer = {
      ...customer,
      ...safeCustomerData,
      lastActivity: Date.now(),
      // Keep existing session properties that aren't from Square API
      loginTime: customer.loginTime,
      firebaseVerified: customer.firebaseVerified,
      sessionExpires: customer.sessionExpires
    };
    
    logger.info('Customer session updated with fresh data', { customerId: customer.id });
    res.redirect('/auth/edit-profile?success=profile_updated');
}));

/**
 * GET /auth/refresh-profile
 * Refresh customer data from Square API
 */
router.get("/refresh-profile", asyncHandler(async (req, res) => {
  if (!req.session?.authenticatedCustomer) {
    return res.redirect('/auth/login');
  }
    
    const customer = req.session.authenticatedCustomer;
    
    // Fetch fresh customer data from Square
    const { result: { customer: freshCustomerData } } = await customersApi.retrieveCustomer(customer.id);
    
    // Convert to safe format before storing in session
    const safeCustomerData = convertBigIntToNumber({
      id: freshCustomerData.id,
      givenName: freshCustomerData.givenName,
      familyName: freshCustomerData.familyName,
      emailAddress: freshCustomerData.emailAddress,
      phoneNumber: freshCustomerData.phoneNumber,
      version: freshCustomerData.version
    });
    
    // Update session with latest Square data (safe format)
    req.session.authenticatedCustomer = {
      ...customer,
      ...safeCustomerData,
      lastActivity: Date.now()
    };
    
  res.redirect('/auth/appointments?success=profile_refreshed');
}));

/**
 * GET /auth/payment-methods
 */
router.get("/payment-methods", async (req, res) => {
  if (!req.session?.authenticatedCustomer) {
    return res.redirect('/auth/login');
  }
  
  const customer = req.session.authenticatedCustomer;
  
  if (customer.sessionExpires && Date.now() > customer.sessionExpires) {
    delete req.session.authenticatedCustomer;
    return res.redirect('/auth/login?error=session_expired');
  }
  
  const error = req.query.error;
  const success = req.query.success;
  
  const errorMessages = {
    'delete_failed': 'Failed to delete payment method. Please try again.',
    'fetch_failed': 'Failed to load payment methods. Please try again.',
    'not_found': 'Payment method not found.',
    'add_failed': 'Failed to add payment method. Please check your card details.'
  };
  
  const successMessages = {
    'payment_deleted': 'Payment method deleted successfully!',
    'payment_updated': 'Payment method updated successfully!',
    'payment_added': 'Payment method added successfully!'
  };
  
  logger.info('Loading payment methods', { customerId: customer.id });
  
  let paymentMethods = [];
  
  try {
    // Use card management utility to get customer with cards
    const customerWithCards = await getCustomerWithCards(customer.id);
    
    logger.info('Retrieved customer payment methods', { 
      customerId: customer.id, 
      enabledCards: customerWithCards.enabledCards.length 
    });
    
    // Convert to clean payment methods format
    paymentMethods = customerWithCards.enabledCards.map((card, index) => convertBigIntToNumber({
      id: card.cardId,
      cardBrand: card.cardBrand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      enabled: card.enabled,
      cardholderName: card.cardholderName,
      billingAddress: card.billingAddress || {},
      isDefault: index === 0, // First card is default for now
      createdAt: new Date().toISOString(),
      isSquareCard: true
    }));
    
  } catch (squareError) {
    logger.warn('Square Cards API unavailable, using fallback', { error: squareError.message });
    
    // Clean fallback with minimal demo data
    paymentMethods = [
      {
        id: 'demo_visa_1234',
        last4: '1234',
        cardBrand: 'VISA',
        expMonth: 12,
        expYear: 2025,
        isDefault: true,
        enabled: true,
        cardholderName: `${customer.givenName} ${customer.familyName}`,
        billingAddress: {},
        createdAt: new Date().toISOString(),
        isDemo: true
      }
    ];
  }
  
  res.render("pages/payment-methods", {
    customer,
    paymentMethods,
    error: errorMessages[error] || null,
    success: successMessages[success] || null,
    squareAppId: process.env.SQ_APPLICATION_ID,
    squareLocationId: process.env.SQ_LOCATION_ID,
    squareEnvironment: process.env.SQ_ENVIRONMENT || 'sandbox',
    location: {
      businessName: process.env.SQ_APPLICATION_NAME || 'Booking System',
      logoUrl: null
    }
  });
});

/**
 * POST /auth/payment-methods/create-card
 */
router.post("/payment-methods/create-card", asyncHandler(async (req, res) => {
  if (!req.session?.authenticatedCustomer) {
    throw new AuthenticationError('Not authenticated');
  }
  
  const customer = req.session.authenticatedCustomer;
  const { sourceId, verificationToken } = req.body;
  
  if (!sourceId) {
    throw new ValidationError('Payment token is required');
  }
  
  logger.info('Creating payment card', { customerId: customer.id });
    
    try {
      // Use card management utility
      const cardData = {
        sourceId: sourceId,
        cardholderName: `${customer.givenName} ${customer.familyName}`,
        billingAddress: {},
        referenceId: `auth-${Date.now()}`
      };
      
      if (verificationToken) {
        cardData.verificationToken = verificationToken;
      }
      
    const createdCard = await createCardOnFile(cardData, customer.id);
    
    logger.info('Payment card created successfully', { 
      customerId: customer.id, 
      cardId: createdCard.cardId,
      last4: createdCard.last4
    });
    
    res.json(convertBigIntToNumber({
      success: true,
      cardId: createdCard.cardId,
      last4: createdCard.last4,
      cardBrand: createdCard.cardBrand,
      expMonth: createdCard.expMonth,
      expYear: createdCard.expYear,
      message: 'Payment method saved successfully'
    }));
    
  } catch (cardError) {
    logger.error('Card creation failed', { error: cardError.message, customerId: customer.id });
      
    // Return error instead of fallback for cleaner UX
    throw new ValidationError('Unable to save payment method. Please try again.');
  }
}));

/**
 * POST /auth/payment-methods/delete
 */
router.post("/payment-methods/delete", asyncHandler(async (req, res) => {
  if (!req.session?.authenticatedCustomer) {
    return res.redirect('/auth/login');
  }
  
  const { cardId } = req.body;
  
  if (!cardId) {
    return res.redirect('/auth/payment-methods?error=not_found');
  }
  
  logger.info('Deleting payment method', { cardId });
    
  // Handle demo cards
  if (cardId.startsWith('demo_')) {
    logger.info('Demo card deletion processed', { cardId });
    return res.redirect('/auth/payment-methods?success=payment_deleted');
  }
  
  try {
    // Use card management utility to disable card
    await disableCard(cardId);
    logger.info('Payment card disabled successfully', { cardId });
    return res.redirect('/auth/payment-methods?success=payment_deleted');
    
  } catch (cardError) {
    logger.error('Card deletion failed', { error: cardError.message, cardId });
      
      // If card not found, consider it deleted
      if (cardError.message.includes('not found')) {
        return res.redirect('/auth/payment-methods?success=payment_deleted');
      }
      
    return res.redirect('/auth/payment-methods?error=delete_failed');
  }
}));

/**
 * GET /auth/customer/:customerId/cards (API endpoint using card management utility)
 */
router.get("/customer/:customerId/cards", async (req, res) => {
  const { customerId } = req.params;
  
  // Check authentication
  if (!req.session?.authenticatedCustomer || req.session.authenticatedCustomer.id !== customerId) {
    return res.status(401).json(convertBigIntToNumber({
      success: false,
      enabledCards: [],
      error: 'Unauthorized access'
    }));
  }
  
  logger.info('Cards API endpoint called', { customerId });
  
  try {
    // Use card management utility to get customer with cards
    const customerWithCards = await getCustomerWithCards(customerId);
    
    logger.info('Retrieved customer cards', { 
      customerId, 
      totalCards: customerWithCards.cards.length, 
      enabledCards: customerWithCards.enabledCards.length 
    });
    
    // Format enabled cards for response
    const enabledCards = customerWithCards.enabledCards.map(card => convertBigIntToNumber({
      id: card.cardId,
      cardBrand: card.cardBrand || 'Unknown',
      last4: card.last4 || '****',
      expMonth: card.expMonth,
      expYear: card.expYear,
      enabled: card.enabled,
      cardholderName: card.cardholderName,
      isDefault: false // Will need to implement default logic
    }));
    
    const response = convertBigIntToNumber({
      success: true,
      enabledCards: enabledCards,
      message: `Found ${enabledCards.length} enabled cards`
    });
    
    logger.info('Returning cards API response', { customerId, cardCount: enabledCards.length });
    
    res.json(response);
    
  } catch (error) {
    logger.error('Cards API error', { error: error.message, customerId });
    
    // Return session fallback on error
    let fallbackCards = [];
    try {
      fallbackCards = (req.session.paymentMethods || [])
        .filter(card => card.enabled !== false)
        .map(card => convertBigIntToNumber(card));
    } catch (sessionError) {
      logger.error('Session fallback failed', { error: sessionError.message });
    }
    
    const errorResponse = convertBigIntToNumber({
      success: false,
      enabledCards: fallbackCards,
      error: error.message,
      fallbackUsed: fallbackCards.length > 0
    });
    
    logger.warn('Returning cards API error response', { 
      customerId, 
      fallbackCardCount: fallbackCards.length 
    });
    
    res.json(errorResponse);
  }
});

/**
 * GET /auth/check-customer/:phoneNumber
 * Check if a customer exists with the given phone number
 */
router.get("/check-customer/:phoneNumber", asyncHandler(async (req, res) => {
  const { phoneNumber } = req.params;
  
  if (!phoneNumber) {
    throw new ValidationError('Phone number is required');
  }
  
  // Decode URL-encoded phone number (%2B becomes +)
  const decodedPhone = decodeURIComponent(phoneNumber);
  
  if (!validatePhoneNumber(decodedPhone)) {
    throw new ValidationError('Invalid phone number format');
  }
  
  const normalizedPhone = normalizePhoneNumber(decodedPhone);
  logger.info('Checking customer existence', { phoneNumber: normalizedPhone });
    
    if (!customersApi) {
      return res.status(500).json({ 
        exists: false, 
        error: 'Square API not configured' 
      });
    }
    
    // Search for customer by phone number
    const { result: { customers } } = await customersApi.searchCustomers({
      query: {
        filter: {
          phoneNumber: {
            exact: normalizedPhone
          }
        }
      }
    });
    
    if (customers && customers.length > 0) {
      const customer = customers[0];
      
      // Convert to safe format for JSON response
      const safeCustomerData = convertBigIntToNumber({
        id: customer.id,
        givenName: customer.givenName,
        familyName: customer.familyName,
        emailAddress: customer.emailAddress,
        phoneNumber: customer.phoneNumber
      });
      
      res.json({
        exists: true,
        customer: safeCustomerData
      });
  } else {
    res.json({
      exists: false,
      message: 'No customer found with this phone number'
    });
  }
}));

/**
 * POST /auth/logout
 */
router.post("/logout", (req, res) => {
  if (req.session?.authenticatedCustomer) {
    const customer = req.session.authenticatedCustomer;
    if (req.session) {
      delete req.session.authenticatedCustomer;
    } else {
      res.json({ success: true, sessionValid: true });
    }
  } else {
    res.json({ success: false, sessionValid: false });
  }
});

/**
 * POST /auth/ping
 */
router.post("/ping", (req, res) => {
  if (req.session?.authenticatedCustomer) {
    const customer = req.session.authenticatedCustomer;
    customer.lastActivity = Date.now();
    req.session.authenticatedCustomer = customer;
    
    if (!customer.sessionExpires || Date.now() < customer.sessionExpires) {
      res.json({ success: true, sessionValid: true });
    } else {
      delete req.session.authenticatedCustomer;
      res.json({ success: false, sessionValid: false });
    }
  } else {
    res.json({ success: false, sessionValid: false });
  }
});

// Helper function to determine card brand
function getCardBrand(cardNumber) {
  const number = cardNumber.replace(/\s/g, '');
  
  if (/^4/.test(number)) return 'VISA';
  if (/^5[1-5]/.test(number)) return 'MASTERCARD';
  if (/^3[47]/.test(number)) return 'AMERICAN_EXPRESS';
  if (/^6(?:011|5)/.test(number)) return 'DISCOVER';
  
  return 'VISA';
}

module.exports = router;