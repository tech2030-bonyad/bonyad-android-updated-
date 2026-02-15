/**
 * PaymentFlowOrchestrator
 * 
 * Orchestrates the complete payment flow:
 * 1. Payment Method Selection
 * 2. Customer Information Collection
 * 3. Billing Address Collection
 * 4. Checkout Creation
 * 5. Payment Processing
 * 
 * Handles state management and navigation between steps
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { PaymentBrand, CreateCheckoutRequest } from '../services/PaymentService';
import PaymentMethodSelectionModal from './PaymentMethodSelectionModal';
import CustomerInfoModal from './CustomerInfoModal';
import BillingAddressModal from './BillingAddressModal';

interface CustomerInfo {
  email: string;
  givenName: string;
  surname: string;
}

interface BillingAddress {
  street1: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

interface PaymentFlowOrchestratorProps {
  visible: boolean;
  amount: number;
  currency?: string;
  phaseId?: number;
  smallTaskRequestId?: number;
  subscriptionId?: number;
  merchantTransactionId: string;
  onClose: () => void;
  onComplete: (checkoutRequest: CreateCheckoutRequest) => void;
  onError?: (error: string) => void;
}

export default function PaymentFlowOrchestrator({
  visible,
  amount,
  currency = 'SAR',
  phaseId,
  smallTaskRequestId,
  subscriptionId,
  merchantTransactionId,
  onClose,
  onComplete,
  onError,
}: PaymentFlowOrchestratorProps) {
  const [currentStep, setCurrentStep] = useState<'method' | 'customer' | 'billing' | 'complete'>('method');
  const [selectedPaymentBrand, setSelectedPaymentBrand] = useState<PaymentBrand | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [billingAddress, setBillingAddress] = useState<BillingAddress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!visible) {
      setCurrentStep('method');
      setSelectedPaymentBrand(null);
      setCustomerInfo(null);
      setBillingAddress(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleMethodSelect = (brand: PaymentBrand) => {
    setSelectedPaymentBrand(brand);
    setCurrentStep('customer');
  };

  const handleCustomerInfoSubmit = (info: CustomerInfo) => {
    setCustomerInfo(info);
    setCurrentStep('billing');
  };

  const handleBillingAddressSubmit = (address: BillingAddress, saveForFuture: boolean) => {
    setBillingAddress(address);
    
    // Create checkout request
    if (!selectedPaymentBrand || !customerInfo) {
      onError?.('Missing payment information');
      return;
    }

    const checkoutRequest: CreateCheckoutRequest = {
      phaseId,
      subscriptionId,
      amount,
      currency,
      paymentType: 'DB', // Debit
      paymentBrand: selectedPaymentBrand,
      merchantTransactionId,
      customer: {
        email: customerInfo.email,
        givenName: customerInfo.givenName,
        surname: customerInfo.surname,
      },
      billing: {
        street1: address.street1,
        city: address.city,
        state: address.state,
        country: address.country,
        postcode: address.postcode,
      },
    };

    setIsSubmitting(true);
    setCurrentStep('complete');
    
    // Call completion handler
    onComplete(checkoutRequest);
    
    // Reset after a delay
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  const handleBack = () => {
    if (currentStep === 'billing') {
      setCurrentStep('customer');
    } else if (currentStep === 'customer') {
      setCurrentStep('method');
    } else {
      onClose();
    }
  };

  return (
    <View>
      {/* Step 1: Payment Method Selection */}
      <PaymentMethodSelectionModal
        visible={visible && currentStep === 'method'}
        amount={amount}
        currency={currency}
        onClose={onClose}
        onSelect={handleMethodSelect}
        isSubmitting={isSubmitting}
      />

      {/* Step 2: Customer Information */}
      <CustomerInfoModal
        visible={visible && currentStep === 'customer'}
        onClose={handleBack}
        onSubmit={handleCustomerInfoSubmit}
        isSubmitting={isSubmitting}
        initialData={customerInfo || undefined}
      />

      {/* Step 3: Billing Address */}
      <BillingAddressModal
        visible={visible && currentStep === 'billing'}
        onClose={handleBack}
        onSubmit={handleBillingAddressSubmit}
        isSubmitting={isSubmitting}
        initialData={billingAddress || undefined}
      />
    </View>
  );
}
