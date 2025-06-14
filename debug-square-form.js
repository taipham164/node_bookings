/**
 * Debug Square Payment Form Issue
 * Testing why card fields aren't showing up properly
 */

require('dotenv').config();

console.log('🔍 Debugging Square Payment Form Issue');
console.log('='.repeat(50));

console.log('\n📋 Current Configuration:');
console.log('Environment:', process.env.ENVIRONMENT);
console.log('SQ_APPLICATION_ID:', process.env.SQ_APPLICATION_ID);
console.log('SQ_LOCATION_ID:', process.env.SQ_LOCATION_ID);

// Check if Application ID format is correct
const appId = process.env.SQ_APPLICATION_ID;
if (appId) {
    console.log('\n🔧 Application ID Analysis:');
    console.log('Format:', appId.startsWith('sq0idp-') ? 'Production ✅' : 'Unknown format ❌');
    console.log('Length:', appId.length, 'characters');
    console.log('Preview:', appId.substring(0, 15) + '...');
}

// Environment check
const env = process.env.ENVIRONMENT;
if (env === 'production' && appId && appId.startsWith('sq0idp-')) {
    console.log('\n✅ Configuration looks correct for production');
} else if (env === 'sandbox' && appId && appId.startsWith('sandbox-sq0idp-')) {
    console.log('\n✅ Configuration looks correct for sandbox');
} else {
    console.log('\n⚠️  Configuration mismatch detected!');
    console.log('Environment:', env);
    console.log('App ID starts with:', appId ? appId.substring(0, 10) : 'Not set');
}

console.log('\n🧪 Common Issues & Solutions:');
console.log('1. Application ID mismatch with environment');
console.log('2. Square SDK script not loading properly');
console.log('3. DOM element not found when SDK tries to attach');
console.log('4. Network issues preventing SDK initialization');
console.log('5. Invalid Application ID or Location ID');

console.log('\n🔧 Debug Steps to Try:');
console.log('1. Open browser dev tools and check console for errors');
console.log('2. Verify Square SDK script is loading');
console.log('3. Check if #existing-card-element exists in DOM');
console.log('4. Test with simple HTML page first');

console.log('\n📝 Browser Console Commands to Test:');
console.log('typeof window.Square');
console.log('document.getElementById("existing-card-element")');
console.log('window.Square.payments("' + appId + '", "' + process.env.SQ_LOCATION_ID + '")');
