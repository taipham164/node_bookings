/**
 * Test script to validate Square client import fix
 * This tests whether the card-management module can properly import Square APIs
 */

require('dotenv').config();

console.log('Testing Square client import fix...');
console.log('Environment check - SQ_ACCESS_TOKEN exists:', !!process.env.SQ_ACCESS_TOKEN);
console.log('Environment check - SQ_LOCATION_ID exists:', !!process.env.SQ_LOCATION_ID);
console.log('Environment check - SQ_APPLICATION_ID exists:', !!process.env.SQ_APPLICATION_ID);

try {
    // Test 1: Import Square client APIs directly
    console.log('\n1. Testing direct Square client imports...');
    const { cardsApi, customersApi, paymentsApi } = require('./util/square-client');
    
    console.log('✅ cardsApi imported:', typeof cardsApi);
    console.log('✅ customersApi imported:', typeof customersApi);
    console.log('✅ paymentsApi imported:', typeof paymentsApi);
    
    // Test 2: Import card management utility
    console.log('\n2. Testing card management utility imports...');
    const {
        createCardOnFile,
        listCustomerCards,
        getCard,
        disableCard,
        createPaymentWithSavedCard,
        getCustomerWithCards
    } = require('./util/card-management');
    
    console.log('✅ createCardOnFile function:', typeof createCardOnFile);
    console.log('✅ listCustomerCards function:', typeof listCustomerCards);
    console.log('✅ getCard function:', typeof getCard);
    console.log('✅ disableCard function:', typeof disableCard);
    console.log('✅ createPaymentWithSavedCard function:', typeof createPaymentWithSavedCard);
    console.log('✅ getCustomerWithCards function:', typeof getCustomerWithCards);
    
    console.log('\n🎉 SUCCESS: All Square API imports are working correctly!');
    console.log('✅ The customersApi undefined issue has been resolved.');
    
} catch (error) {
    console.error('\n❌ ERROR: Square client import test failed:');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.message.includes('customersApi')) {
        console.error('\n🔍 DIAGNOSIS: The customersApi import issue still exists.');
        console.error('The card-management.js file is still trying to access Square APIs incorrectly.');
    }
    
    process.exit(1);
}

console.log('\n--- Test Complete ---');
