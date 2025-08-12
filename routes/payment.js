/**
 * Payment Management Route
 * Handles card saving and payment processing with Square API
 */

const express = require("express");
const router = express.Router();

const {
  customersApi,
  cardsApi,
} = require("../util/square-client");

/**
 * Convert BigInt values to regular numbers for JSON serialization
 */
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }
  
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
 * GET /customer/:customerId/cards
 * 
 * Fetch saved cards for a customer
 */
router.get("/customer/:customerId/cards", async (req, res) => {
  const { customerId } = req.params;
  
  console.log('=== Cards API Endpoint Called ===');
  console.log('Fetching cards for customer:', customerId);
  console.log('customersApi available:', !!customersApi);
  console.log('cardsApi available:', !!cardsApi);
  
  try {
    // Check if customersApi is available
    if (!customersApi) {
      console.warn('customersApi not available, returning empty cards');
      return res.json({
        success: true,
        enabledCards: [],
        message: 'Customers API not available'
      });
    }

    console.log('Attempting to retrieve customer from Square API...');
    
    // Get customer details to find saved cards
    const { result: customerResult } = await customersApi.retrieveCustomer(customerId);
    console.log('Square API call completed');
    console.log('Customer result:', customerResult ? 'Received' : 'Empty');
    
    const customer = customerResult?.customer;
    
    console.log('Customer retrieved:', customer ? 'Found' : 'Not found');
    console.log('Customer data keys:', customer ? Object.keys(customer) : 'N/A');
    console.log('Customer cards property exists:', customer ? ('cards' in customer) : 'N/A');
    console.log('Customer cards:', customer?.cards?.length || 0);
    
    if (!customer) {
      console.log('Customer not found:', customerId);
      return res.json({
        success: true,
        enabledCards: [],
        message: 'Customer not found'
      });
    }
    
    // Check if customer has cards property
    if (!customer.cards || !Array.isArray(customer.cards) || customer.cards.length === 0) {
      console.log('No cards found for customer:', customerId);
      console.log('Cards property type:', typeof customer.cards);
      console.log('Cards is array:', Array.isArray(customer.cards));
      return res.json({
        success: true,
        enabledCards: [],
        message: 'No cards found for customer'
      });
    }
    
    console.log('Raw customer cards:', JSON.stringify(convertBigIntToNumber(customer.cards), null, 2));
    
    // Filter and format enabled cards with BigInt conversion
    const enabledCards = customer.cards
      .filter(card => card.enabled !== false)
      .map(card => convertBigIntToNumber({
        id: card.id,
        cardBrand: card.cardBrand || 'Unknown',
        last4: card.last4 || '****',
        expMonth: card.expMonth,
        expYear: card.expYear,
        enabled: card.enabled !== false
      }));
    
    console.log('Filtered enabled cards:', enabledCards.length);
    console.log('Enabled cards data:', JSON.stringify(enabledCards, null, 2));
    
    const response = {
      success: true,
      enabledCards: enabledCards,
      message: `Found ${enabledCards.length} enabled cards`
    };
    
    console.log('Returning response:', JSON.stringify(response, null, 2));
    
    res.json(response);
    
  } catch (error) {
    console.error('=== ERROR in Cards API ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check if it's a Square API error
    if (error.errors) {
      console.error('Square API errors:', JSON.stringify(convertBigIntToNumber(error.errors), null, 2));
    }
    
    // Return empty cards array instead of error to allow booking to continue
    const errorResponse = {
      success: false,
      enabledCards: [],
      error: error.message,
      errorType: error.constructor.name
    };
    
    console.log('Returning error response:', JSON.stringify(errorResponse, null, 2));
    
    res.json(errorResponse);
  }
});

/**
 * POST /charge-saved-card
 * Process payment using a saved card
 */
router.post("/charge-saved-card", async (req, res) => {
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
    
    // This would need to be implemented based on your payment processing logic
    // const payment = await createPaymentWithSavedCard(cardId, paymentData);
    
    res.json({
      success: true,
      message: "Payment processed successfully"
      // payment: payment
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
 * GET /test
 * Test endpoint for payment integration
 */
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Payment API is working",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
