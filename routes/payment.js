/**
 * Payment Management Route
 * Handles card saving and payment processing with Square API
 */

const express = require("express");
const router = express.Router();
const { 
  createCardOnFile, 
  listCustomerCards, 
  disableCard,
  createPaymentWithSavedCard,
  getCustomerWithCards 
} = require("../util/card-management");

// Helper function to safely convert BigInt to Number
function safeBigIntToNumber(value) {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    // Try to parse as BigInt first, then convert to Number
    try {
      return Number(BigInt(value));
    } catch (e) {
      // If that fails, try direct Number conversion
      return Number(value);
    }
  }
  return Number(value) || 0;
}

/**
 * GET /payment/customer/:customerId/cards
 * List all saved cards for a customer
 */
router.get("/customer/:customerId/cards", async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const customerWithCards = await getCustomerWithCards(customerId);
    
    res.json(safeBigIntToNumber({
      success: true,
      customer: customerWithCards.customer,
      cards: customerWithCards.cards,
      hasCards: customerWithCards.hasCards,
      enabledCards: customerWithCards.enabledCards
    }));
  } catch (error) {
    console.error('Error fetching customer cards:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /payment/cards
 * Save a new card on file for a customer
 */
router.post("/cards", async (req, res, next) => {
  try {
    const { sourceId, customerId, cardholderName, billingAddress, referenceId } = req.body;
    
    if (!sourceId || !customerId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: sourceId and customerId"
      });
    }
    
    const cardData = {
      sourceId,
      cardholderName,
      billingAddress,
      referenceId
    };
    
    const card = await createCardOnFile(cardData, customerId);
    
    res.json({
      success: true,
      message: "Payment method saved successfully",
      card: card
    });
  } catch (error) {
    console.error('Error saving card:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /payment/cards/:cardId/disable
 * Disable a saved card
 */
router.post("/cards/:cardId/disable", async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const result = await disableCard(cardId);
    
    res.json({
      success: true,
      message: result.message,
      cardId: result.cardId,
      enabled: result.enabled
    });
  } catch (error) {
    console.error('Error disabling card:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /payment/charge-saved-card
 * Create a payment using a saved card
 */
router.post("/charge-saved-card", async (req, res, next) => {
  try {
    const { cardId, amount, currency, orderInfo, note } = req.body;
    
    if (!cardId || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: cardId and amount"
      });
    }
    
    const paymentData = {
      amount: parseInt(amount), // Ensure amount is in cents
      currency: currency || 'USD',
      orderInfo,
      note
    };
    
    const payment = await createPaymentWithSavedCard(cardId, paymentData);
    
    res.json({
      success: true,
      message: "Payment processed successfully",
      payment: payment
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /payment/test
 * Test endpoint for payment integration
 */
router.get("/test", (req, res) => {
  res.render("pages/payment-test", {
    title: "Payment Management Test"
  });
});

module.exports = router;
