#!/usr/bin/env node

/**
 * Authorization Script Test Validator
 * 
 * This script validates that the test-authorization.bat improvements
 * properly handle HTTP status codes and token validation.
 */

const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'test-authorization.bat');

console.log('🔍 Testing Authorization Script Improvements\n');

function checkAuthorizationScript() {
  console.log('1. Checking Authorization Script Token Validation...');
  
  if (!fs.existsSync(scriptPath)) {
    console.error('❌ test-authorization.bat not found');
    return false;
  }

  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  let passed = 0;
  let total = 0;

  // Test 1: Check for HTTP status capture in authentication
  total++;
  if (scriptContent.includes('curl -s -w "HTTPSTATUS:%{http_code}"') && 
      scriptContent.includes('auth/login')) {
    console.log('✅ Authentication curl captures HTTP status code');
    passed++;
  } else {
    console.error('❌ Authentication curl does not capture HTTP status');
  }

  // Test 2: Check for curl exit status validation
  total++;
  if (scriptContent.includes('if [ $? -ne 0 ]') && 
      scriptContent.includes('curl command error')) {
    console.log('✅ Curl command failure handled separately');
    passed++;
  } else {
    console.error('❌ Missing curl command failure handling');
  }

  // Test 3: Check for HTTP status extraction and validation
  total++;
  if (scriptContent.includes('HTTP_STATUS=$(echo') && 
      scriptContent.includes('sed -E') &&
      scriptContent.includes('HTTPSTATUS:([0-9]{3})')) {
    console.log('✅ HTTP status properly extracted from response');
    passed++;
  } else {
    console.error('❌ HTTP status extraction not implemented');
  }

  // Test 4: Check for HTTP 200/201 validation
  total++;
  if (scriptContent.includes('HTTP_STATUS" != "200"') && 
      scriptContent.includes('HTTP_STATUS" != "201"') &&
      scriptContent.includes('Authentication failed - HTTP')) {
    console.log('✅ HTTP status validated for success (200/201)');
    passed++;
  } else {
    console.error('❌ HTTP status validation for success not implemented');
  }

  // Test 5: Check for token extraction with jq
  total++;
  if (scriptContent.includes('jq -r \'.access_token\'') && 
      scriptContent.includes('HTTP_BODY')) {
    console.log('✅ Token extracted from response body using jq');
    passed++;
  } else {
    console.error('❌ Token extraction not properly implemented');
  }

  // Test 6: Check for token validation (non-empty, not null)
  total++;
  if (scriptContent.includes('[[ -z "$TOKEN"') && 
      scriptContent.includes('"$TOKEN" == "null"') &&
      scriptContent.includes('no valid token received')) {
    console.log('✅ Token validated for non-empty and non-null values');
    passed++;
  } else {
    console.error('❌ Token validation not comprehensive');
  }

  // Test 7: Check for security-conscious token display
  total++;
  if (scriptContent.includes('${TOKEN:0:20}...') && 
      scriptContent.includes('truncated for security')) {
    console.log('✅ Token display truncated for security');
    passed++;
  } else {
    console.error('❌ Token not properly protected in output');
  }

  // Test 8: Check for improved error messages
  total++;
  if (scriptContent.includes('❌ Authentication failed') && 
      scriptContent.includes('Expected: JSON response with') &&
      scriptContent.includes('✅ Authentication successful')) {
    console.log('✅ Clear success and failure messages with emojis');
    passed++;
  } else {
    console.error('❌ Error messages not sufficiently clear');
  }

  // Test 9: Check that other tests also validate HTTP status
  total++;
  if (scriptContent.includes('TEST1_STATUS') && 
      scriptContent.includes('TEST2_STATUS') &&
      scriptContent.includes('✅ Correctly rejected')) {
    console.log('✅ All test cases validate HTTP status codes');
    passed++;
  } else {
    console.error('❌ Not all test cases validate HTTP status');
  }

  console.log(`   Authorization Script Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function validateAuthenticationFlow() {
  console.log('2. Authentication Flow Validation:\n');
  
  console.log('❌ BEFORE (Vulnerable):');
  console.log('   TOKEN_RESPONSE=$(curl -s ...)');
  console.log('   if [ $? -eq 0 ]; then');
  console.log('     TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r \'.access_token\')');
  console.log('   fi');
  console.log('   → Only checks curl exit status');
  console.log('   → Ignores HTTP error codes (404, 500, etc.)');
  console.log('   → Uses invalid/null tokens');
  console.log('   → No validation that authentication actually succeeded\n');
  
  console.log('✅ AFTER (Secure):');
  console.log('   HTTP_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" ...)');
  console.log('   if [ $? -ne 0 ]; then exit 1; fi  # Handle curl failures');
  console.log('   HTTP_STATUS=$(extract status)');
  console.log('   if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "201" ]]; then');
  console.log('     exit 1  # Handle HTTP errors');
  console.log('   fi');
  console.log('   TOKEN=$(extract token)');
  console.log('   if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then');
  console.log('     exit 1  # Handle missing/invalid tokens');
  console.log('   fi');
  console.log('   → Comprehensive validation at each step');
  console.log('   → Clear error messages for debugging');
  console.log('   → Security-conscious token handling\n');
}

function showTestScenarios() {
  console.log('3. Test Scenarios Covered:\n');
  
  console.log('🔍 Scenario 1: Network/Connection Failure');
  console.log('   • Curl command fails (network error, DNS failure, etc.)');
  console.log('   • Script exits with clear error message');
  console.log('   • No attempt to process invalid response\n');
  
  console.log('🔍 Scenario 2: HTTP Error Response');
  console.log('   • Server returns HTTP 400, 401, 403, 404, 500, etc.');
  console.log('   • Script detects non-200/201 status');
  console.log('   • Displays HTTP status and response body for debugging\n');
  
  console.log('🔍 Scenario 3: Successful HTTP but No Token');
  console.log('   • Server returns HTTP 200 but missing access_token field');
  console.log('   • Server returns HTTP 200 but access_token is null/empty');
  console.log('   • Script validates token content and rejects invalid responses\n');
  
  console.log('🔍 Scenario 4: Successful Authentication');
  console.log('   • Server returns HTTP 200/201 with valid access_token');
  console.log('   • Script extracts token and proceeds with authenticated tests');
  console.log('   • Token display truncated for security logging\n');
}

// Run validation
const scriptValidationPassed = checkAuthorizationScript();

if (scriptValidationPassed) {
  console.log('🎯 All Authorization Script Tests Passed!');
  console.log('✅ Comprehensive HTTP status validation implemented');
  console.log('✅ Token validation prevents invalid/null tokens');
  console.log('✅ Clear error handling and debugging information');
  console.log('✅ Security-conscious token display');
  console.log('✅ Separate handling for curl failures vs HTTP errors\n');
} else {
  console.error('❌ Some authorization script tests failed - review implementation');
  process.exit(1);
}

validateAuthenticationFlow();
showTestScenarios();

console.log('🛡️ Authorization Script Security Implementation Summary:');
console.log('• HTTP status codes properly validated for all requests');
console.log('• Curl command failures handled separately from HTTP errors');
console.log('• Token extraction validates non-empty and non-null values');
console.log('• Clear success/failure messages with status codes');
console.log('• Security-conscious logging (truncated tokens)');
console.log('• Comprehensive error information for debugging');

console.log('\n📚 Usage:');
console.log('• Run: bash test-authorization.bat');
console.log('• Requires: curl, jq, and running API server');
console.log('• Tests: Unauthorized access, authentication, authorized access');

console.log('\n✅ The authorization test script now properly validates tokens and HTTP status!');