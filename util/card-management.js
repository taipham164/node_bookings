/**
 * Square Cards API Integration
 * Handles saving and managing customer payment methods
 */

/**
 * Creates a new card on file for a customer
 * @param {Object} cardData - Card information
 * @param {string} customerId - Square customer ID
 * @returns {Promise<Object>} Created card information
 */
async function createCardOnFile(cardData, customerId) {
  try {
    const { squareClient } = require('./square-client');
    const { randomUUID } = require('crypto');
    
    const requestBody = {
      idempotencyKey: randomUUID(),
      sourceId: cardData.sourceId, // From Web Payments SDK
      card: {
        customerId: customerId,
        cardholderName: cardData.cardholderName,
        billingAddress: cardData.billingAddress,
        referenceId: cardData.referenceId || null
      }
    };
    
    const { result } = await squareClient.cardsApi.createCard(requestBody);
    
    return {
      cardId: result.card.id,
      customerId: result.card.customerId,
      cardBrand: result.card.cardBrand,
      last4: result.card.last4,
      enabled: result.card.enabled,
      cardholderName: result.card.cardholderName,
      expMonth: result.card.expMonth,
      expYear: result.card.expYear
    };
  } catch (error) {
    console.error('Error creating card on file:', error);
    throw new Error(`Failed to save payment method: ${error.message}`);
  }
}

/**
 * Lists all cards on file for a customer
 * @param {string} customerId - Square customer ID
 * @returns {Promise<Array>} List of customer cards
 */
async function listCustomerCards(customerId) {
  try {
    const { squareClient } = require('./square-client');
    
    const query = {
      filter: {
        customerId: customerId
      }
    };
    
    const { result } = await squareClient.cardsApi.listCards(undefined, undefined, undefined, query);
    
    return result.cards?.map(card => ({
      cardId: card.id,
      cardBrand: card.cardBrand,
      last4: card.last4,
      enabled: card.enabled,
      cardholderName: card.cardholderName,
      expMonth: card.expMonth,
      expYear: card.expYear,
      billingAddress: card.billingAddress
    })) || [];
  } catch (error) {
    console.error('Error listing customer cards:', error);
    return [];
  }
}

/**
 * Retrieves a specific card on file
 * @param {string} cardId - Square card ID
 * @returns {Promise<Object>} Card information
 */
async function getCard(cardId) {
  try {
    const { squareClient } = require('./square-client');
    
    const { result } = await squareClient.cardsApi.retrieveCard(cardId);
    
    return {
      cardId: result.card.id,
      customerId: result.card.customerId,
      cardBrand: result.card.cardBrand,
      last4: result.card.last4,
      enabled: result.card.enabled,
      cardholderName: result.card.cardholderName,
      expMonth: result.card.expMonth,
      expYear: result.card.expYear,
      billingAddress: result.card.billingAddress
    };
  } catch (error) {
    console.error('Error retrieving card:', error);
    throw new Error(`Failed to retrieve payment method: ${error.message}`);
  }
}

/**
 * Disables a card on file
 * @param {string} cardId - Square card ID
 * @returns {Promise<Object>} Updated card information
 */
async function disableCard(cardId) {
  try {
    const { squareClient } = require('./square-client');
    
    const { result } = await squareClient.cardsApi.disableCard(cardId);
    
    return {
      cardId: result.card.id,
      enabled: result.card.enabled,
      message: 'Payment method disabled successfully'
    };
  } catch (error) {
    console.error('Error disabling card:', error);
    throw new Error(`Failed to disable payment method: ${error.message}`);
  }
}

/**
 * Creates a payment using a saved card
 * @param {string} cardId - Square card ID
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Payment result
 */
async function createPaymentWithSavedCard(cardId, paymentData) {
  try {
    const { squareClient } = require('./square-client');
    const { randomUUID } = require('crypto');
    
    const requestBody = {
      idempotencyKey: randomUUID(),
      sourceId: cardId,
      amountMoney: {
        amount: paymentData.amount, // in cents
        currency: paymentData.currency || 'USD'
      },
      orderInfo: paymentData.orderInfo,
      note: paymentData.note || 'Payment with saved card',
      autocomplete: true
    };
    
    const { result } = await squareClient.paymentsApi.createPayment(requestBody);
    
    return {
      paymentId: result.payment.id,
      status: result.payment.status,
      amountMoney: result.payment.amountMoney,
      cardDetails: result.payment.cardDetails,
      receiptNumber: result.payment.receiptNumber,
      receiptUrl: result.payment.receiptUrl
    };
  } catch (error) {
    console.error('Error creating payment with saved card:', error);
    throw new Error(`Payment failed: ${error.message}`);
  }
}

/**
 * Gets customer with their saved cards
 * @param {string} customerId - Square customer ID
 * @returns {Promise<Object>} Customer with cards
 */
async function getCustomerWithCards(customerId) {
  try {
    const { squareClient } = require('./square-client');
    
    const [customerResult, cards] = await Promise.all([
      squareClient.customersApi.retrieveCustomer(customerId),
      listCustomerCards(customerId)
    ]);
    
    return {
      customer: {
        id: customerResult.result.customer.id,
        givenName: customerResult.result.customer.givenName,
        familyName: customerResult.result.customer.familyName,
        emailAddress: customerResult.result.customer.emailAddress,
        phoneNumber: customerResult.result.customer.phoneNumber
      },
      cards: cards,
      hasCards: cards.length > 0,
      enabledCards: cards.filter(card => card.enabled)
    };
  } catch (error) {
    console.error('Error getting customer with cards:', error);
    throw new Error(`Failed to retrieve customer payment methods: ${error.message}`);
  }
}

module.exports = {
  createCardOnFile,
  listCustomerCards,
  getCard,
  disableCard,
  createPaymentWithSavedCard,
  getCustomerWithCards
};
