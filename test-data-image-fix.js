#!/usr/bin/env node

/**
 * HTML Sanitizer data:image URL Test
 * 
 * This script tests that the HTML sanitizer correctly:
 * 1. Allows safe data:image/* URLs in background properties
 * 2. Blocks dangerous data: URLs (non-image types)
 * 3. Works consistently across different CSS properties
 */

const { sanitizeHtml, sanitizeCssValue, sanitizeStyleAttribute, DANGEROUS_CSS_PATTERNS } = require('./apps/backend/src/webbuilder/utils/html-sanitizer.ts');

console.log('🔍 Testing data:image URL Fix in HTML Sanitizer\n');

// Test data URLs
const safeDataImageUrls = [
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8A0vUo8XYUl+jSSKEw/9k=',
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'1\' height=\'1\'%3E%3C/svg%3E',
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
];

const dangerousDataUrls = [
  'data:text/html,<script>alert("xss")</script>',
  'data:text/javascript,alert("xss")',
  'data:application/x-javascript,alert("xss")',
  'data:text/plain,malicious',
  'data:application/octet-stream,binary'
];

function testDangerousPatterns() {
  console.log('1. Testing DANGEROUS_CSS_PATTERNS regex...');
  
  const dataPattern = DANGEROUS_CSS_PATTERNS.find(pattern => 
    pattern.toString().includes('data:(?!image\\/)'));
  
  if (!dataPattern) {
    console.error('❌ Could not find updated data: pattern with negative lookahead');
    return false;
  }
  
  let passed = 0;
  let total = 0;

  // Test that safe data:image URLs are NOT matched by the dangerous pattern
  console.log('   Testing safe data:image URLs...');
  for (const url of safeDataImageUrls) {
    total++;
    const testUrl = `url("${url}")`;
    if (!dataPattern.test(testUrl)) {
      console.log(`   ✅ Safe data:image URL allowed: ${url.substring(0, 30)}...`);
      passed++;
    } else {
      console.error(`   ❌ Safe data:image URL blocked: ${url.substring(0, 30)}...`);
    }
  }

  // Test that dangerous data URLs ARE matched by the dangerous pattern
  console.log('   Testing dangerous data URLs...');
  for (const url of dangerousDataUrls) {
    total++;
    const testUrl = `url("${url}")`;
    if (dataPattern.test(testUrl)) {
      console.log(`   ✅ Dangerous data URL blocked: ${url.substring(0, 30)}...`);
      passed++;
    } else {
      console.error(`   ❌ Dangerous data URL not blocked: ${url.substring(0, 30)}...`);
    }
  }

  console.log(`   Pattern Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function testSanitizeCssValue() {
  console.log('2. Testing sanitizeCssValue function...');
  
  let passed = 0;
  let total = 0;

  // Test background-image with safe data:image URLs
  console.log('   Testing background-image property...');
  for (const url of safeDataImageUrls) {
    total++;
    const cssValue = `url("${url}")`;
    const result = sanitizeCssValue('background-image', cssValue);
    if (result !== null) {
      console.log(`   ✅ Safe data:image background allowed: ${url.substring(0, 30)}...`);
      passed++;
    } else {
      console.error(`   ❌ Safe data:image background blocked: ${url.substring(0, 30)}...`);
    }
  }

  // Test background-image with dangerous data URLs
  console.log('   Testing dangerous URLs in background-image...');
  for (const url of dangerousDataUrls) {
    total++;
    const cssValue = `url("${url}")`;
    const result = sanitizeCssValue('background-image', cssValue);
    if (result === null) {
      console.log(`   ✅ Dangerous data URL blocked in background: ${url.substring(0, 30)}...`);
      passed++;
    } else {
      console.error(`   ❌ Dangerous data URL not blocked in background: ${url.substring(0, 30)}...`);
    }
  }

  // Test background property (shorthand)
  console.log('   Testing background shorthand property...');
  for (const url of safeDataImageUrls.slice(0, 2)) {  // Test fewer for brevity
    total++;
    const cssValue = `no-repeat center url("${url}")`;
    const result = sanitizeCssValue('background', cssValue);
    if (result !== null) {
      console.log(`   ✅ Safe data:image in background shorthand allowed: ${url.substring(0, 30)}...`);
      passed++;
    } else {
      console.error(`   ❌ Safe data:image in background shorthand blocked: ${url.substring(0, 30)}...`);
    }
  }

  console.log(`   CSS Value Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function testSanitizeStyleAttribute() {
  console.log('3. Testing sanitizeStyleAttribute function...');
  
  let passed = 0;
  let total = 0;

  // Test complete style strings with data:image backgrounds
  const testStyles = [
    `background-image: url("${safeDataImageUrls[0]}"); color: red;`,
    `background: no-repeat center url("${safeDataImageUrls[1]}"); padding: 10px;`,
    `color: blue; background-image: url("${safeDataImageUrls[2]}"); margin: 5px;`
  ];

  for (const style of testStyles) {
    total++;
    const result = sanitizeStyleAttribute(style);
    if (result.includes('background') && result.includes('data:image')) {
      console.log(`   ✅ Style with data:image preserved: ${result.substring(0, 50)}...`);
      passed++;
    } else {
      console.error(`   ❌ Style with data:image not preserved: ${result}`);
    }
  }

  // Test styles with dangerous data URLs
  const dangerousStyles = [
    `background-image: url("${dangerousDataUrls[0]}"); color: red;`,
    `background: url("${dangerousDataUrls[1]}"); padding: 10px;`
  ];

  for (const style of dangerousStyles) {
    total++;
    const result = sanitizeStyleAttribute(style);
    if (!result.includes('background') || !result.includes('data:')) {
      console.log(`   ✅ Style with dangerous data URL blocked: ${style.substring(0, 50)}...`);
      passed++;
    } else {
      console.error(`   ❌ Style with dangerous data URL not blocked: ${result}`);
    }
  }

  console.log(`   Style Attribute Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function testSanitizeHtml() {
  console.log('4. Testing sanitizeHtml function with complete HTML...');
  
  let passed = 0;
  let total = 0;

  // Test HTML with safe data:image backgrounds
  const safeHtml = `
    <div style="background-image: url('${safeDataImageUrls[0]}'); padding: 20px;">
      <p style="background: no-repeat url('${safeDataImageUrls[1]}'); color: blue;">Safe content</p>
    </div>
  `;

  total++;
  const safeResult = sanitizeHtml(safeHtml);
  if (safeResult.includes('data:image') && safeResult.includes('background')) {
    console.log('   ✅ HTML with safe data:image backgrounds preserved');
    passed++;
  } else {
    console.error('   ❌ HTML with safe data:image backgrounds not preserved');
    console.error('   Result:', safeResult);
  }

  // Test HTML with dangerous data URLs
  const dangerousHtml = `
    <div style="background-image: url('${dangerousDataUrls[0]}'); padding: 20px;">
      <p style="background: url('${dangerousDataUrls[1]}'); color: blue;">Dangerous content</p>
    </div>
  `;

  total++;
  const dangerousResult = sanitizeHtml(dangerousHtml);
  const hasDangerousData = dangerousResult.includes('data:text/') || dangerousResult.includes('data:application/');
  if (!hasDangerousData) {
    console.log('   ✅ HTML with dangerous data URLs blocked');
    passed++;
  } else {
    console.error('   ❌ HTML with dangerous data URLs not blocked');
    console.error('   Result:', dangerousResult);
  }

  console.log(`   HTML Tests: ${passed}/${total} passed\n`);
  return passed === total;
}

function validateFixImplementation() {
  console.log('5. Fix Implementation Validation:\n');
  
  console.log('✅ BEFORE (Problematic):');
  console.log('   /url\\s*\\(\\s*["\']?data:/i');
  console.log('   → Blocked ALL data: URLs including safe data:image/*');
  console.log('   → data:image URLs never reached background-specific check');
  console.log('   → GrapesJS background images broken\n');
  
  console.log('✅ AFTER (Fixed):');
  console.log('   /url\\s*\\(\\s*["\']?data:(?!image\\/)/i');
  console.log('   → Uses negative lookahead (?!image\\/) to exclude data:image/*');
  console.log('   → Allows data:image/* URLs to pass through to background check');
  console.log('   → Still blocks dangerous data:text/*, data:application/*, etc.');
  console.log('   → GrapesJS background images now work\n');

  console.log('✅ Security Benefits:');
  console.log('   • Maintains protection against dangerous data: URL types');
  console.log('   • Allows safe image embedding via data:image/*');
  console.log('   • Preserves existing background-image validation logic');
  console.log('   • No reduction in overall security posture\n');
}

// Run all tests
console.log('Running comprehensive data:image URL fix tests...\n');

const patternsPassed = testDangerousPatterns();
const cssValuePassed = testSanitizeCssValue();
const styleAttrPassed = testSanitizeStyleAttribute();
const htmlPassed = testSanitizeHtml();

if (patternsPassed && cssValuePassed && styleAttrPassed && htmlPassed) {
  console.log('🎯 All data:image URL Fix Tests Passed!');
  console.log('✅ Safe data:image/* URLs now allowed in backgrounds');
  console.log('✅ Dangerous data: URLs still blocked');
  console.log('✅ Fix works consistently across all functions');
  console.log('✅ GrapesJS background functionality restored');
  console.log('✅ Security posture maintained\n');
} else {
  console.error('❌ Some tests failed - fix may need adjustment');
  process.exit(1);
}

validateFixImplementation();

console.log('🛡️ data:image URL Fix Summary:');
console.log('• Negative lookahead regex prevents blocking safe image data URLs');
console.log('• Background images with data:image/* now work in GrapesJS');
console.log('• Dangerous data: URL types (text, javascript, etc.) still blocked');
console.log('• Fix applied consistently across sanitization functions');
console.log('• Zero reduction in security protection');

console.log('\n✅ GrapesJS background image support restored!');