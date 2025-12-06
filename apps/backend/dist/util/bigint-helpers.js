"use strict";
/**
 * Utility functions for handling BigInt values in Square API responses
 * Adapted from legacy Express app utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeNumberConversion = safeNumberConversion;
exports.safeJSONStringify = safeJSONStringify;
exports.monetaryAmountToCents = monetaryAmountToCents;
exports.durationMsToMinutes = durationMsToMinutes;
/**
 * Safe BigInt to Number conversion
 * @param value - Value that might be a BigInt
 * @returns Converted number or 0 if conversion fails
 */
function safeNumberConversion(value) {
    if (typeof value === 'bigint') {
        const num = Number(value);
        if (num === Infinity || num === -Infinity) {
            console.warn('BigInt value too large for Number conversion:', value.toString());
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
 * @param data - Data to stringify
 * @param space - Indentation spaces
 * @returns JSON string with BigInt values converted to strings
 */
function safeJSONStringify(data, space = 2) {
    return JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value, space);
}
/**
 * Safe conversion of monetary amounts from Square API (BigInt) to cents (number)
 * @param amount - Square API monetary amount (may be BigInt)
 * @returns Amount in cents as number
 */
function monetaryAmountToCents(amount) {
    if (amount === null || amount === undefined) {
        return 0;
    }
    return safeNumberConversion(amount);
}
/**
 * Safe conversion of duration from Square API (BigInt milliseconds) to minutes
 * @param durationMs - Duration in milliseconds (may be BigInt)
 * @returns Duration in minutes as number
 */
function durationMsToMinutes(durationMs) {
    if (durationMs === null || durationMs === undefined) {
        return 60; // Default to 60 minutes
    }
    const ms = safeNumberConversion(durationMs);
    return Math.floor(ms / 1000 / 60);
}
//# sourceMappingURL=bigint-helpers.js.map