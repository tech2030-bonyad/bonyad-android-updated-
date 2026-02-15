# 💳 Payment Integration Guide

## Complete Payment Flow Integration

This guide shows how to integrate the payment system into your existing screens.

---

## 🎯 Quick Start

### Option 1: Use PaymentFlowOrchestrator (Recommended)

The orchestrator handles the entire flow automatically:

```typescript
import { PaymentFlowOrchestrator } from '../components';
import { PaymentCheckoutScreen } from '../screens';
import { useState } from 'react';

function YourScreen() {
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [checkoutRequest, setCheckoutRequest] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <>
      {/* Payment Flow Orchestrator */}
      <PaymentFlowOrchestrator
        visible={showPaymentFlow}
        amount={1000.00}
        currency="SAR"
        phaseId={123}
        merchantTransactionId={`PROJECT-123-${Date.now()}`}
        onClose={() => setShowPaymentFlow(false)}
        onComplete={(request) => {
          setCheckoutRequest(request);
          setShowPaymentFlow(false);
          setShowCheckout(true);
        }}
        onError={(error) => {
          console.error('Payment flow error:', error);
        }}
      />

      {/* Payment Checkout Screen */}
      {showCheckout && checkoutRequest && (
        <PaymentCheckoutScreen
          checkoutRequest={checkoutRequest}
          phaseId={123}
          onBack={() => setShowCheckout(false)}
          onSuccess={(transactionId) => {
            console.log('Payment successful:', transactionId);
            setShowCheckout(false);
            // Navigate to success page or refresh data
          }}
        />
      )}
    </>
  );
}
```

### Option 2: Manual Step-by-Step

```typescript
import { 
  PaymentMethodSelectionModal,
  CustomerInfoModal,
  BillingAddressModal 
} from '../components';
import { PaymentCheckoutScreen } from '../screens';
import { useState } from 'react';

function YourScreen() {
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  
  const [paymentBrand, setPaymentBrand] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [billingAddress, setBillingAddress] = useState(null);
  const [checkoutRequest, setCheckoutRequest] = useState(null);

  const handleStartPayment = () => {
    setShowMethodModal(true);
  };

  return (
    <>
      <TouchableOpacity onPress={handleStartPayment}>
        <Text>Pay Now</Text>
      </TouchableOpacity>

      {/* Step 1: Payment Method */}
      <PaymentMethodSelectionModal
        visible={showMethodModal}
        amount={1000.00}
        onClose={() => setShowMethodModal(false)}
        onSelect={(brand) => {
          setPaymentBrand(brand);
          setShowMethodModal(false);
          setShowCustomerModal(true);
        }}
      />

      {/* Step 2: Customer Info */}
      <CustomerInfoModal
        visible={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSubmit={(info) => {
          setCustomerInfo(info);
          setShowCustomerModal(false);
          setShowBillingModal(true);
        }}
      />

      {/* Step 3: Billing Address */}
      <BillingAddressModal
        visible={showBillingModal}
        onClose={() => setShowBillingModal(false)}
        onSubmit={(address, save) => {
          setBillingAddress(address);
          setShowBillingModal(false);
          
          // Create checkout request
          const request = {
            phaseId: 123,
            amount: 1000.00,
            currency: 'SAR',
            paymentType: 'DB',
            paymentBrand: paymentBrand,
            merchantTransactionId: `PROJECT-123-${Date.now()}`,
            customer: customerInfo,
            billing: address,
          };
          
          setCheckoutRequest(request);
          setShowCheckout(true);
        }}
      />

      {/* Step 4: Checkout */}
      {showCheckout && checkoutRequest && (
        <PaymentCheckoutScreen
          checkoutRequest={checkoutRequest}
          phaseId={123}
          onBack={() => setShowCheckout(false)}
          onSuccess={(transactionId) => {
            console.log('Payment successful!', transactionId);
            setShowCheckout(false);
            // Handle success
          }}
        />
      )}
    </>
  );
}
```

---

## 🔄 Integration with Phase Payment

Update your existing phase payment screens:

### In `PhaseApprovalModal.tsx` or `UserProjectProgressPage.tsx`:

```typescript
import { PaymentFlowOrchestrator } from '../components';
import { PaymentCheckoutScreen } from '../screens';
import { useState } from 'react';

// Replace existing payForPhase function:
const [showPaymentFlow, setShowPaymentFlow] = useState(false);
const [checkoutRequest, setCheckoutRequest] = useState(null);
const [showCheckout, setShowCheckout] = useState(false);
const [selectedPhase, setSelectedPhase] = useState(null);

const handlePayPhase = (phase: Phase) => {
  setSelectedPhase(phase);
  setShowPaymentFlow(true);
};

// In render:
<PaymentFlowOrchestrator
  visible={showPaymentFlow}
  amount={phase.moneySpent}
  currency="SAR"
  phaseId={phase.id}
  merchantTransactionId={`PHASE-${phase.id}-${Date.now()}`}
  onClose={() => setShowPaymentFlow(false)}
  onComplete={(request) => {
    setCheckoutRequest(request);
    setShowPaymentFlow(false);
    setShowCheckout(true);
  }}
/>

{showCheckout && checkoutRequest && selectedPhase && (
  <PaymentCheckoutScreen
    checkoutRequest={checkoutRequest}
    phaseId={selectedPhase.id}
    onBack={() => setShowCheckout(false)}
    onSuccess={(transactionId) => {
      // Reload phases
      loadPhases();
      setShowCheckout(false);
      onSuccess?.();
    }}
  />
)}
```

---

## 🔄 Integration with Small Task Payment

For small task payments:

```typescript
import { PaymentFlowOrchestrator } from '../components';
import { PaymentCheckoutScreen } from '../screens';

const handlePaySmallTask = (task: SmallTask, bid: Bid) => {
  setShowPaymentFlow(true);
  setSelectedTask(task);
  setSelectedBid(bid);
};

<PaymentFlowOrchestrator
  visible={showPaymentFlow}
  amount={bid.amount}
  currency="SAR"
  smallTaskRequestId={selectedTask?.id}
  merchantTransactionId={`ST-${selectedTask?.id}-${Date.now()}`}
  onClose={() => setShowPaymentFlow(false)}
  onComplete={(request) => {
    setCheckoutRequest(request);
    setShowPaymentFlow(false);
    setShowCheckout(true);
  }}
/>
```

---

## 📱 Payment Result Handling

After payment, HyperPay redirects:

```typescript
// In your navigation/routing
import { PaymentResultScreen } from '../screens';

// When user lands on result page (from HyperPay redirect)
const checkoutId = getCheckoutIdFromURL(); // Extract from URL params

<PaymentResultScreen
  checkoutId={checkoutId}
  onBack={() => navigate('home')}
  onSuccess={(transactionId) => {
    navigate('paymentTransactions');
    // Or show success message
  }}
  onRetry={() => {
    // Retry payment flow
    navigate('paymentCheckout', { checkoutRequest });
  }}
/>
```

---

## 🔧 API Endpoint Configuration

**Important:** Verify your backend endpoints match:

**Current Implementation:**
- `POST /api/payments/create-checkout` (plural)
- `GET /api/payments/status/:checkoutId` (plural)

**If Backend Uses (singular):**
- `POST /api/payment/checkout`
- `GET /api/payment/status/:checkoutId`

**To Update:**
1. Edit `src/config/api.ts`:
```typescript
PAYMENTS: {
  CREATE_CHECKOUT: '/payment/checkout', // Changed from '/payments/create-checkout'
  STATUS: '/payment/status/:checkoutId', // Changed from '/payments/status/:checkoutId'
}
```

2. No changes needed in `PaymentService.ts` - it uses the config automatically.

---

## 🎨 Styling

All modals are styled to match `BidFormModal`:
- Same colors and design tokens
- Same layout and spacing
- Same button styles
- RTL support
- Dark mode support

---

## ✅ Testing Checklist

- [ ] Payment method selection works
- [ ] Customer info collection works
- [ ] Billing address collection works
- [ ] Checkout screen loads HyperPay form
- [ ] Payment submission works
- [ ] Result page verifies payment
- [ ] Error handling works
- [ ] Loading states display
- [ ] RTL layout works
- [ ] Dark mode works
- [ ] Form validation works
- [ ] Saved addresses work (if implemented)

---

## 🐛 Troubleshooting

### HyperPay form not loading?
- Check `window.wpwlOptions` is set before script loads
- Verify checkout ID is valid
- Check browser console for errors
- Verify script URL is correct

### Payment not verifying?
- Check result page URL matches backend
- Verify checkout ID extraction from URL
- Check backend status endpoint
- Review network requests in dev tools

### Modals not showing?
- Check `visible` prop is true
- Verify modals are in render tree
- Check for z-index issues
- Verify no other modals blocking

---

## 📚 Additional Resources

- See `IMPLEMENTATION_COMPLETE.md` for full implementation details
- See `HYPERPAY_IMPLEMENTATION_PLAN.md` for HyperPay flow explanation
- See `MISSING_PAYMENT_UI_UX.md` for original requirements

---

**Ready to integrate!** 🚀
