/**
 * Payment Management Route
 * Handles card saving and payment processing with Square API
 */

const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const {
  customersApi,
  cardsApi,
  paymentsApi
} = require("../util/square-client");
const { safeNumberConversion } = require("../util/bigint-helpers");
const { logger, logApiCall, logApiResponse } = require("../util/logger");
const { asyncHandler, ValidationError, SquareApiError, AppError } = require("../middleware/errorHandler");
const { requireAuth, requireOwnership } = require("../middleware/authMiddleware");

/**
 * Convert BigInt values to regular numbers for JSON serialization
 */
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return safeNumberConversion(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }

  if (typeof obj === "object") {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }

  return obj;
}

/**
 * GET /customer/:customerId/cards
 * Fetch saved cards for a customer (requires authentication)
 */
router.get(
  "/customer/:customerId/cards",
  requireAuth,
  requireOwnership("customerId"),
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    logger.info("Fetching cards for customer", { customerId });

    if (!customersApi) {
      logger.warn("Customers API not available");
      return res.json({
        success: true,
        enabledCards: [],
        message: "Customers API not available"
      });
    }

    logApiCall("customersApi.retrieveCustomer", "GET", { customerId });
    const { result: customerResult } = await customersApi.retrieveCustomer(customerId);
    const customer = customerResult?.customer;

    if (!customer || !customer.cards || customer.cards.length === 0) {
      logger.info("No cards found for customer", { customerId });
      return res.json({
        success: true,
        enabledCards: [],
        message: "No cards found for customer"
      });
    }

    // Filter and format enabled cards
    const enabledCards = customer.cards
      .filter((card) => card.enabled !== false)
      .map((card) =>
        convertBigIntToNumber({
          id: card.id,
          cardBrand: card.cardBrand || "Unknown",
          last4: card.last4 || "****",
          expMonth: card.expMonth,
          expYear: card.expYear,
          enabled: card.enabled !== false
        })
      );

    logger.info("Cards fetched successfully", { customerId, count: enabledCards.length });

    res.json({
      success: true,
      enabledCards: enabledCards,
      message: `Found ${enabledCards.length} enabled cards`
    });
  })
);

/**
 * POST /charge-saved-card
 * Process payment using a saved card
 */
router.post(
  "/charge-saved-card",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { cardId, amount, currency = "USD", bookingId, note } = req.body;
    const customerId = req.session.authenticatedCustomer.id;

    // Validate required fields
    if (!cardId || !amount) {
      throw new ValidationError("Missing required fields: cardId and amount");
    }

    if (amount <= 0) {
      throw new ValidationError("Amount must be greater than 0");
    }

    logger.info("Processing payment", { cardId, amount, currency, bookingId, customerId });

    // Prepare payment request
    const paymentBody = {
      sourceId: cardId,
      amountMoney: {
        amount: parseInt(amount), // Amount in cents
        currency: currency.toUpperCase()
      },
      customerId,
      idempotencyKey: crypto.randomUUID()
    };

    if (note) {
      paymentBody.note = note;
    }

    // Add reference to booking if provided
    if (bookingId) {
      paymentBody.referenceId = bookingId;
    }

    logApiCall("paymentsApi.createPayment", "POST", { amount, currency, bookingId });
    const startTime = Date.now();

    try {
      const { result: payment } = await paymentsApi.createPayment(paymentBody);

      const duration = Date.now() - startTime;
      logApiResponse("paymentsApi.createPayment", duration, true);
      logger.info("Payment processed successfully", {
        paymentId: payment.payment.id,
        status: payment.payment.status,
        amount,
        duration
      });

      res.json({
        success: true,
        paymentId: payment.payment.id,
        status: payment.payment.status,
        amount: convertBigIntToNumber(payment.payment.amountMoney?.amount || 0),
        currency: payment.payment.amountMoney?.currency || currency,
        message: "Payment processed successfully"
      });
    } catch (paymentError) {
      const duration = Date.now() - startTime;
      logApiResponse("paymentsApi.createPayment", duration, false);

      logger.warn("Payment processing failed", {
        cardId,
        amount,
        error: paymentError.message
      });

      // Handle specific Square API errors
      if (paymentError.errors && Array.isArray(paymentError.errors)) {
        const errorMessages = paymentError.errors.map((e) => e.detail || e.message).join(", ");
        throw new SquareApiError(`Payment failed: ${errorMessages}`, paymentError.statusCode || 400, paymentError.errors);
      }

      throw new AppError(`Payment processing failed: ${paymentError.message}`, 400);
    }
  })
);

module.exports = router;
