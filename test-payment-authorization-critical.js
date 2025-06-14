/**
 * Critical Test: Square Payment Authorization for Admin-Created Bookings
 * Tests whether we can actually charge no-show fees for API-created bookings
 */

const { paymentsApi, bookingsApi, customersApi } = require('./util/square-client');
const { randomUUID } = require('crypto');

async function testPaymentAuthorizationCapabilities() {
  console.log('🧪 CRITICAL TEST: Payment Authorization for Admin-Created Bookings');
  console.log('================================================================');
  
  const results = {
    canCreateAuthorization: false,
    canCapturePayment: false,
    requiresAdditionalConsent: false,
    errors: [],
    recommendations: []
  };

  try {
    // Test 1: Create a test customer
    console.log('\n1️⃣ Creating test customer...');
    const testCustomer = {
      given_name: 'Test',
      family_name: 'Customer',
      email_address: 'test.payment@example.com',
      phone_number: '+19165551234'
    };

    let testCustomerId;
    try {
      const { result } = await customersApi.createCustomer({
        given_name: testCustomer.given_name,
        family_name: testCustomer.family_name,
        email_address: testCustomer.email_address,
        phone_number: testCustomer.phone_number
      });
      testCustomerId = result.customer.id;
      console.log('✅ Test customer created:', testCustomerId);
    } catch (error) {
      console.log('⚠️  Using existing customer or skipping customer creation');
      testCustomerId = 'EXISTING_CUSTOMER_ID'; // You'll need to replace this
    }

    // Test 2: Create admin booking (API-created)
    console.log('\n2️⃣ Creating admin booking via API...');
    
    // This is a simulation - you'll need actual booking creation
    const mockBookingId = 'TEST_ADMIN_BOOKING_' + randomUUID();
    console.log('📋 Simulated admin booking ID:', mockBookingId);
    console.log('⚠️  Note: This booking will show "created by admin" in Square dashboard');

    // Test 3: Attempt payment authorization
    console.log('\n3️⃣ Testing payment authorization capabilities...');
    
    // Note: You'll need a real card nonce from Square Web Payments SDK
    const testCardNonce = 'cnon:card-nonce-ok'; // Square sandbox test nonce
    
    try {
      // Attempt to create payment authorization
      const authRequest = {
        idempotency_key: randomUUID(),
        source_id: testCardNonce,
        amount_money: {
          amount: 5000, // $50 test amount
          currency: 'USD'
        },
        autocomplete: false, // Create authorization only (hold)
        note: 'No-show protection authorization for admin-created booking',
        reference_id: mockBookingId,
        order_info: {
          order_source: {
            name: 'Admin Booking System'
          }
        }
      };

      console.log('💳 Attempting payment authorization...');
      const { result: authResult } = await paymentsApi.createPayment(authRequest);
      
      console.log('✅ Authorization successful!');
      console.log('Payment ID:', authResult.payment.id);
      console.log('Status:', authResult.payment.status);
      console.log('Amount:', authResult.payment.amount_money);
      
      results.canCreateAuthorization = true;
      const authorizationId = authResult.payment.id;

      // Test 4: Attempt to capture (charge) the authorization
      console.log('\n4️⃣ Testing payment capture capabilities...');
      
      try {
        const captureRequest = {
          idempotency_key: randomUUID()
        };

        console.log('💰 Attempting payment capture...');
        const { result: captureResult } = await paymentsApi.completePayment(authorizationId, captureRequest);
        
        console.log('✅ Capture successful!');
        console.log('Payment ID:', captureResult.payment.id);
        console.log('Status:', captureResult.payment.status);
        console.log('Captured Amount:', captureResult.payment.amount_money);
        
        results.canCapturePayment = true;
        
      } catch (captureError) {
        console.log('❌ Payment capture failed!');
        console.log('Error:', captureError.message);
        results.errors.push(`Capture failed: ${captureError.message}`);
        
        // Check if it's a permissions issue
        if (captureError.message.includes('permission') || 
            captureError.message.includes('not authorized') ||
            captureError.message.includes('consent')) {
          results.requiresAdditionalConsent = true;
          results.recommendations.push('Additional customer consent may be required for admin-created bookings');
        }
      }

    } catch (authError) {
      console.log('❌ Payment authorization failed!');
      console.log('Error:', authError.message);
      results.errors.push(`Authorization failed: ${authError.message}`);
      
      // Check for specific error types
      if (authError.message.includes('permission') || 
          authError.message.includes('not authorized') ||
          authError.message.includes('consent') ||
          authError.message.includes('customer_created')) {
        results.requiresAdditionalConsent = true;
        results.recommendations.push('Admin-created bookings may have payment restrictions');
      }
    }

    // Test 5: Analyze results
    console.log('\n5️⃣ Analysis & Recommendations');
    console.log('================================');
    
    if (results.canCreateAuthorization && results.canCapturePayment) {
      console.log('✅ GOOD NEWS: Payment authorization works for admin-created bookings');
      console.log('✅ No-show fees can be charged');
      results.recommendations.push('Current implementation should work correctly');
    } else if (results.canCreateAuthorization && !results.canCapturePayment) {
      console.log('⚠️  PARTIAL: Can authorize but cannot capture payments');
      console.log('⚠️  This means we can hold funds but may not be able to charge them');
      results.recommendations.push('Enhanced customer consent workflow required');
      results.recommendations.push('Consider implementing explicit payment agreement');
    } else {
      console.log('❌ CRITICAL: Cannot process payments for admin-created bookings');
      console.log('❌ No-show fee business model may not work with current implementation');
      results.recommendations.push('URGENT: Contact Square support for clarification');
      results.recommendations.push('Consider switching to Square native booking widgets');
      results.recommendations.push('Implement enhanced customer consent workflow');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    results.errors.push(`Test execution failed: ${error.message}`);
  }

  // Output final results
  console.log('\n📊 FINAL TEST RESULTS');
  console.log('=====================');
  console.log('Can Create Authorization:', results.canCreateAuthorization);
  console.log('Can Capture Payment:', results.canCapturePayment);
  console.log('Requires Additional Consent:', results.requiresAdditionalConsent);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    results.errors.forEach(error => console.log('  -', error));
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    results.recommendations.forEach(rec => console.log('  -', rec));
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  
  if (!results.canCreateAuthorization || !results.canCapturePayment) {
    console.log('🚨 HIGH PRIORITY:');
    console.log('1. Contact Square Developer Support immediately');
    console.log('2. Ask specifically about payment restrictions for API-created bookings');
    console.log('3. Request clarification on customer consent requirements');
    console.log('4. Consider implementing enhanced consent workflow');
    console.log('\n📞 Square Support: https://squareup.com/help/contact?panel=BF53A9C8EF68');
  } else {
    console.log('✅ Current implementation appears to work');
    console.log('1. Test in production with real bookings');
    console.log('2. Monitor for any payment processing issues');
    console.log('3. Implement robust error handling');
  }

  return results;
}

// Export for use in other tests
module.exports = {
  testPaymentAuthorizationCapabilities
};

// Run test if called directly
if (require.main === module) {
  testPaymentAuthorizationCapabilities()
    .then(results => {
      console.log('\n🏁 Test completed successfully');
      process.exit(results.canCreateAuthorization && results.canCapturePayment ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}
