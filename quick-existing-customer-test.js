// Simple test for existing customer card form
// Paste this in browser console when on the form page

console.log('=== Testing Existing Customer Card Form ===');

// Test 1: Check if elements exist
console.log('\n1. Checking form elements...');
const submitBtn = document.getElementById('existingCustomerSubmitBtn');
const cardElement = document.getElementById('existing-card-element');
const postalCode = document.getElementById('existingPostalCode');
const errorDiv = document.getElementById('existing-card-errors');

console.log('Submit button:', !!submitBtn);
console.log('Card element:', !!cardElement);
console.log('Postal code field:', !!postalCode);
console.log('Error div:', !!errorDiv);

// Test 2: Check current button state
if (submitBtn) {
  console.log('\n2. Current button state:');
  console.log('Disabled:', submitBtn.disabled);
  console.log('Text:', submitBtn.innerHTML);
  console.log('Opacity:', submitBtn.style.opacity);
}

// Test 3: Check if Square form is loaded
if (cardElement) {
  console.log('\n3. Square form state:');
  console.log('Children:', cardElement.children.length);
  console.log('Iframes:', cardElement.querySelectorAll('iframe').length);
  console.log('Has content:', cardElement.innerHTML.length > 10);
}

// Test 4: Manual button enabler
console.log('\n4. Manual test functions available:');
console.log('Run: enableExistingCustomerButton() - to enable button manually');
console.log('Run: testCardValidation() - to simulate valid card state');

// Test 5: Fill postal code to test
if (postalCode && !postalCode.value) {
  console.log('\n5. Filling test postal code...');
  postalCode.value = '12345';
  postalCode.dispatchEvent(new Event('input', { bubbles: true }));
}

console.log('\n✅ Test complete! Try filling in card details now.');
console.log('Watch for validation events in console starting with "🔧 [ExistingCustomer]"');
