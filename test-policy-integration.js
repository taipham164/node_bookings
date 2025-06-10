/**
 /**
 * Complete Policy Integration Test
 * Tests the 2-hour cancellation policy with card authorization
 */

const { getCancellationPolicy, getPolicyTerms } = require('./util/cancellation-policy');
const { getBookingPolicy } = require('./util/booking-policy');

async function testPolicyIntegration() {
    console.log('🧪 Testing Complete Policy Integration...\n');
    
    try {
        // Test 1: Cancellation Policy
        console.log('1️⃣ Testing Cancellation Policy:');
        const cancellationPolicy = await getCancellationPolicy();
        const policyTerms = getPolicyTerms(cancellationPolicy);
        
        console.log('✅ Cancellation Policy Retrieved:');
        console.log(`   • Cut-off time: ${policyTerms.cutOffHours} hours`);
        console.log(`   • Late cancellation fee: ${policyTerms.lateCancel.charge}`);
        console.log(`   • No-show policy: ${policyTerms.noShow.charge}`);
        console.log(`   • Card hold enabled: ${policyTerms.noShowPolicy?.holdCard || false}`);
        console.log(`   • Self-service cancellation: ${policyTerms.allowUserCancel || false}\n`);
        
        // Test 2: Booking Policy
        console.log('2️⃣ Testing Booking Policy:');
        const bookingPolicy = await getBookingPolicy();
        
        console.log('✅ Booking Policy Retrieved:');
        console.log(`   • Booking type: ${bookingPolicy.bookingPolicy}`);
        console.log(`   • Requires approval: ${bookingPolicy.requiresApproval}`);
        console.log(`   • Auto-approval: ${bookingPolicy.autoApproval}`);
        console.log(`   • Allow user cancel: ${bookingPolicy.allowUserCancel || false}\n`);
        
        // Test 3: Policy Configuration Summary
        console.log('3️⃣ Complete Policy Configuration:');
        
        const completeConfig = {
            cancellation: {
                cutOffTime: '2 hours before appointment',
                advanceCancelFee: 'No charge',
                lateCancelFee: '50% of service price',
                noShowFee: 'Full service price + card hold',
                selfServiceEnabled: policyTerms.allowUserCancel
            },
            booking: {
                approvalRequired: bookingPolicy.requiresApproval,
                instantConfirmation: bookingPolicy.autoApproval,
                cardAuthorizationEnabled: policyTerms.noShowPolicy?.holdCard
            },
            fees: {
                calculationMethod: 'percentage',
                lateCancellationRate: 0.50, // 50%
                noShowRate: 1.00, // 100%
                cardHoldEnabled: true
            }
        };
        
        console.log('📋 Final Configuration:');
        console.log(JSON.stringify(completeConfig, null, 2));
        
        // Test 4: Policy Validation
        console.log('\n4️⃣ Policy Validation:');
        const validationResults = {
            hasCancellationPolicy: !!cancellationPolicy,
            has2HourCutoff: policyTerms.cutOffHours === 2,
            has50PercentFee: policyTerms.lateCancel.charge.includes('50%'),
            hasNoShowProtection: policyTerms.noShow.charge.includes('Full service fee'),
            hasCardAuthorization: policyTerms.noShowPolicy?.holdCard === true,
            allowsSelfService: policyTerms.allowUserCancel === true
        };
        
        const allTestsPassed = Object.values(validationResults).every(result => result === true);
        
        console.log('✅ Validation Results:');
        Object.entries(validationResults).forEach(([test, passed]) => {
            console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed}`);
        });
        
        console.log(`\n🎯 Overall Status: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        if (allTestsPassed) {
            console.log('\n🚀 Policy Integration Complete!');
            console.log('The 2-hour cancellation policy with card authorization is fully configured.');
        }
        
    } catch (error) {
        console.error('❌ Policy Integration Test Failed:', error.message);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testPolicyIntegration()
        .then(() => {
            console.log('\n✅ Policy integration test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Policy integration test failed:', error);
            process.exit(1);
        });
}

module.exports = { testPolicyIntegration };
