# 🔧 Square Payment Form Debug Guide

## 🚨 **Current Issue: "Payment form could not load"**

You're seeing this error in the existing customer card addition form. Here's how to debug and fix it:

---

## 🔍 **Step 1: Check Browser Console**

1. **Open Developer Tools**: Press `F12` in your browser
2. **Go to Console tab**: Look for red error messages
3. **Look for specific errors** like:
   - `InvalidApplicationIdError`
   - `LocationId validation failed`
   - `Network errors`
   - `Square SDK loading errors`

---

## 🧪 **Step 2: Test Square SDK Manually**

### **Open this test page in your browser:**
```
http://localhost:3000/test-square-sdk-debug.html
```

This will test:
- ✅ Square SDK loading
- ✅ Payments initialization  
- ✅ Card form attachment
- ✅ Debug credentials

---

## 🔧 **Step 3: Common Fixes**

### **Fix 1: Application ID Format**
Your current Application ID: `sq0idp-kCCM7jRV0mwMIF0BKcKxLQ`

**Check if this is correct:**
1. Go to https://developer.squareup.com/apps
2. Select your app
3. Go to "Credentials" tab
4. Verify **Production Application ID** matches exactly

### **Fix 2: Environment Mismatch**
```bash
# Current config (.env file):
ENVIRONMENT=production
SQ_APPLICATION_ID=sq0idp-kCCM7jRV0mwMIF0BKcKxLQ  # Production ID
SQ_LOCATION_ID=6G1GCCAYYXB45                    # Production Location
```

**Make sure all credentials are from the SAME environment (production).**

### **Fix 3: Location ID Verification**
Your Location ID: `6G1GCCAYYXB45`

**Verify this is correct:**
1. In Square Developer Dashboard
2. Go to "Locations" 
3. Check that this Location ID exists and is active

---

## 🚀 **Step 4: Quick Test**

### **Test 1: Manual Square SDK Test**
Open browser console and run:
```javascript
// Test if Square SDK is loaded
console.log('Square SDK:', typeof window.Square);

// Test payments initialization
try {
    const payments = window.Square.payments('sq0idp-kCCM7jRV0mwMIF0BKcKxLQ', '6G1GCCAYYXB45');
    console.log('Payments initialized successfully:', payments);
} catch (error) {
    console.error('Payments initialization failed:', error);
}
```

### **Test 2: Network Connectivity**
Check if you can reach Square's servers:
```javascript
// Test Square API connectivity
fetch('https://connect.squareup.com/v2/locations/6G1GCCAYYXB45', {
    headers: {
        'Authorization': 'Bearer EAAAl4bb__DroXYqDMoUj-fOqxkhGc-oF0PtSWxgYpesOmF9bSfIWVQVMxrpHgoO'
    }
}).then(response => {
    console.log('Square API response:', response.status);
}).catch(error => {
    console.error('Square API error:', error);
});
```

---

## 🔥 **Step 5: If Still Failing**

### **Check These Common Issues:**

1. **Wrong Environment Credentials**
   - Using sandbox Application ID with production Access Token
   - Or vice versa

2. **Invalid Application ID**
   - Typo in the Application ID
   - Using old/revoked Application ID

3. **Location Not Found**
   - Location ID doesn't exist
   - Location is disabled

4. **Network/Firewall Issues**
   - Can't reach `web.squarecdn.com`
   - Corporate firewall blocking Square

### **Get Fresh Credentials**
1. Go to https://developer.squareup.com/apps
2. Select your app
3. Go to **Credentials** tab
4. Copy **Production** credentials:
   ```bash
   Application ID: sq0idp-xxxxxxxxxx
   Access Token: EAAAxxxxxxxxxx  
   Location ID: xxxxxxxxxx
   ```

---

## 📞 **Step 6: Contact Square Support**

If the issue persists:

1. **Square Developer Support**: https://developer.squareup.com/forums/
2. **Discord**: https://discord.gg/squaredev
3. **Contact Form**: https://squareup.com/help/contact

**Provide them with:**
- Your Application ID (safe to share)
- The exact error message from browser console
- Environment (production)
- Browser type and version

---

## 🎯 **Most Likely Fix**

Based on the error pattern, the most common cause is:

### **Environment Credential Mismatch**
Your `.env` shows `ENVIRONMENT=production`, so ensure:

1. **Application ID** is from **Production** tab in Square Dashboard
2. **Access Token** is from **Production** tab
3. **Location ID** is from **Production** environment

**All three must be from the same environment.**

---

## ✅ **Expected Result**

When working correctly, you should see:
- Square card form loads in the payment section
- Card number, expiry, CVC fields appear
- No error messages in browser console
- Form accepts test card input (4111 1111 1111 1111)

---

**Status**: 🔧 **DEBUGGING IN PROGRESS** - Use browser console to identify the specific error
