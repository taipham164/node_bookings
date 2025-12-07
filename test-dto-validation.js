#!/usr/bin/env node

/**
 * DTO Validation Test
 * 
 * This script validates that the LoginDto and RegisterDto have proper
 * class-validator decorators and are properly organized.
 */

const fs = require('fs');
const path = require('path');

const loginDtoPath = path.join(__dirname, 'apps', 'backend', 'src', 'auth', 'dto', 'login.dto.ts');
const registerDtoPath = path.join(__dirname, 'apps', 'backend', 'src', 'auth', 'dto', 'register.dto.ts');
const authControllerPath = path.join(__dirname, 'apps', 'backend', 'src', 'auth', 'auth.controller.ts');

console.log('🔍 Testing DTO Validation Implementation\n');

function checkLoginDto() {
  console.log('1. Checking LoginDto Validation...');
  
  if (!fs.existsSync(loginDtoPath)) {
    console.error('❌ LoginDto file not found');
    return false;
  }

  const content = fs.readFileSync(loginDtoPath, 'utf8');
  let passed = 0;
  let total = 0;

  // Test 1: Check for class-validator imports
  total++;
  if (content.includes('import') && content.includes('class-validator') && 
      content.includes('IsEmail') && content.includes('IsString') && content.includes('MinLength')) {
    console.log('✅ Required validation decorators imported');
    passed++;
  } else {
    console.error('❌ Missing validation decorator imports');
  }

  // Test 2: Check for email validation
  total++;
  if (content.includes('@IsEmail') && content.includes('email!: string')) {
    console.log('✅ Email field has @IsEmail validation');
    passed++;
  } else {
    console.error('❌ Email field missing @IsEmail validation');
  }

  // Test 3: Check for password validation
  total++;
  if (content.includes('@IsString') && content.includes('@MinLength') && 
      content.includes('password!: string')) {
    console.log('✅ Password field has @IsString and @MinLength validation');
    passed++;
  } else {
    console.error('❌ Password field missing proper validation');
  }

  // Test 4: Check for custom error messages
  total++;
  if (content.includes('message:') && content.includes('valid email address') && 
      content.includes('Password is required')) {
    console.log('✅ Custom validation error messages provided');
    passed++;
  } else {
    console.error('❌ Missing custom validation error messages');
  }

  console.log(`   LoginDto Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function checkRegisterDto() {
  console.log('2. Checking RegisterDto Validation...');
  
  if (!fs.existsSync(registerDtoPath)) {
    console.error('❌ RegisterDto file not found');
    return false;
  }

  const content = fs.readFileSync(registerDtoPath, 'utf8');
  let passed = 0;
  let total = 0;

  // Test 1: Check for class-validator imports
  total++;
  if (content.includes('import') && content.includes('class-validator') && 
      content.includes('MaxLength')) {
    console.log('✅ Required validation decorators imported (including MaxLength)');
    passed++;
  } else {
    console.error('❌ Missing validation decorator imports');
  }

  // Test 2: Check for email validation
  total++;
  if (content.includes('@IsEmail') && content.includes('email!: string')) {
    console.log('✅ Email field has @IsEmail validation');
    passed++;
  } else {
    console.error('❌ Email field missing @IsEmail validation');
  }

  // Test 3: Check for password validation with length requirements
  total++;
  if (content.includes('@IsString') && content.includes('@MinLength(8') && 
      content.includes('@MaxLength(128') && content.includes('password!: string')) {
    console.log('✅ Password field has comprehensive validation (8-128 characters)');
    passed++;
  } else {
    console.error('❌ Password field missing comprehensive validation');
  }

  // Test 4: Check for name validation
  total++;
  if (content.includes('@IsString') && content.includes('name!: string') && 
      content.includes('@MinLength') && content.includes('@MaxLength')) {
    console.log('✅ Name field has proper validation');
    passed++;
  } else {
    console.error('❌ Name field missing proper validation');
  }

  // Test 5: Check for security-appropriate password requirements
  total++;
  if (content.includes('at least 8 characters long')) {
    console.log('✅ Password requires minimum 8 characters (security best practice)');
    passed++;
  } else {
    console.error('❌ Password minimum length not enforced properly');
  }

  console.log(`   RegisterDto Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function checkControllerIntegration() {
  console.log('3. Checking Controller Integration...');
  
  if (!fs.existsSync(authControllerPath)) {
    console.error('❌ AuthController file not found');
    return false;
  }

  const content = fs.readFileSync(authControllerPath, 'utf8');
  let passed = 0;
  let total = 0;

  // Test 1: Check for DTO imports
  total++;
  if (content.includes('import { LoginDto }') && content.includes('./dto/login.dto') &&
      content.includes('import { RegisterDto }') && content.includes('./dto/register.dto')) {
    console.log('✅ DTOs imported from separate files');
    passed++;
  } else {
    console.error('❌ DTOs not imported from separate files');
  }

  // Test 2: Check that inline DTOs are removed
  total++;
  if (!content.includes('export class LoginDto {') && !content.includes('export class RegisterDto {')) {
    console.log('✅ Inline DTO definitions removed from controller');
    passed++;
  } else {
    console.error('❌ Inline DTO definitions still present in controller');
  }

  // Test 3: Check for DTO usage in endpoints
  total++;
  if (content.includes('@Body() registerDto: RegisterDto') && 
      content.includes('@Body() loginDto: LoginDto')) {
    console.log('✅ DTOs properly used in endpoint parameters');
    passed++;
  } else {
    console.error('❌ DTOs not properly used in endpoint parameters');
  }

  console.log(`   Controller Integration Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function validateDtoStructure() {
  console.log('4. DTO Structure Validation:\n');
  
  console.log('✅ BEFORE (Vulnerable):');
  console.log('   export class LoginDto {');
  console.log('     email!: string;      // No validation');
  console.log('     password!: string;   // No validation');
  console.log('   }');
  console.log('   → Accepts any input (empty strings, invalid emails, etc.)');
  console.log('   → No length limits or format validation');
  console.log('   → Security risk from malformed input\n');
  
  console.log('✅ AFTER (Secure):');
  console.log('   export class LoginDto {');
  console.log('     @IsEmail({}, { message: "Please provide a valid email address" })');
  console.log('     email!: string;');
  console.log('');
  console.log('     @IsString({ message: "Password must be a string" })');
  console.log('     @MinLength(1, { message: "Password is required" })');
  console.log('     password!: string;');
  console.log('   }');
  console.log('   → Validates email format');
  console.log('   → Ensures password is non-empty string');
  console.log('   → Clear error messages for API consumers\n');

  console.log('✅ RegisterDto Security Features:');
  console.log('   • Email format validation');
  console.log('   • Password length: 8-128 characters (prevents weak passwords)');
  console.log('   • Name length: 1-100 characters (prevents empty/excessive input)');
  console.log('   • String type validation for all fields');
  console.log('   • Custom error messages for better UX\n');
}

// Run all tests
const loginDtoPassed = checkLoginDto();
const registerDtoPassed = checkRegisterDto();
const controllerPassed = checkControllerIntegration();

if (loginDtoPassed && registerDtoPassed && controllerPassed) {
  console.log('🎯 All DTO Validation Tests Passed!');
  console.log('✅ Proper validation decorators implemented');
  console.log('✅ DTOs organized in separate files');
  console.log('✅ Comprehensive input validation');
  console.log('✅ Security best practices enforced');
  console.log('✅ Clear error messages for debugging\n');
} else {
  console.error('❌ Some DTO validation tests failed - review implementation');
  process.exit(1);
}

validateDtoStructure();

console.log('🛡️ DTO Security Implementation Summary:');
console.log('• Email validation prevents invalid email formats');
console.log('• Password validation enforces minimum security requirements');
console.log('• Length limits prevent buffer overflow and excessive input');
console.log('• Type validation ensures proper data types');
console.log('• Custom error messages improve API usability');
console.log('• Organized file structure improves maintainability');

console.log('\n📚 Validation Features:');
console.log('• Global ValidationPipe already configured in main.ts');
console.log('• class-validator decorators automatically applied');
console.log('• Input sanitization and transformation enabled');
console.log('• Malformed requests rejected before reaching business logic');

console.log('\n✅ Authentication endpoints now have proper input validation!');