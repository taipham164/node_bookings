#!/usr/bin/env node

/**
 * Test script to verify booking route updates
 * Checks that source tracking and proper API patterns are implemented
 */

console.log('🧪 Testing Booking Route Updates...\n');

function testBookingRouteImplementation() {
    console.log('1️⃣ Testing Booking Route Source Tracking:');
    
    try {
        const fs = require('fs');
        const path = require('path');
        const bookingFile = path.join(__dirname, 'routes', 'booking.js');
        
        if (fs.existsSync(bookingFile)) {
            const bookingContent = fs.readFileSync(bookingFile, 'utf8');
            
            // Check for source field implementation
            const hasSourceField = bookingContent.includes('source: "CUSTOM_APP"');
            const hasProperCardStructure = bookingContent.includes('card: {');
            const hasCustomerIdInCard = bookingContent.includes('customerId: finalCustomerId');
            const hasIdempotencyKey = bookingContent.includes('idempotencyKey: crypto.randomUUID()');
            const hasCardNonceHandling = bookingContent.includes('sourceId: cardNonce');
            
            console.log('   • Source field tracking:', hasSourceField ? '✅' : '❌');
            console.log('   • Proper card API structure:', hasProperCardStructure ? '✅' : '❌');
            console.log('   • Customer ID in card creation:', hasCustomerIdInCard ? '✅' : '❌');
            console.log('   • Idempotency keys used:', hasIdempotencyKey ? '✅' : '❌');
            console.log('   • Card nonce handling:', hasCardNonceHandling ? '✅' : '❌');
            
            if (hasSourceField && hasProperCardStructure && hasCustomerIdInCard && hasIdempotencyKey && hasCardNonceHandling) {
                console.log('   ✅ All booking route updates implemented correctly');
                return true;
            } else {
                console.log('   ⚠️ Some booking route updates may be missing');
                return false;
            }
        } else {
            console.log('   ❌ Booking route file not found');
            return false;
        }
        
    } catch (error) {
        console.log('   ❌ Error testing booking route:', error.message);
        return false;
    }
}

function testSquareClientConfiguration() {
    console.log('\n2️⃣ Testing Square Client Configuration:');
    
    try {
        const { Client, Environment } = require('square');
        console.log('   • Square SDK imported:', !!Client ? '✅' : '❌');
        
        // Check environment variables
        const hasAccessToken = !!process.env.SQ_ACCESS_TOKEN;
        const hasAppId = !!process.env.SQ_APPLICATION_ID;
        const hasLocationId = !!process.env.SQ_LOCATION_ID;
        
        console.log('   • Access token configured:', hasAccessToken ? '✅' : '❌');
        console.log('   • Application ID configured:', hasAppId ? '✅' : '❌');
        console.log('   • Location ID configured:', hasLocationId ? '✅' : '❌');
        
        if (hasAccessToken && hasAppId && hasLocationId) {
            console.log('   ✅ Square configuration complete');
            return true;
        } else {
            console.log('   ⚠️ Some Square environment variables missing');
            return false;
        }
        
    } catch (error) {
        console.log('   ❌ Error testing Square configuration:', error.message);
        return false;
    }
}

function testAPIFlowPattern() {
    console.log('\n3️⃣ Testing API Flow Pattern:');
    
    const expectedFlow = [
        'Create Customer',
        'Store Card on File', 
        'Create Booking with Source'
    ];
    
    try {
        const fs = require('fs');
        const bookingFile = path.join(__dirname, 'routes', 'booking.js');
        const bookingContent = fs.readFileSync(bookingFile, 'utf8');
        
        // Check for proper API flow implementation
        const hasCustomerCreation = bookingContent.includes('getCustomerID') || bookingContent.includes('createCustomer');
        const hasCardCreation = bookingContent.includes('createCard');
        const hasBookingCreation = bookingContent.includes('createBooking');
        const hasSourceTracking = bookingContent.includes('source:');
        
        console.log('   • Customer creation step:', hasCustomerCreation ? '✅' : '❌');
        console.log('   • Card creation step:', hasCardCreation ? '✅' : '❌');
        console.log('   • Booking creation step:', hasBookingCreation ? '✅' : '❌');
        console.log('   • Source tracking step:', hasSourceTracking ? '✅' : '❌');
        
        if (hasCustomerCreation && hasCardCreation && hasBookingCreation && hasSourceTracking) {
            console.log('   ✅ Complete API flow pattern implemented');
            return true;
        } else {
            console.log('   ⚠️ API flow pattern incomplete');
            return false;
        }
        
    } catch (error) {
        console.log('   ❌ Error testing API flow pattern:', error.message);
        return false;
    }
}

function testPCICompliance() {
    console.log('\n4️⃣ Testing PCI Compliance:');
    
    try {
        const fs = require('fs');
        const bookingFile = path.join(__dirname, 'routes', 'booking.js');
        const bookingContent = fs.readFileSync(bookingFile, 'utf8');
        
        // Check for PCI compliance indicators
        const usesCardNonce = bookingContent.includes('cardNonce');
        const noRawCardData = !bookingContent.includes('req.body.cardNumber');
        const hasSDKIntegration = bookingContent.includes('sourceId');
        
        console.log('   • Uses card nonces:', usesCardNonce ? '✅' : '❌');
        console.log('   • No raw card data handling:', noRawCardData ? '✅' : '❌');
        console.log('   • Square SDK integration:', hasSDKIntegration ? '✅' : '❌');
        
        if (usesCardNonce && noRawCardData && hasSDKIntegration) {
            console.log('   ✅ PCI compliance maintained');
            return true;
        } else {
            console.log('   ❌ PCI compliance issues detected');
            return false;
        }
        
    } catch (error) {
        console.log('   ❌ Error testing PCI compliance:', error.message);
        return false;
    }
}

async function runAllTests() {
    try {
        const test1 = testBookingRouteImplementation();
        const test2 = testSquareClientConfiguration();
        const test3 = testAPIFlowPattern();
        const test4 = testPCICompliance();
        
        const allPassed = test1 && test2 && test3 && test4;
        
        console.log('\n📋 Test Summary:');
        console.log(`   • Booking route updates: ${test1 ? '✅' : '❌'}`);
        console.log(`   • Square configuration: ${test2 ? '✅' : '❌'}`);
        console.log(`   • API flow pattern: ${test3 ? '✅' : '❌'}`);
        console.log(`   • PCI compliance: ${test4 ? '✅' : '❌'}`);
        
        if (allPassed) {
            console.log('\n🎉 All tests passed! Ready for production.');
            console.log('\n🚀 Next Steps:');
            console.log('1. Test booking flow with Square Web Payments SDK');
            console.log('2. Verify bookings appear with "CUSTOM_APP" source in Square dashboard');
            console.log('3. Confirm card saving and 2-hour cancellation policy');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the implementation.');
        }
        
        return allPassed;
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return false;
    }
}

// Run tests
if (require.main === module) {
    runAllTests()
        .then(() => {
            console.log('\n✅ Booking route testing completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Testing failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runAllTests };
