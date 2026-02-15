# HyperPay COPYandPAY Implementation Plan

## ✅ Understanding Confirmed

### HyperPay COPYandPAY Flow (React Web):

1. **STEP 1 - Get Checkout ID:**
   - User clicks "Pay Now"
   - Call `POST /api/payment/checkout` (or `/api/payments/create-checkout`)
   - Backend returns `checkoutId` string
   - Navigate to payment page with checkout ID

2. **STEP 2 - Payment Page Setup (BEFORE script loads):**
   - Create global `window.wpwlOptions` object with customization
   - Render empty form: `<form class="paymentWidgets" data-brands="..." action="callback-url">`
   - Form must exist before script loads

3. **STEP 3 - Load HyperPay Script:**
   - After page renders, dynamically create script tag
   - `src="https://test.oppwa.com/v1/paymentWidgets.js?checkoutId=CHECKOUT_ID"`
   - Append to document
   - Browser downloads and executes HyperPay JS

4. **STEP 4 - HyperPay Auto-Injects Form:**
   - HyperPay script finds form with `class="paymentWidgets"`
   - Injects card number, name, expiry, CVV fields
   - Adds validation and styling
   - Shows "Pay" button

5. **STEP 5 - User Pays:**
   - User fills card details
   - Clicks "Pay"
   - HyperPay handles submission
   - If 3D Secure needed, opens bank auth page
   - Redirects to `action` URL with checkout ID

6. **STEP 6 - Result/Callback Page:**
   - Extract checkout ID from URL params
   - Call `GET /api/payment/status/:checkoutId`
   - Backend verifies with HyperPay
   - Show success/failure message

### Key React Challenges:
- ✅ Setting `window.wpwlOptions` before script loads
- ✅ Dynamically injecting script tag
- ✅ Ensuring form exists before script runs
- ✅ Handling redirect/callback page
- ✅ Extracting checkout ID from URL

---

## 📋 What's Missing

### 1. **API Endpoint Mismatch** ⚠️
- **Backend has:** `/api/payment/checkout` (singular)
- **We have:** `/api/payments/create-checkout` (plural)
- **Need to:** Update API endpoint or confirm which one backend uses

### 2. **Payment Method Selection Modal** ✅ CREATED
- File: `src/components/PaymentMethodSelectionModal.tsx`
- Styled like BidFormModal
- Selects MADA/VISA/MASTER/Apple Pay

### 3. **Customer Info Modal** ⏳ TODO
- File: `src/components/CustomerInfoModal.tsx`
- Collects: Email, First Name, Last Name
- Pre-fill from user profile
- Styled like BidFormModal

### 4. **Billing Address Modal** ⏳ TODO
- File: `src/components/BillingAddressModal.tsx`
- Collects: Street, City, State, Country, Postcode
- Save for future option
- Styled like BidFormModal

### 5. **PaymentCheckoutScreen Update** ⏳ TODO
- Current: Uses WebView
- **Need:** HyperPay COPYandPAY implementation
- Must:
  - Set `window.wpwlOptions` before script
  - Render empty form with `class="paymentWidgets"`
  - Dynamically load script with checkout ID
  - Handle form injection by HyperPay

### 6. **PaymentResultScreen** ⏳ TODO
- File: `src/screens/PaymentResultScreen.tsx`
- Handles callback/redirect from HyperPay
- Extracts checkout ID from URL
- Calls status endpoint
- Shows success/failure

### 7. **wpwlOptions Configuration** ⏳ TODO
- Global configuration object
- Style customization
- Language settings
- Must be set before script loads

---

## 🔄 Complete Payment Flow

```
1. User clicks "Pay" on phase/small task
   ↓
2. PaymentMethodSelectionModal
   - Select MADA/VISA/MASTER/Apple Pay
   ↓
3. CustomerInfoModal (if not saved)
   - Email, First Name, Last Name
   ↓
4. BillingAddressModal (if not saved)
   - Street, City, State, Country, Postcode
   ↓
5. Call backend: POST /api/payment/checkout
   - Get checkoutId
   ↓
6. PaymentCheckoutScreen
   - Set window.wpwlOptions
   - Render empty form
   - Load HyperPay script
   - HyperPay injects form
   ↓
7. User pays
   - HyperPay processes
   - Redirects to callback URL
   ↓
8. PaymentResultScreen
   - Extract checkout ID
   - Verify with backend
   - Show result
```

---

## 🎯 Next Steps

1. ✅ Create PaymentMethodSelectionModal (DONE)
2. ⏳ Create CustomerInfoModal
3. ⏳ Create BillingAddressModal
4. ⏳ Update PaymentCheckoutScreen for HyperPay COPYandPAY
5. ⏳ Create PaymentResultScreen
6. ⏳ Add wpwlOptions configuration
7. ⏳ Update API endpoint if needed

---

## 📝 Notes

- All modals styled like BidFormModal
- HyperPay script URL: `https://test.oppwa.com/v1/paymentWidgets.js?checkoutId=...`
- Production URL: `https://eu-prod.oppwa.com/v1/paymentWidgets.js?checkoutId=...`
- Checkout IDs expire in 30 minutes
- Always verify payment with backend, never trust frontend
