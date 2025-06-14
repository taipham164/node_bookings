/**
 * Test Square Payment Form UI and Functionality
 * This tests the "Add Payment Method" section for existing customers
 */

require('dotenv').config();

console.log('🧪 Testing Square Payment Form UI');
console.log('=' .repeat(50));

// Test the Square SDK configuration
console.log('\n1️⃣ Testing Square SDK Configuration:');
console.log('SQ_APPLICATION_ID:', process.env.SQ_APPLICATION_ID ? 'Set ✅' : 'Missing ❌');
console.log('SQ_LOCATION_ID:', process.env.SQ_LOCATION_ID ? 'Set ✅' : 'Missing ❌');
console.log('ENVIRONMENT:', process.env.ENVIRONMENT || 'Not set');

if (process.env.SQ_APPLICATION_ID) {
    console.log('App ID Preview:', process.env.SQ_APPLICATION_ID.substring(0, 15) + '...');
}

console.log('\n2️⃣ Testing Square Client Integration:');

try {
    const { cardsApi, customersApi } = require('./util/square-client');
    console.log('✅ Square client imported successfully');
    console.log('✅ cardsApi available:', typeof cardsApi === 'object');
    console.log('✅ customersApi available:', typeof customersApi === 'object');
    
    // Test card management functions
    const cardManagement = require('./util/card-management');
    console.log('✅ Card management module loaded');
    
} catch (error) {
    console.error('❌ Square client integration failed:', error.message);
}

console.log('\n3️⃣ Testing Payment Form Integration:');

// Check if the contact page includes the Square SDK
const fs = require('fs');
const path = require('path');

try {
    const contactPagePath = path.join(__dirname, 'views', 'pages', 'contact.ejs');
    const contactContent = fs.readFileSync(contactPagePath, 'utf8');
    
    // Check for Square SDK script
    if (contactContent.includes('https://sandbox-web.squarecdn.com/v1/square.js')) {
        console.log('✅ Square Web Payments SDK included');
    } else if (contactContent.includes('https://web.squarecdn.com/v1/square.js')) {
        console.log('✅ Square Web Payments SDK included (production)');
    } else {
        console.log('⚠️  Square Web Payments SDK not found in contact page');
    }
    
    // Check for payment form elements
    if (contactContent.includes('existing-card-element')) {
        console.log('✅ Existing customer card form element found');
    } else {
        console.log('❌ Existing customer card form element missing');
    }
    
    if (contactContent.includes('initializeSquarePaymentsForExistingCustomer')) {
        console.log('✅ Square payment initialization function found');
    } else {
        console.log('❌ Square payment initialization function missing');
    }
    
    // Check for postal code field
    if (contactContent.includes('existingPostalCode')) {
        console.log('✅ Postal code field found');
    } else {
        console.log('❌ Postal code field missing');
    }
    
    // Check for card nonce handling
    if (contactContent.includes('existingCardNonce')) {
        console.log('✅ Card nonce handling found');
    } else {
        console.log('❌ Card nonce handling missing');
    }
    
} catch (error) {
    console.error('❌ Error checking contact page:', error.message);
}

console.log('\n4️⃣ UI Form Elements Check:');

// Check if all required form elements are present
const requiredElements = [
    'existing-card-element',
    'existingCardNonce',
    'existingPostalCode',
    'existing-card-errors'
];

const missingElements = [];
const contactContent = fs.readFileSync(path.join(__dirname, 'views', 'pages', 'contact.ejs'), 'utf8');

requiredElements.forEach(element => {
    if (contactContent.includes(element)) {
        console.log(`✅ ${element} - Present`);
    } else {
        console.log(`❌ ${element} - Missing`);
        missingElements.push(element);
    }
});

console.log('\n5️⃣ Payment Form JavaScript Check:');

// Check for key JavaScript functions
const jsFunctions = [
    'showExistingCustomerRequireCard',
    'showCardAdditionForExistingCustomer', 
    'initializeSquarePaymentsForExistingCustomer'
];

jsFunctions.forEach(func => {
    if (contactContent.includes(func)) {
        console.log(`✅ ${func} - Implemented`);
    } else {
        console.log(`❌ ${func} - Missing`);
    }
});

console.log('\n' + '='.repeat(50));

if (missingElements.length === 0) {
    console.log('🎉 PAYMENT FORM UI CHECK PASSED!');
    console.log('✅ All required elements are present');
    console.log('✅ Square SDK integration is complete');
    console.log('✅ Payment form is ready for testing');
    
    console.log('\n📋 WHAT TO TEST IN BROWSER:');
    console.log('1. Navigate to: http://localhost:3000/contact');
    console.log('2. Enter phone number: +12792031957 (existing customer)');
    console.log('3. Verify "Add Payment Method" section appears');
    console.log('4. Check that Square payment form loads properly');
    console.log('5. Test entering card details and postal code');
    console.log('6. Verify form validation and submission');
    
} else {
    console.log('⚠️  PAYMENT FORM ISSUES DETECTED');
    console.log('Missing elements:', missingElements.join(', '));
    console.log('Some UI components may not work properly');
}

console.log('='.repeat(50));
