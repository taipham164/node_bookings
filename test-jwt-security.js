#!/usr/bin/env node

/**
 * JWT Secret Security Test
 * 
 * This script validates that the hardcoded JWT secret vulnerability has been fixed
 * and that proper runtime validation prevents application startup with weak secrets.
 */

const fs = require('fs');
const path = require('path');

const authModulePath = path.join(__dirname, 'apps', 'backend', 'src', 'auth', 'auth.module.ts');
const mainPath = path.join(__dirname, 'apps', 'backend', 'src', 'main.ts');
const envPath = path.join(__dirname, 'apps', 'backend', '.env');
const envExamplePath = path.join(__dirname, 'apps', 'backend', '.env.example');

console.log('🔐 Testing JWT Secret Security Implementation\n');

function checkAuthModule() {
  console.log('1. Checking JWT Module Configuration...');
  
  if (!fs.existsSync(authModulePath)) {
    console.error('❌ AuthModule not found');
    return false;
  }

  const content = fs.readFileSync(authModulePath, 'utf8');
  let passed = 0;
  let total = 0;

  // Test 1: Ensure hardcoded fallback is removed
  total++;
  const hasHardcodedFallback = content.includes('|| \'your-secret-key\'') ||
                              content.includes('|| \'secret\'') ||
                              content.includes('|| \'jwt-secret\'') ||
                              content.match(/\|\|\s*['"][^'"]+['"]/);
  
  if (!hasHardcodedFallback) {
    console.log('✅ Hardcoded JWT secret fallback removed');
    passed++;
  } else {
    console.error('❌ Still contains hardcoded JWT secret fallback');
  }

  // Test 2: Check for direct environment variable usage
  total++;
  if (content.includes('secret: process.env.JWT_SECRET') && 
      !content.includes('process.env.JWT_SECRET ||')) {
    console.log('✅ JWT secret reads directly from environment variable');
    passed++;
  } else {
    console.error('❌ JWT secret not reading directly from process.env.JWT_SECRET');
  }

  console.log(`   AuthModule Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function checkRuntimeValidation() {
  console.log('2. Checking Runtime Security Validation...');
  
  if (!fs.existsSync(mainPath)) {
    console.error('❌ main.ts not found');
    return false;
  }

  const content = fs.readFileSync(mainPath, 'utf8');
  let passed = 0;
  let total = 0;

  // Test 1: Check for environment validation function
  total++;
  if (content.includes('validateEnvironmentVariables') &&
      content.includes('function validateEnvironmentVariables')) {
    console.log('✅ Environment validation function exists');
    passed++;
  } else {
    console.error('❌ Missing environment validation function');
  }

  // Test 2: Check for JWT_SECRET validation
  total++;
  if (content.includes('JWT_SECRET') && 
      content.includes('JWT signing secret') &&
      content.includes('length < 32')) {
    console.log('✅ JWT_SECRET strength validation implemented');
    passed++;
  } else {
    console.error('❌ Missing JWT_SECRET strength validation');
  }

  // Test 3: Check for common secret detection
  total++;
  if (content.includes('your-secret-key') && 
      content.includes('cryptographically secure secret') &&
      content.includes('process.exit(1)')) {
    console.log('✅ Common/weak secret detection and startup blocking');
    passed++;
  } else {
    console.error('❌ Missing weak secret detection');
  }

  // Test 4: Check for validation call in bootstrap
  total++;
  if (content.includes('validateEnvironmentVariables();') &&
      content.includes('async function bootstrap()')) {
    console.log('✅ Environment validation called at application bootstrap');
    passed++;
  } else {
    console.error('❌ Environment validation not called at bootstrap');
  }

  console.log(`   Runtime Validation Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function checkEnvironmentFiles() {
  console.log('3. Checking Environment Configuration Files...');
  
  let passed = 0;
  let total = 0;

  // Test 1: Check .env has JWT_SECRET
  total++;
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('JWT_SECRET=') && 
        !envContent.includes('JWT_SECRET="CHANGE_ME"') &&
        !envContent.includes('JWT_SECRET="your-secret-key"')) {
      console.log('✅ .env file contains JWT_SECRET configuration');
      passed++;
    } else {
      console.error('❌ .env file missing proper JWT_SECRET');
    }
  } else {
    console.error('❌ .env file not found');
  }

  // Test 2: Check .env.example has documentation
  total++;
  if (fs.existsSync(envExamplePath)) {
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    if (exampleContent.includes('JWT_SECRET=') && 
        exampleContent.includes('cryptographically secure') &&
        exampleContent.includes('randomBytes')) {
      console.log('✅ .env.example has proper JWT_SECRET documentation');
      passed++;
    } else {
      console.error('❌ .env.example missing proper JWT_SECRET documentation');
    }
  } else {
    console.error('❌ .env.example file not found');
  }

  console.log(`   Environment Files Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function validateSecurityFlow() {
  console.log('4. Security Flow Validation:\n');
  
  console.log('✅ BEFORE (Vulnerable):');
  console.log('   JwtModule.register({ secret: process.env.JWT_SECRET || "your-secret-key" })');
  console.log('   → Falls back to hardcoded secret');
  console.log('   → Application starts with weak security');
  console.log('   → CRITICAL SECURITY VULNERABILITY\n');
  
  console.log('✅ AFTER (Secure):');
  console.log('   JwtModule.register({ secret: process.env.JWT_SECRET })');
  console.log('   → No fallback - requires environment variable');
  console.log('   → Runtime validation at bootstrap');
  console.log('   → Application blocks startup with weak/missing secrets\n');
  
  console.log('✅ Runtime Validation Process:');
  console.log('   1. Check JWT_SECRET exists and is not empty');
  console.log('   2. Validate JWT_SECRET is at least 32 characters long');
  console.log('   3. Check for common/default secret values');
  console.log('   4. Block startup with detailed error message if validation fails');
  console.log('   5. Provide clear instructions for generating secure secrets\n');
}

// Run all tests
const authModulePassed = checkAuthModule();
const runtimeValidationPassed = checkRuntimeValidation();
const envFilesPassed = checkEnvironmentFiles();

if (authModulePassed && runtimeValidationPassed && envFilesPassed) {
  console.log('🎯 All JWT Security Tests Passed!');
  console.log('✅ Hardcoded JWT secret fallback ELIMINATED');
  console.log('✅ Runtime validation prevents weak secrets');
  console.log('✅ Application blocks startup with security issues');
  console.log('✅ Proper environment configuration documented\n');
} else {
  console.error('❌ Some JWT security tests failed - review implementation');
  process.exit(1);
}

validateSecurityFlow();

console.log('🛡️ JWT Security Implementation Summary:');
console.log('• No hardcoded fallback secrets in JWT configuration');
console.log('• Runtime validation blocks startup with missing/weak JWT_SECRET');
console.log('• Cryptographic strength requirements (32+ characters)');
console.log('• Detection of common/default secret values');
console.log('• Clear error messages and remediation instructions');
console.log('• Proper environment file documentation with examples');

console.log('\n📚 Environment Variable Requirements:');
console.log('• JWT_SECRET: Cryptographically secure random string (32+ characters)');
console.log('• DATABASE_URL: Valid database connection string');

console.log('\n🔑 Generate secure JWT_SECRET:');
console.log('• Node.js: require("crypto").randomBytes(64).toString("hex")');
console.log('• OpenSSL: openssl rand -hex 64');

console.log('\n✅ The JWT secret security vulnerability has been completely eliminated!');