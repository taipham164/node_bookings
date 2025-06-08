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
const { customersApi } = require("../util/square-client");

/**
 * Normalize phone number to E.164 format for consistency
 * @param {string} phone - Raw phone number input
 * @returns {string} - Normalized phone number
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
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
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {object} - Validation result with isValid and message
 */
function validatePhoneNumber(phone) {
  if (!phone || !phone.trim()) {
    return { isValid: false, message: 'Phone number is required' };
  }
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 10) {
    return { isValid: false, message: 'Phone number must be at least 10 digits' };
  }
  
  if (cleaned.length > 15) {
    return { isValid: false, message: 'Phone number is too long' };
  }
  
  if (cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'))) {
    return { isValid: true, message: 'Valid phone number' };
  }
  
  return { isValid: true, message: 'Valid international phone number' };
}

/**
 * POST /customer/check-phone
 * 
 * Check if a phone number belongs to an existing customer
 */
router.post("/check-phone", async (req, res) => {
  console.log('Checking phone number for existing customer...');
  
  try {
    const { phoneNumber } = req.body;
    
    const { isValid, message } = validatePhoneNumber(phoneNumber);
    if (!isValid) {
      return res.status(400).json({ 
        exists: false, 
        error: message 
      });
    }
    
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    console.log('Normalized phone:', normalizedPhone);
    
    // Search for customers with this phone number
    const searchQuery = {
      query: {
        filter: {
          phoneNumber: {
            exact: normalizedPhone
          }
        }
      }
    };
    
    console.log('Searching for customer with phone:', searchQuery);
    
    const { result } = await customersApi.searchCustomers(searchQuery);
    
    if (result.customers && result.customers.length > 0) {
      // Customer exists
      const customer = result.customers[0];
      console.log('Found existing customer:', customer.id);
      
      return res.json({
        exists: true,
        customer: {
          id: customer.id,
          givenName: customer.givenName || '',
          familyName: customer.familyName || '',
          emailAddress: customer.emailAddress || '',
          phoneNumber: normalizedPhone
        }
      });
    } else {
      // Customer doesn't exist
      console.log('No customer found with this phone number');
      return res.json({ exists: false });
    }
    
  } catch (error) {
    console.error('Error checking phone number:', error);
    
    // For demo purposes, return that customer doesn't exist on API errors
    return res.json({ 
      exists: false,
      error: 'Unable to verify phone number. Proceeding as new customer.'
    });
  }
});

module.exports = router;
