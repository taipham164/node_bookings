/**
 * Quick UI Test for Payment Form
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 Quick Payment Form UI Test');
console.log('='.repeat(40));

// Check environment variables
console.log('\n🔧 Environment Configuration:');
console.log('SQ_APPLICATION_ID:', process.env.SQ_APPLICATION_ID ? 'Configured ✅' : 'Missing ❌');
console.log('SQ_LOCATION_ID:', process.env.SQ_LOCATION_ID ? 'Configured ✅' : 'Missing ❌');

// Check file existence
console.log('\n📁 File Checks:');
const filesToCheck = [
    'views/pages/contact.ejs',
    'util/square-client.js',
    'util/card-management.js',
    'routes/payment.js'
];

filesToCheck.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`${file}: ${exists ? '✅' : '❌'}`);
});

// Check contact.ejs for key elements
console.log('\n🎨 UI Elements Check:');
try {
    const contactPath = path.join(__dirname, 'views', 'pages', 'contact.ejs');
    const content = fs.readFileSync(contactPath, 'utf8');
    
    const elementsToCheck = [
        'existing-card-element',
        'existingCardNonce', 
        'existingPostalCode',
        'initializeSquarePaymentsForExistingCustomer',
        'Add Payment Method'
    ];
    
    elementsToCheck.forEach(element => {
        const found = content.includes(element);
        console.log(`${element}: ${found ? '✅' : '❌'}`);
    });
    
} catch (error) {
    console.error('Error reading contact.ejs:', error.message);
}

console.log('\n🚀 Status Summary:');
console.log('The "Add Payment Method" section should be:');
console.log('• Visible when existing customer has no cards');
console.log('• Contains Square payment form (card-element)');
console.log('• Has postal code input field');
console.log('• Includes secure payment messaging');
console.log('• Button disabled until card is added');

console.log('\n📋 Test Instructions:');
console.log('1. Start server: npm start');
console.log('2. Go to: http://localhost:3000/contact');
console.log('3. Enter phone: +12792031957');
console.log('4. Check "Add Payment Method" appears');
console.log('5. Verify Square form loads with card fields');
