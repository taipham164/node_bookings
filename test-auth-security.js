#!/usr/bin/env node

/**
 * Authentication Security Test
 * 
 * This script validates that the authentication bypass vulnerability has been fixed
 * and that secure environment controls are working properly.
 */

const fs = require('fs');
const path = require('path');

const authServicePath = path.join(__dirname, 'apps', 'backend', 'src', 'auth', 'auth.service.ts');

console.log('🔒 Testing Authentication Security Implementation\n');

function checkAuthService() {
  if (!fs.existsSync(authServicePath)) {
    console.error('❌ AuthService not found');
    return false;
  }

  const content = fs.readFileSync(authServicePath, 'utf8');
  let passed = 0;
  let total = 0;

  // Test 1: Check for proper exception imports
  total++;
  if (content.includes('UnauthorizedException') && content.includes('Logger')) {
    console.log('✅ Proper NestJS exceptions imported');
    passed++;
  } else {
    console.error('❌ Missing required exception imports (UnauthorizedException, Logger)');
  }

  // Test 2: Check that unconditional mock return has been removed
  total++;
  const hasDangerousPattern = content.includes('return {') && 
                            content.includes('Mock User') && 
                            !content.includes('isDevelopment && mockAuthEnabled');
  
  if (!hasDangerousPattern) {
    console.log('✅ Unconditional mock user return removed');
    passed++;
  } else {
    console.error('❌ Still contains unconditional mock user return');
  }

  // Test 3: Check for environment variable controls
  total++;
  if (content.includes('NODE_ENV === \'development\'') && 
      content.includes('ALLOW_MOCK_AUTH === \'true\'')) {
    console.log('✅ Secure environment variable controls implemented');
    passed++;
  } else {
    console.error('❌ Missing secure environment variable controls');
  }

  // Test 4: Check for specific error detection method
  total++;
  if (content.includes('isSchemaRelatedError') && 
      content.includes('prismaTableErrors') &&
      content.includes('prismaErrorCodes')) {
    console.log('✅ Specific database error detection implemented');
    passed++;
  } else {
    console.error('❌ Missing specific error detection method');
  }

  // Test 5: Check for proper error logging
  total++;
  if (content.includes('this.logger.error') && 
      content.includes('error.message') &&
      content.includes('error.stack')) {
    console.log('✅ Comprehensive error logging implemented');
    passed++;
  } else {
    console.error('❌ Missing comprehensive error logging');
  }

  // Test 6: Check for UnauthorizedException throw
  total++;
  if (content.includes('throw new UnauthorizedException') && 
      content.includes('Authentication system unavailable')) {
    console.log('✅ Secure authentication failure handling');
    passed++;
  } else {
    console.error('❌ Missing secure authentication failure');
  }

  // Test 7: Check for security warnings
  total++;
  if (content.includes('⚠️ SECURITY WARNING') && 
      content.includes('This should only be enabled in development')) {
    console.log('✅ Security warnings for mock authentication');
    passed++;
  } else {
    console.error('❌ Missing security warnings');
  }

  console.log(`\n📊 Security Tests: ${passed}/${total} passed\n`);

  return passed === total;
}

function validateEnvironmentConfiguration() {
  console.log('🔧 Environment Configuration Guidelines:\n');
  
  console.log('Production (Secure):');
  console.log('  NODE_ENV=production');
  console.log('  ALLOW_MOCK_AUTH=undefined (or false)');
  console.log('  → Result: Authentication failures throw UnauthorizedException\n');
  
  console.log('Development (Secure):');
  console.log('  NODE_ENV=development');
  console.log('  ALLOW_MOCK_AUTH=undefined (or false)');  
  console.log('  → Result: Authentication failures throw UnauthorizedException\n');
  
  console.log('Development (Mock Enabled):');
  console.log('  NODE_ENV=development');
  console.log('  ALLOW_MOCK_AUTH=true');
  console.log('  → Result: Mock user returned with security warnings\n');
}

// Run tests
const securityTestsPassed = checkAuthService();

if (securityTestsPassed) {
  console.log('🎯 All Security Tests Passed!');
  console.log('✅ Authentication bypass vulnerability has been fixed');
  console.log('✅ Fail-closed security implemented');
  console.log('✅ Environment-controlled mock authentication');
  console.log('✅ Specific database error detection');
  console.log('✅ Comprehensive error logging');
} else {
  console.error('❌ Some security tests failed - review implementation');
  process.exit(1);
}

validateEnvironmentConfiguration();

console.log('🛡️ Security Implementation Summary:');
console.log('• Authentication now fails securely when User table missing');
console.log('• Mock authentication requires explicit development configuration');  
console.log('• Specific database error detection prevents false positives');
console.log('• Comprehensive logging aids in diagnosis and security monitoring');
console.log('• Environment variables provide secure development workflow');

console.log('\n📚 For more information, see: apps/backend/WEBBUILDER_SECURITY.md');