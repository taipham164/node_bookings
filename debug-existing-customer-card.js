// Debug script for existing customer card form - paste this in browser console

console.log('=== Existing Customer Card Form Debug ===');

function debugExistingCustomerCard() {
  console.log('\n🔍 Checking existing customer card form state...');
  
  // Check button state
  const submitBtn = document.getElementById('existingCustomerSubmitBtn');
  if (submitBtn) {
    console.log('✅ Submit button found:');
    console.log('   - Disabled:', submitBtn.disabled);
    console.log('   - Text:', submitBtn.innerHTML);
    console.log('   - Opacity:', submitBtn.style.opacity);
  } else {
    console.error('❌ Submit button not found!');
  }
  
  // Check card element
  const cardElement = document.getElementById('existing-card-element');
  if (cardElement) {
    console.log('✅ Card element found:');
    console.log('   - Children count:', cardElement.children.length);
    console.log('   - iframes count:', cardElement.querySelectorAll('iframe').length);
    console.log('   - HTML preview:', cardElement.innerHTML.substring(0, 200));
  } else {
    console.error('❌ Card element not found!');
  }
  
  // Check error div
  const errorDiv = document.getElementById('existing-card-errors');
  if (errorDiv) {
    console.log('✅ Error div found:');
    console.log('   - Display:', errorDiv.style.display);
    console.log('   - Text:', errorDiv.textContent);
  } else {
    console.error('❌ Error div not found!');
  }
  
  // Check postal code
  const postalCode = document.getElementById('existingPostalCode');
  if (postalCode) {
    console.log('✅ Postal code field found:');
    console.log('   - Value:', postalCode.value);
  } else {
    console.error('❌ Postal code field not found!');
  }
  
  console.log('\n🔧 Manual Tests:');
  console.log('1. Fill in some card details in the Square form');
  console.log('2. Check if change events fire in console');
  console.log('3. Run: debugExistingCustomerCard() again to see state changes');
  
  return {
    submitBtn,
    cardElement,
    errorDiv,
    postalCode
  };
}

// Test if Square SDK is available
if (typeof window.Square !== 'undefined') {
  console.log('✅ Square SDK is loaded');
} else {
  console.error('❌ Square SDK not loaded');
}

// Run the debug check
window.debugExistingCustomerCard = debugExistingCustomerCard;
debugExistingCustomerCard();

console.log('\n💡 To re-run this debug: debugExistingCustomerCard()');
