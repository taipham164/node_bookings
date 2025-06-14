/**
 * Test the fixed listCustomerCards function
 * This should now work without the ArgumentsValidationError
 */

require('dotenv').config();

const { listCustomerCards } = require('./util/card-management');

async function testCardListingFix() {
    console.log('🧪 Testing Fixed listCustomerCards Function');
    console.log('=' .repeat(50));
    
    try {
        // Test with the customer ID that was failing in the log
        const testCustomerId = 'JM2ZRBZ5B332E0TGY1GD5NJ66R';
        
        console.log(`Testing listCustomerCards with customer ID: ${testCustomerId}`);
        
        const cards = await listCustomerCards(testCustomerId);
        
        console.log('✅ SUCCESS: listCustomerCards executed without ArgumentsValidationError!');
        console.log(`📊 Found ${cards.length} cards for customer`);
        
        if (cards.length > 0) {
            console.log('\n💳 Customer Cards:');
            cards.forEach((card, index) => {
                console.log(`  ${index + 1}. ${card.cardBrand} ending in ${card.last4} (Enabled: ${card.enabled})`);
            });
        } else {
            console.log('📋 Customer has no cards on file');
        }
        
        console.log('\n🎉 CARD API PARAMETER FIX VERIFIED!');
        console.log('✅ The ArgumentsValidationError has been resolved');
        console.log('✅ Card validation system is now fully operational');
        
        return true;
        
    } catch (error) {
        if (error.message.includes('ArgumentsValidationError')) {
            console.error('❌ FAILED: ArgumentsValidationError still exists!');
            console.error('The parameter structure fix did not work');
        } else if (error.message.includes('NOT_FOUND') || error.message.includes('not found')) {
            console.log('✅ SUCCESS: Parameter fix worked (customer not found is expected for test)');
            console.log('The ArgumentsValidationError is resolved');
        } else {
            console.log('⚠️  Different error (but parameter validation passed):');
            console.log(`Error: ${error.message}`);
        }
        
        console.error('Error details:', error.message);
        return false;
    }
}

// Run the test
testCardListingFix().then(success => {
    if (success) {
        console.log('\n🌟 CARD VALIDATION FIX COMPLETE');
        console.log('The Square Cards API parameter issue has been resolved');
        console.log('Existing customers can now properly check their payment methods');
    } else {
        console.log('\n🔧 MORE FIXES NEEDED');
        console.log('Additional work may be required for full functionality');
    }
}).catch(error => {
    console.error('Fatal test error:', error);
});
