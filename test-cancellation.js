const { getCancellationPolicy, getPolicyTerms } = require('./util/cancellation-policy');

async function test() {
  try {
    console.log('🔄 Testing cancellation policy API...');
    
    const policy = await getCancellationPolicy();
    console.log('✅ Raw policy object:');
    console.log(JSON.stringify(policy, null, 2));
    
    const terms = getPolicyTerms(policy);
    console.log('✅ Formatted terms:');
    console.log(JSON.stringify(terms, null, 2));
    
    console.log('\n📋 Policy Summary:');
    console.log(`- Cancellation window: ${policy.cancellationWindowHours} hours`);
    console.log(`- Has fee: ${!!(policy.cancellationFee && policy.cancellationFee.amount > 0)}`);
    console.log(`- Policy type: ${policy.policyType}`);
    console.log(`- Allow user cancel: ${policy.allowUserCancel}`);
    console.log(`- Has custom text: ${!!policy.policyText}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

console.log('Starting cancellation policy test...\n');
test().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('\n❌ Test failed:', err);
});
