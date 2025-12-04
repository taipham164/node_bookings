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

const { logger } = require('./logger');

/**
 * Utility functions for handling BigInt values in Square API responses
 */

/**
 * Safe BigInt to Number conversion
 * @param {*} value - Value that might be a BigInt
 * @returns {number} - Converted number or 0 if conversion fails
 */
function safeNumberConversion(value) {
  if (typeof value === 'bigint') {
    const num = Number(value);
    if (num === Infinity || num === -Infinity) {
      logger.warn('BigInt value too large for Number conversion:', value);
      return 0;
    }
    return num;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return value || 0;
}

/**
 * JSON stringify with BigInt support
 * @param {*} data - Data to stringify
 * @param {number} [space=2] - Indentation spaces
 * @returns {string} - JSON string with BigInt values converted to strings
 */
function safeJSONStringify(data, space = 2) {
  return JSON.stringify(data, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value, space);
}

/**
 * Convert Square API price amount (cents) to dollar amount
 * @param {*} amount - Amount in cents (possibly BigInt)
 * @param {string} [currency='USD'] - Currency code
 * @returns {object} - Object with amount and currency
 */
function convertPriceAmount(amount, currency = 'USD') {
  const numericAmount = safeNumberConversion(amount);
  return {
    amount: numericAmount,
    currency: currency,
    displayAmount: (numericAmount / 100).toFixed(2) // Convert cents to dollars
  };
}

/**
 * Convert duration from milliseconds to minutes
 * @param {*} duration - Duration in milliseconds (possibly BigInt)
 * @returns {number} - Duration in minutes
 */
function convertMsToMins(duration) {
  return Math.round(safeNumberConversion(duration) / 1000 / 60);
}

/**
 * Safe version conversion for catalog items
 * @param {*} version - Version that might be BigInt
 * @returns {number} - Safe numeric version
 */
function convertVersion(version) {
  return safeNumberConversion(version);
}

/**
 * Safe error checking for Square API errors
 * @param {*} error - Error object that might have BigInt or non-array errors
 * @param {string} code - Error code to check for
 * @param {string} field - Field name to check for (optional)
 * @returns {boolean} - True if error matches criteria
 */
function hasSquareError(error, code, field = null) {
  if (!error || !error.errors) return false;
  
  // Ensure errors is an array
  if (!Array.isArray(error.errors)) return false;
  
  return error.errors.some(e => {
    if (e.code !== code) return false;
    if (field && e.field !== field) return false;
    return true;
  });
}

module.exports = {
  safeNumberConversion,
  safeJSONStringify,
  convertPriceAmount,
  convertMsToMins,
  convertVersion,
  hasSquareError
};
