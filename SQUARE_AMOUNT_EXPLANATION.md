# Square Amount Field Explanation

## ❓ **Will Square Charge My Card?**

**NO** - With the current configuration, **no money will be charged** from your card.

## 🔍 **What the Amount Field Does:**

### **With `intent: 'STORE'`** (Current Setting):
- ✅ **Card Verification** - Checks if card is valid
- ✅ **Fraud Prevention** - Runs risk/fraud checks  
- ✅ **Authorization Test** - Temporarily verifies card can be charged
- ✅ **Card Storage** - Saves card token for future use
- ❌ **NO ACTUAL CHARGE** - Money is NOT taken from your card

### **What You'll See:**
1. **Temporary Authorization** - May show as "pending" for a few minutes
2. **Authorization Release** - Pending amount disappears (usually within 1-24 hours)
3. **No Charge** - No money is actually deducted
4. **Card Saved** - Card token is stored securely for booking

## 🎯 **Square Intent Values:**

| Intent | What It Does | Money Charged? |
|--------|-------------|----------------|
| `STORE` | Save card only | ❌ No |
| `CHARGE` | Charge immediately | ✅ Yes |
| `CHARGE_AND_STORE` | Charge + save card | ✅ Yes |

## 💡 **Why Amount is Required:**

Square requires an amount for verification details because:
1. **Risk Assessment** - Higher amounts trigger different fraud checks
2. **Authorization Limits** - Verifies card can handle the amount
3. **Regulatory Compliance** - Required for 3D Secure authentication
4. **Merchant Configuration** - Some merchants have amount-based rules

## 🔒 **For Your Booking App:**

- **Current**: `amount: '1.00'` with `intent: 'STORE'` 
- **Result**: Card is verified and saved, no charge
- **Later**: When customer books, you charge the actual service amount
- **Safe**: This is the standard approach for reservation systems

## 🧪 **Testing With Test Cards:**

Using Square's test cards (like 4111 1111 1111 1111):
- ✅ **Safe** - Test cards never charge real money
- ✅ **Verification** - Tests the tokenization process
- ✅ **Integration** - Confirms your app works correctly

## 📋 **Production Considerations:**

When you go live:
- Consider using actual service amount for better fraud detection
- Authorization amount should match expected charge amount
- Customer experience: brief pending charge that disappears
