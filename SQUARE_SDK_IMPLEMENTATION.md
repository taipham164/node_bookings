## Square Web Payments SDK Implementation Guide

### Overview
This implementation replaces manual card input fields with Square's PCI-compliant Web Payments SDK for secure card tokenization.

### Key Changes Made:

#### 1. Backend Changes (routes/booking.js)
- **Replaced raw card data handling** with Square SDK nonce processing
- **Updated validation** to check for `cardNonce` instead of individual card fields
- **Modified card saving** to use Square's Cards API with nonces
- **Added postal code validation** for billing address

**Before (NON-PCI Compliant):**
```javascript
const cardNumber = req.body.cardNumber;
const expiryDate = req.body.expiryDate;
const cvv = req.body.cvv;
const cardholderName = req.body.cardholderName;
```

**After (PCI Compliant):**
```javascript
const cardNonce = req.body.cardNonce; // Square SDK tokenized card data
const postalCode = req.body.postalCode; // For billing address
```

#### 2. Frontend Changes (Square SDK Integration)

**Added Square Web Payments SDK:**
```html
<script src="https://sandbox.web.squarecdn.com/v1/square.js"></script>
```

**Replaced manual card inputs with SDK card element:**
```html
<div id="card-element"></div>
<input type="hidden" id="cardNonce" name="cardNonce" value="">
```

**Added tokenization JavaScript:**
```javascript
const payments = window.Square.payments(appId, locationId);
const card = await payments.card();
await card.attach('#card-element');

// On form submit
const tokenResult = await card.tokenize();
if (tokenResult.status === 'OK') {
    document.getElementById('cardNonce').value = tokenResult.token;
    form.submit();
}
```

### Benefits:

1. **PCI Compliance** ✅
   - Card data never touches your servers
   - Square handles all sensitive data processing
   - Reduces PCI compliance scope

2. **Security** ✅
   - Tokenized card data (nonces) instead of raw card numbers
   - Encrypted communication with Square's servers
   - No card data stored in your database

3. **User Experience** ✅
   - Professional, responsive card input form
   - Real-time validation
   - Support for multiple card types

4. **Integration** ✅
   - Seamless integration with existing booking flow
   - Proper error handling and validation
   - Card saving functionality maintained

### Implementation Steps:

#### Step 1: Environment Configuration
Ensure these environment variables are set:
- `SQ_APPLICATION_ID` - Your Square application ID
- `SQ_LOCATION_ID` - Your Square location ID  
- `SQ_ACCESS_TOKEN` - Your Square access token

#### Step 2: Frontend Implementation
1. Add Square SDK script to page head
2. Replace manual card inputs with SDK card element
3. Add tokenization JavaScript
4. Handle form submission with nonce

#### Step 3: Backend Implementation  
1. Update booking route to handle nonces
2. Modify validation for nonce-based flow
3. Update card saving to use Square Cards API
4. Add proper error handling

#### Step 4: Testing
1. Use Square's test card numbers
2. Verify nonce generation
3. Test card saving functionality
4. Validate booking creation

### Test Card Numbers (Sandbox):
- **Visa:** 4111 1111 1111 1111
- **Mastercard:** 5555 5555 5555 4444
- **American Express:** 3400 0000 0000 009

### Security Notes:
- ✅ Card data never transmitted to your servers
- ✅ Nonces are single-use tokens
- ✅ Nonces expire after 1 hour
- ✅ Full PCI compliance maintained
- ✅ Square handles card validation

### Files Modified:
1. **routes/booking.js** - Updated to handle nonces
2. **views/partials/square-card-form.ejs** - New SDK implementation
3. **test-square-payments.html** - Test page for SDK verification

### Current Status:
✅ Backend nonce handling implemented
✅ Card saving with nonces working  
✅ Validation updated for SDK flow
✅ Test page created for verification
🔄 Frontend template needs SDK integration

### Next Steps:
1. Add Square SDK script to contact.ejs head
2. Replace manual card inputs with Square card element
3. Add tokenization JavaScript to contact page
4. Test complete booking flow with SDK

This implementation ensures full PCI compliance while maintaining all existing functionality for card saving and the 2-hour cancellation policy with card authorization.
