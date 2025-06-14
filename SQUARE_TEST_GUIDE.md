# Square Payment Form Test Guide 🧪

## 🎯 **How to Apply & Test Square Form**

### **Step 1: Access Test Pages**
1. **Square Test Page**: `http://localhost:3000/square-test`
2. **Contact Form**: `http://localhost:3000`
3. **Debug Page**: `http://localhost:3000/square-debug`

### **Step 2: Test Square Form Functionality**

#### **🔧 Basic Form Test**
1. Open the Square test page
2. Verify the payment form loads without errors
3. Check browser console for initialization messages
4. Confirm the form shows an interactive card input field

#### **💳 Card Entry Test**
Use these test card numbers:
```
Visa:       4111 1111 1111 1111
Mastercard: 5555 5555 5555 4444
Amex:       3782 822463 10005
Discover:   6011 1111 1111 1117
```

**Test Steps:**
1. Enter card number: `4111 1111 1111 1111`
2. Form should auto-advance to expiry field
3. Enter expiry: `12/26`
4. Form should auto-advance to CVV field
5. Enter CVV: `123`
6. Enter postal code: `12345`
7. Click "Test Tokenization"

#### **✅ Expected Results**
- ✅ Card number accepted and formatted
- ✅ Card brand icon appears (Visa logo)
- ✅ Expiry and CVV fields work
- ✅ Tokenization succeeds
- ✅ Token generated (starts with `cnon_` or similar)
- ✅ No console errors

### **Step 3: Test Contact Form Integration**

#### **🆕 New Customer Flow**
1. Go to `http://localhost:3000`
2. Enter phone number: `555-123-4567`
3. Click "Continue" → Should show "New Customer" option
4. Click "New Customer"
5. Fill out customer details
6. Test the card form in the payment section
7. Complete booking process

#### **👤 Existing Customer Flow**
1. Go to `http://localhost:3000`
2. Enter phone number of existing customer
3. Click "Continue" → Should show existing customer details
4. Look for "Add Payment Method" section
5. Test card form functionality
6. Complete booking process

### **Step 4: Console Testing Commands**

Open browser developer tools and run:
```javascript
// Check Square SDK
console.log('Square loaded:', typeof window.Square !== 'undefined');

// Check form elements
console.log('Card element:', document.getElementById('existing-card-element'));
console.log('Card container:', document.getElementById('card-element'));

// Check for iframes (indicates working form)
console.log('Iframes:', document.querySelectorAll('iframe').length);
```

### **Step 5: Troubleshooting Checklist**

#### **❌ Form Not Loading**
- Check browser console for errors
- Verify Square SDK script is loaded
- Confirm Application ID and Location ID are set
- Check network requests for failed API calls

#### **❌ Tokenization Failing**
- Verify verification details are included
- Check card number format
- Ensure postal code is provided
- Review console error messages

#### **❌ Form Not Interactive**
- Check if iframes are present in DOM
- Verify container styling isn't hiding form
- Confirm Square SDK version compatibility

### **Step 6: Validation Tests**

#### **🔍 Error Handling Tests**
1. **Invalid Card**: Enter `1234 5678 9012 3456`
2. **Invalid Expiry**: Enter `13/25` (invalid month)
3. **Invalid CVV**: Enter `12` (too short)
4. **Missing Postal**: Leave postal code empty

#### **📱 Responsive Tests**
1. Test on mobile screen size
2. Verify form works on different browsers
3. Check form styling and layout

### **Step 7: Performance Tests**

#### **⚡ Load Time Tests**
1. Measure Square SDK load time
2. Check form initialization speed
3. Verify tokenization response time

#### **🔄 Stress Tests**
1. Test multiple tokenization attempts
2. Verify form reset functionality
3. Test rapid form interactions

## 🎯 **Success Criteria**

### **✅ Form Must:**
- Load without JavaScript errors
- Display interactive card input field
- Accept test card numbers
- Show real-time validation
- Successfully tokenize cards
- Return valid payment tokens

### **✅ Integration Must:**
- Work in both new and existing customer flows
- Properly handle form submission
- Store tokens for payment processing
- Display appropriate error messages
- Maintain responsive design

## 🚀 **Quick Test Command**

Run this in browser console for instant test:
```javascript
// Quick Square test
(async function() {
    console.log('🧪 Quick Square Test');
    console.log('SDK:', typeof window.Square !== 'undefined' ? '✅' : '❌');
    console.log('Form:', document.querySelector('#card-element, #existing-card-element') ? '✅' : '❌');
    console.log('Iframes:', document.querySelectorAll('iframe').length);
})();
```

## 📊 **Test Results Template**

```
□ Square SDK loads successfully
□ Payment form renders correctly
□ Card input accepts test numbers
□ Expiry and CVV fields work
□ Tokenization completes successfully
□ Error handling works properly
□ Mobile responsive design
□ Integration with booking flow
□ No console errors
□ Performance acceptable
```

## 🎉 **Ready for Production**

When all tests pass, the Square payment form is ready for live use with:
- ✅ Secure card tokenization
- ✅ PCI compliance through Square
- ✅ Real-time validation
- ✅ Mobile-optimized experience
- ✅ Comprehensive error handling
