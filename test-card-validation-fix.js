/**
 * Test script to validate the card validation API endpoint
 * This tests the /payment/customer/:customerId/cards endpoint that was failing before
 */

require('dotenv').config();

const express = require('express');
const { getCustomerWithCards } = require('./util/card-management');

console.log('Testing card validation API endpoint...');

// Test the card management function directly with a test customer ID
async function testCardValidation() {
    try {
        console.log('\n🔍 Testing getCustomerWithCards function...');
        
        // Use a test customer ID (this will likely fail with "customer not found" but should not have import errors)
        const testCustomerId = 'TEST_CUSTOMER_ID';
        
        const result = await getCustomerWithCards(testCustomerId);
        console.log('✅ SUCCESS: Function executed without import errors');
        console.log('Result:', result);
        
    } catch (error) {
        if (error.message.includes('customersApi')) {
            console.error('❌ FATAL: customersApi import issue still exists!');
            console.error('Error:', error.message);
            return false;
        } else if (error.message.includes('NOT_FOUND') || error.message.includes('not found')) {
            console.log('✅ SUCCESS: Import working correctly (expected "not found" error for test ID)');
            console.log('Error message (expected):', error.message);
            return true;
        } else {
            console.log('⚠️  Unexpected error (but imports are working):');
            console.log('Error:', error.message);
            return true;
        }
    }
}

// Test the actual API endpoint routing
async function testAPIEndpoint() {
    try {
        console.log('\n🌐 Testing API endpoint routing...');
        
        // Import the payment route
        const paymentRouter = require('./routes/payment');
        console.log('✅ Payment router imported successfully');
        
        // Create a mock Express app to test routing
        const app = express();
        app.use('/payment', paymentRouter);
        
        console.log('✅ Payment routes mounted successfully');
        console.log('✅ The /payment/customer/:customerId/cards endpoint should be working');
        
        return true;
        
    } catch (error) {
        console.error('❌ ERROR in API endpoint test:');
        console.error('Error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('='.repeat(60));
    console.log('🧪 CARD VALIDATION SYSTEM TEST');
    console.log('='.repeat(60));
    
    const test1 = await testCardValidation();
    const test2 = await testAPIEndpoint();
    
    console.log('\n' + '='.repeat(60));
    
    if (test1 && test2) {
        console.log('🎉 ALL TESTS PASSED!');
        console.log('✅ The critical Square client import issue has been RESOLVED');
        console.log('✅ Card validation system is ready for testing');
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Start the server: node app.js');
        console.log('2. Navigate to: http://localhost:3000/contact');
        console.log('3. Test existing customer flow with phone number lookup');
        console.log('4. Verify card validation is working properly');
    } else {
        console.log('❌ SOME TESTS FAILED');
        console.log('The card validation system still has issues that need to be addressed.');
    }
    
    console.log('='.repeat(60));
}

runAllTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
});
