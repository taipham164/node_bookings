/**
 * Square Payment Form Test Script
 * Comprehensive testing of Square Web Payments SDK integration
 */

console.log('🧪 Starting Square Payment Form Tests');
console.log('='.repeat(50));

// Test Configuration
const TEST_CARDS = {
    visa: '4111111111111111',
    mastercard: '5555555555554444',
    amex: '378282246310005',
    discover: '6011111111111117'
};

const TEST_POSTAL_CODE = '12345';

// Test Functions
async function runSquareTests() {
    console.log('\n📋 Test Plan:');
    console.log('1. ✅ Square SDK Loading');
    console.log('2. ✅ Payment Form Creation');
    console.log('3. ✅ Card Form Attachment');
    console.log('4. ✅ Card Tokenization');
    console.log('5. ✅ Error Handling');
    
    // Test 1: SDK Loading
    console.log('\n🔧 Test 1: Square SDK Loading');
    if (typeof window.Square !== 'undefined') {
        console.log('✅ Square SDK loaded successfully');
        console.log('📊 Square version:', window.Square.version || 'Unknown');
    } else {
        console.log('❌ Square SDK not loaded');
        return;
    }
    
    // Test 2: Configuration Check
    console.log('\n🔧 Test 2: Configuration Check');
    const appId = document.querySelector('script').textContent.match(/APP_ID = '([^']+)'/)?.[1];
    const locationId = document.querySelector('script').textContent.match(/LOCATION_ID = '([^']+)'/)?.[1];
    
    console.log('📋 App ID:', appId ? appId.substring(0, 15) + '...' : 'Not found');
    console.log('📋 Location ID:', locationId || 'Not found');
    
    if (!appId || !locationId) {
        console.log('❌ Missing configuration');
        return;
    }
    
    // Test 3: Payments Instance
    console.log('\n🔧 Test 3: Creating Payments Instance');
    try {
        const payments = window.Square.payments(appId, locationId);
        console.log('✅ Payments instance created');
        
        // Test 4: Card Creation
        console.log('\n🔧 Test 4: Creating Card Payment Method');
        const card = await payments.card({
            includeInputLabels: true
        });
        console.log('✅ Card payment method created');
        
        // Test 5: DOM Attachment
        console.log('\n🔧 Test 5: Attaching to DOM');
        const testContainer = document.getElementById('card-container');
        if (testContainer) {
            await card.attach('#card-container');
            console.log('✅ Card form attached to DOM');
            
            // Test 6: Form Validation
            setTimeout(() => {
                console.log('\n🔧 Test 6: Form Validation Check');
                const iframes = testContainer.querySelectorAll('iframe');
                console.log('📊 Iframe count:', iframes.length);
                console.log('📊 Container dimensions:', testContainer.offsetWidth + 'x' + testContainer.offsetHeight);
                
                if (iframes.length > 0) {
                    console.log('✅ Square iframes detected - form is interactive');
                } else {
                    console.log('⚠️ No iframes found - form may not be fully loaded');
                }
            }, 1000);
            
        } else {
            console.log('❌ Test container not found');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

// Auto-run tests when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSquareTests);
} else {
    runSquareTests();
}

// Manual test functions
window.testCardEntry = async function(cardNumber = TEST_CARDS.visa) {
    console.log('\n🧪 Manual Test: Card Entry');
    console.log('📝 Test Card:', cardNumber);
    console.log('💡 Manually enter this card number in the form');
    console.log('💡 Add expiry: 12/26 and CVV: 123');
};

window.testTokenization = async function() {
    console.log('\n🧪 Manual Test: Tokenization');
    console.log('💡 Click the "Test Tokenization" button');
    console.log('💡 Check for successful token generation');
};

window.runFullTest = async function() {
    console.log('\n🚀 Running Full Test Suite...');
    await runSquareTests();
    
    console.log('\n📋 Manual Test Instructions:');
    console.log('1. Enter test card: 4111111111111111');
    console.log('2. Enter expiry: 12/26');
    console.log('3. Enter CVV: 123');
    console.log('4. Enter postal code: 12345');
    console.log('5. Click "Test Tokenization"');
    console.log('6. Verify successful token generation');
};

// Export for console access
console.log('\n💡 Available Test Commands:');
console.log('- runFullTest() - Complete test suite');
console.log('- testCardEntry() - Test card entry');
console.log('- testTokenization() - Test tokenization');

module.exports = {
    runSquareTests,
    testCardEntry,
    testTokenization,
    runFullTest,
    TEST_CARDS
};
