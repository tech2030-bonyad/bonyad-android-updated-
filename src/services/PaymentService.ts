import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';

// ===== Types =====
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentType = 'PROJECT' | 'PHASE' | 'SMALL_TASK' | 'SUBSCRIPTION';
export type PaymentBrand = 'MADA' | 'VISA' | 'MASTER' | 'APPLEPAY';
export type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';

export interface PaymentTransaction {
  id: number;
  amount: number;
  commissionAmount: number;
  netAmount: number;
  currency: string;
  status: PaymentStatus;
  paymentBrand: PaymentBrand;
  paymentType: PaymentType;
  projectId?: number;
  projectDescription?: string;
  phaseId?: number;
  phaseNumber?: number;
  smallTaskRequestId?: number;
  transactionId: string;
  checkoutId: string;
  createdAt: string;
  completedAt?: string;
  canRequestRefund: boolean;
  hasRefundRequest: boolean;
  refundRequestId?: number;
}

export interface PaymentTransactionResponse {
  content: PaymentTransaction[];
  totalElements: number;
  totalPages: number;
}

export interface RefundRequest {
  id: number;
  paymentTransactionId: number;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  adminNotes?: string;
  rejectionReason?: string;
  processedAt?: string;
  requestedById?: number;
  requestedByName?: string;
  paymentTransaction?: PaymentTransaction;
}

export interface RefundRequestResponse {
  content: RefundRequest[];
  totalElements: number;
}

export interface CreateCheckoutRequest {
  phaseId?: number;
  subscriptionId?: number;
  amount: number;
  currency: string;
  paymentType: 'DB' | 'PA';
  paymentBrand: PaymentBrand;
  merchantTransactionId: string;
  customer: {
    email: string;
    givenName: string;
    surname: string;
  };
  billing: {
    street1: string;
    city: string;
    state: string;
    country: string;
    postcode: string;
  };
  shopperResultUrl?: string;
}

export interface CreateCheckoutResponse {
  success: boolean;
  checkoutId: string;
  shopperUrl: string;
  redirectUrl: string;
  environment: string;
  transactionId?: number;
  amount?: number;
  commissionAmount?: number;
  netAmount?: number;
}

export interface PaymentStatusResponse {
  success: boolean;
  isPaymentResult: boolean;
  code: string;
  description: string;
  transactionId: string;
  paymentBrand: PaymentBrand;
  status: PaymentStatus;
}

// ===== Payment Transaction APIs =====

/**
 * Get paginated list of payment transactions for the authenticated user
 */
export const getMyTransactions = async (
  params?: {
    status?: PaymentStatus;
    type?: PaymentType;
    page?: number;
    size?: number;
  }
): Promise<PaymentTransactionResponse> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));

    const url = `${buildApiUrl(API_ENDPOINTS.PAYMENTS.MY_TRANSACTIONS)}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    console.log('📤 [PaymentService] Getting my transactions');
    console.log('   URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to get transactions: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Transactions retrieved:', data.totalElements);
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Get transactions error:', error);
    throw error;
  }
};

/**
 * Get single payment transaction by ID
 */
export const getTransaction = async (transactionId: number): Promise<PaymentTransaction> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.PAYMENTS.TRANSACTION, {
      id: transactionId,
    });

    console.log('📤 [PaymentService] Getting transaction:', transactionId);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to get transaction: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Transaction retrieved');
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Get transaction error:', error);
    throw error;
  }
};

/**
 * Request refund for a payment transaction
 */
export const requestRefund = async (
  transactionId: number,
  reason: string
): Promise<RefundRequest> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.PAYMENTS.REFUND_REQUEST, {
      transactionId,
    });

    console.log('📤 [PaymentService] Requesting refund for transaction:', transactionId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to request refund: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Refund requested:', data.id);
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Request refund error:', error);
    throw error;
  }
};

/**
 * Get my refund requests
 */
export const getMyRefundRequests = async (
  params?: {
    page?: number;
    size?: number;
  }
): Promise<RefundRequestResponse> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));

    const url = `${buildApiUrl(API_ENDPOINTS.PAYMENTS.MY_REFUND_REQUESTS)}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    console.log('📤 [PaymentService] Getting my refund requests');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to get refund requests: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Refund requests retrieved:', data.totalElements);
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Get refund requests error:', error);
    throw error;
  }
};

// ===== Payment Checkout APIs =====

/**
 * Create checkout for payment (Project Phase, Small Task, or Subscription)
 */
export const createCheckout = async (
  request: CreateCheckoutRequest
): Promise<CreateCheckoutResponse> => {
  console.log('🔥 [PaymentService] createCheckout called');
  console.log('   Request amount:', request.amount);
  console.log('   Request currency:', request.currency);
  console.log('   merchantTransactionId:', request.merchantTransactionId);
  
  try {
    const token = await storage.getAuthToken();
    console.log('🔑 [PaymentService] Token:', token ? 'present' : 'missing');

    const url = buildApiUrl(API_ENDPOINTS.PAYMENTS.CREATE_CHECKOUT);
    console.log('🌐 [PaymentService] API URL:', url);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 [PaymentService] Sending POST request...');
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    console.log('📥 [PaymentService] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [PaymentService] Response not OK:', errorData);
      throw new Error(errorData.message || `Failed to create checkout: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Checkout created successfully!');
    console.log('   checkoutId:', data.checkoutId);
    console.log('   shopperUrl:', data.shopperUrl);
    console.log('   transactionId:', data.transactionId);
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Create checkout error:', error.message);
    throw error;
  }
};

/**
 * Prepare checkout for mobile SDK (simplified)
 */
export const prepareCheckout = async (
  request: Omit<CreateCheckoutRequest, 'phaseId' | 'subscriptionId'>
): Promise<CreateCheckoutResponse> => {
  try {
    const token = await storage.getAuthToken();

    const url = buildApiUrl(API_ENDPOINTS.PAYMENTS.PREPARE_CHECKOUT);

    console.log('📤 [PaymentService] Preparing checkout');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to prepare checkout: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Checkout prepared:', data.checkoutId);
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Prepare checkout error:', error);
    throw error;
  }
};

/**
 * Check payment status by checkout ID
 */
export const getPaymentStatus = async (checkoutId: string): Promise<PaymentStatusResponse> => {
  try {
    const token = await storage.getAuthToken();

    const url = buildApiUrlWithParams(API_ENDPOINTS.PAYMENTS.STATUS, {
      checkoutId,
    });

    console.log('📤 [PaymentService] Checking payment status:', checkoutId);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to get payment status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Payment status:', data.status);
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Get payment status error:', error);
    throw error;
  }
};

// ===== Small Task Payment APIs =====

export interface SmallTaskPaymentRequest {
  amount: number;
  currency: string;
  paymentType: 'DB' | 'PA';
  paymentBrand?: PaymentBrand;
  merchantTransactionId: string;
  customer: {
    email: string;
    givenName: string;
    surname: string;
  };
  billing: {
    street1: string;
    city: string;
    state: string;
    country: string;
    postcode: string;
  };
  shopperResultUrl?: string;
}

/**
 * Create checkout for small task payment
 * POST /api/small-tasks/requests/{requestId}/pay
 *
 * Validation:
 * - Task must be in ACCEPTED status
 * - Payment status must be PENDING
 * - Amount must match accepted bid amount exactly
 * - User must own the task request
 */
export const createSmallTaskPayment = async (
  requestId: number,
  request: SmallTaskPaymentRequest
): Promise<CreateCheckoutResponse> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.PAY, {
      requestId,
    });

    console.log('📤 [PaymentService] Creating small task payment checkout');
    console.log('   Request ID:', requestId);
    console.log('   Amount:', request.amount);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to create small task payment: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Small task payment checkout created:', data.checkoutId);
    if (data.transactionId != null) console.log('   Transaction ID:', data.transactionId);
    if (data.commissionAmount != null) console.log('   Commission:', data.commissionAmount);
    if (data.netAmount != null) console.log('   Net Amount:', data.netAmount);
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Create small task payment error:', error);
    throw error;
  }
};

/**
 * Check small task payment status (production)
 * GET /api/payments/prod/status/{checkoutId}
 * Use after user completes payment on HyperPay redirect.
 */
export const getPaymentStatusProd = async (checkoutId: string): Promise<PaymentStatusResponse> => {
  try {
    const token = await storage.getAuthToken();
    const url = buildApiUrlWithParams(API_ENDPOINTS.PAYMENTS.STATUS_PROD, { checkoutId });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to get payment status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: data.success,
      isPaymentResult: data.paymentResult ?? data.isPaymentResult ?? false,
      code: data.code ?? '',
      description: data.description ?? '',
      transactionId: data.transactionId ?? '',
      paymentBrand: data.paymentBrand ?? 'VISA',
      status: data.status === 'COMPLETED' || data.paymentResult === true ? 'COMPLETED' : data.status === 'FAILED' || data.paymentResult === false ? 'FAILED' : 'PENDING',
    };
  } catch (error: any) {
    console.error('❌ [PaymentService] getPaymentStatusProd error:', error);
    throw error;
  }
};

// ===== Admin APIs =====

/**
 * Get all refund requests (Admin only)
 */
export const getAllRefundRequests = async (
  params?: {
    status?: RefundStatus;
    userId?: number;
    page?: number;
    size?: number;
  }
): Promise<RefundRequestResponse> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.userId) queryParams.append('userId', String(params.userId));
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.size !== undefined) queryParams.append('size', String(params.size));

    const url = `${buildApiUrl(API_ENDPOINTS.ADMIN.PAYMENTS.REFUND_REQUESTS)}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    console.log('📤 [PaymentService] Getting all refund requests (Admin)');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to get refund requests: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Refund requests retrieved:', data.totalElements);
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Get all refund requests error:', error);
    throw error;
  }
};

/**
 * Get single refund request (Admin only)
 */
export const getRefundRequest = async (refundRequestId: number): Promise<RefundRequest> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.ADMIN.PAYMENTS.REFUND_REQUEST, {
      id: refundRequestId,
    });

    console.log('📤 [PaymentService] Getting refund request:', refundRequestId);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to get refund request: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Refund request retrieved');
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Get refund request error:', error);
    throw error;
  }
};

/**
 * Approve refund request (Admin only)
 */
export const approveRefundRequest = async (
  refundRequestId: number,
  adminNotes?: string
): Promise<RefundRequest> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.ADMIN.PAYMENTS.APPROVE_REFUND, {
      id: refundRequestId,
    });

    console.log('📤 [PaymentService] Approving refund request:', refundRequestId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminNotes }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to approve refund: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Refund approved');
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Approve refund error:', error);
    throw error;
  }
};

/**
 * Reject refund request (Admin only)
 */
export const rejectRefundRequest = async (
  refundRequestId: number,
  rejectionReason: string,
  adminNotes?: string
): Promise<RefundRequest> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.ADMIN.PAYMENTS.REJECT_REFUND, {
      id: refundRequestId,
    });

    console.log('📤 [PaymentService] Rejecting refund request:', refundRequestId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rejectionReason, adminNotes }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to reject refund: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Refund rejected');
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Reject refund error:', error);
    throw error;
  }
};

/**
 * Process refund (Admin only) - Mark as processed after actual refund via gateway
 */
export const processRefund = async (refundRequestId: number): Promise<RefundRequest> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.ADMIN.PAYMENTS.PROCESS_REFUND, {
      id: refundRequestId,
    });

    console.log('📤 [PaymentService] Processing refund:', refundRequestId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to process refund: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PaymentService] Refund processed');
    return data;
  } catch (error: any) {
    console.error('❌ [PaymentService] Process refund error:', error);
    throw error;
  }
};
