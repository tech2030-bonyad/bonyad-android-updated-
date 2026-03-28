/**
 * Small Task Types API Service (aligned with web)
 * Base: https://bonyad-app-nyayeditqq-ww.a.run.app/api
 * Endpoints: types, create request, my requests, request details, bids, accept bid, cancel, available, my bids, create bid, withdraw, update status, pay.
 */

import { buildApiUrl, buildApiUrlWithParams, getServerBaseUrl, API_ENDPOINTS } from '../config/api';
import { storage } from '../utils/storage';

export interface SmallTaskType {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  icon?: string | null;
  imageUrl?: string | null;
  svgUrl?: string | null;
  useSvg: boolean;
  activeImageUrl: string;
  imageType: 'svg' | 'photo';
  isActive: boolean;
  basePrice?: number;
  estimatedDuration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmallTaskTypesResponse {
  taskTypes: SmallTaskType[];
  count: number;
}

/**
 * Get all active small task types
 * GET /api/small-tasks/types
 * 
 * This is a public endpoint - no authentication required
 */
export async function getSmallTaskTypes(): Promise<SmallTaskType[]> {
  const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.TYPES);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch small task types: ${response.status}`);
  }

  const data: SmallTaskTypesResponse = await response.json();
  return data.taskTypes || [];
}

/**
 * Helper function to get the full image URL for a small task type
 * Uses activeImageUrl which already points to the correct image (SVG or photo)
 */
export function getSmallTaskTypeImageUrl(taskType: SmallTaskType): string | null {
  if (!taskType.activeImageUrl) return null;
  const baseUrl = getServerBaseUrl();
  return `${baseUrl}${taskType.activeImageUrl}`;
}

/**
 * Filter small task types by search query
 * Searches in both name and description (English and Arabic)
 */
export function filterSmallTaskTypes(
  taskTypes: SmallTaskType[],
  query: string,
  language: 'en' | 'ar' = 'en'
): SmallTaskType[] {
  if (!query.trim()) return taskTypes;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return taskTypes.filter((taskType) => {
    const name = language === 'ar' ? taskType.nameAr : taskType.nameEn;
    const description = language === 'ar' 
      ? (taskType.descriptionAr || taskType.description)
      : (taskType.descriptionEn || taskType.description);
    
    const nameMatch = name?.toLowerCase().includes(lowerQuery) || false;
    const descMatch = description?.toLowerCase().includes(lowerQuery) || false;
    
    return nameMatch || descMatch;
  });
}

/** Request body for creating a small task (same as web SmallTasksService.CreateSmallTaskRequestBody) */
export interface CreateSmallTaskRequestBody {
  taskTypeId: number;
  description: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

/** Created small task request (minimal shape from API) */
export interface SmallTaskRequestCreated {
  id: number;
  taskTypeId: number;
  description: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  createdAt?: string;
  [key: string]: unknown;
}

/**
 * Create a new small task request (same backend as web)
 * POST /api/small-tasks/requests
 */
export async function createSmallTaskRequest(
  body: CreateSmallTaskRequestBody
): Promise<SmallTaskRequestCreated> {
  const token = await storage.getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.CREATE_REQUEST);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { message?: string; error?: string }).message ||
      (errorData as { message?: string; error?: string }).error ||
      'Failed to create request'
    );
  }

  const data = await response.json();
  return data as SmallTaskRequestCreated;
}

// ===== User & technician phase APIs (same as web SmallTasksService) =====

/** Small task request (user/technician view from API) */
export interface SmallTaskRequestApi {
  id: number;
  userId?: number;
  userName?: string;
  userPhoneNumber?: string;
  taskTypeId: number;
  taskTypeNameAr?: string;
  taskTypeNameEn?: string;
  taskTypeName?: string;
  description: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  acceptedTechnicianId?: number;
  acceptedTechnicianName?: string;
  acceptedBidId?: number;
  bidsCount?: number;
  paidAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Bid on a small task request */
export interface SmallTaskBidApi {
  id: number;
  smallTaskRequestId: number;
  technicianId: number;
  technicianName: string;
  technicianPhoneNumber?: string;
  price: number;
  estimatedDuration: number;
  notes?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await storage.getAuthToken();
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** Get my small task requests (user) - GET /small-tasks/requests/my-requests */
export async function getMyRequests(): Promise<SmallTaskRequestApi[]> {
  const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.MY_REQUESTS);
  const response = await fetch(url, { method: 'GET', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to fetch requests');
  }
  const data = await response.json();
  return (data.requests || data || []) as SmallTaskRequestApi[];
}

/** Get request details - GET /small-tasks/requests/:id */
export async function getRequestDetails(requestId: number): Promise<SmallTaskRequestApi> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.REQUEST_DETAILS, { id: requestId });
  const response = await fetch(url, { method: 'GET', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to fetch request details');
  }
  return (await response.json()) as SmallTaskRequestApi;
}

/** Get bids on a request - GET /small-tasks/requests/:id/bids (same as web REQUEST_BIDS) */
export async function getBidsOnRequest(requestId: number): Promise<SmallTaskBidApi[]> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.REQUEST_BIDS, { id: requestId });
  const response = await fetch(url, { method: 'GET', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to fetch bids');
  }
  const data = await response.json();
  return (data.bids || data || []) as SmallTaskBidApi[];
}

/** Accept a bid - POST /small-tasks/requests/:requestId/bids/:bidId/accept */
export async function acceptBid(requestId: number, bidId: number): Promise<SmallTaskRequestApi> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.ACCEPT_BID, { requestId, bidId });
  const response = await fetch(url, { method: 'POST', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to accept bid');
  }
  return (await response.json()) as SmallTaskRequestApi;
}

/** Cancel request - PATCH /small-tasks/requests/:id/cancel (same as web CANCEL_REQUEST) */
export async function cancelRequest(requestId: number): Promise<{ message: string }> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.CANCEL_REQUEST, { id: requestId });
  const response = await fetch(url, { method: 'PATCH', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to cancel request');
  }
  return (await response.json()) as { message: string };
}

/** Update request (user) - PATCH /small-tasks/requests/:id. Body: { description?, address? }. Same path as GET details. */
export async function updateRequest(
  requestId: number,
  body: { description?: string; address?: string }
): Promise<SmallTaskRequestApi> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.REQUEST_DETAILS, { id: requestId });
  const response = await fetch(url, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to update request');
  }
  return (await response.json()) as SmallTaskRequestApi;
}

/** Technician specialization (subscribed task type) – used to filter available to match web */
export interface TechnicianSpecializationApi {
  taskTypeId: number;
  [key: string]: unknown;
}

/** Get active specializations (subscribed task types) – GET /small-tasks/technician/specializations/active */
export async function getActiveSpecializations(): Promise<TechnicianSpecializationApi[]> {
  const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.SPECIALIZATIONS_ACTIVE);
  const response = await fetch(url, { method: 'GET', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to fetch specializations');
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/** Subscribe to a task type – POST /small-tasks/technician/specializations/:taskTypeId (same as web) */
export async function subscribeToTaskType(taskTypeId: number): Promise<{ message: string }> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.SUBSCRIBE_TO_TYPE, { taskTypeId });
  const response = await fetch(url, { method: 'POST', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to subscribe');
  }
  return (await response.json()) as { message: string };
}

/** Unsubscribe from a task type – DELETE /small-tasks/technician/specializations/:taskTypeId (same as web) */
export async function unsubscribeFromTaskType(taskTypeId: number): Promise<{ message: string }> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.UNSUBSCRIBE_FROM_TYPE, { taskTypeId });
  const response = await fetch(url, { method: 'DELETE', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to unsubscribe');
  }
  return (await response.json()) as { message: string };
}

/** Get available requests (technician) - GET /small-tasks/requests/available. Same API and behavior as web. */
export async function getAvailableRequests(options?: { cacheBust?: boolean }): Promise<SmallTaskRequestApi[]> {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    let url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.AVAILABLE_REQUESTS);
    if (options?.cacheBust !== false) {
      url += (url.includes('?') ? '&' : '?') + '_=' + Date.now();
    }
    if (__DEV__) {
      console.log('🌐 [SmallTaskService] Fetching available requests from:', url);
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = (err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to fetch available requests';
      const isSub = typeof msg === 'string' && /subscription|end date|contact support/i.test(msg);
      if (isSub) {
        if (__DEV__) console.warn('⚠️ [SmallTaskService] Available requests skipped (subscription):', msg);
        return [];
      }
      throw new Error(msg);
    }

    let data: unknown;
    const responseText = await response.text();
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      if (__DEV__) {
        console.warn('⚠️ [SmallTaskService] Invalid JSON from available requests. Status:', response.status, 'Body (first 300 chars):', (responseText || '').substring(0, 300));
      }
      return [];
    }

    // Match web: data.requests ?? data.data?.requests ?? data.data (if array) ?? array
    const requests =
      (data && typeof data === 'object' && 'requests' in data && Array.isArray((data as any).requests))
        ? (data as any).requests
        : (data && typeof data === 'object' && 'data' in data && typeof (data as any).data === 'object' && Array.isArray((data as any).data?.requests))
          ? (data as any).data.requests
          : (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data))
            ? (data as any).data
            : Array.isArray(data)
              ? data
              : [];
    if (__DEV__) {
      console.log('✅ [SmallTaskService] Loaded available requests:', requests.length);
    }
    return requests as SmallTaskRequestApi[];
  } catch (error: any) {
    const message = error?.message ?? String(error);
    const isSub = typeof message === 'string' && /subscription|end date|contact support/i.test(message);
    if (isSub) {
      if (__DEV__) console.warn('⚠️ [SmallTaskService] Available requests skipped (subscription):', message);
      return [];
    }
    if (__DEV__) console.error('❌ [SmallTaskService] Error fetching available requests:', error);
    throw error;
  }
}

/** Get my bids (technician) - GET /small-tasks/bids/my-bids */
export async function getMyBids(): Promise<{ bids: SmallTaskBidApi[]; count: number }> {
  const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.MY_BIDS);
  const response = await fetch(url, { method: 'GET', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to fetch my bids');
  }
  const data = await response.json();
  return { bids: (data.bids || []) as SmallTaskBidApi[], count: data.count || 0 };
}

/** Create bid (technician) - POST /small-tasks/requests/:id/bids (same as web CREATE_BID) */
export async function createBid(
  requestId: number,
  bidData: { price: number; estimatedDuration: number; notes?: string }
): Promise<SmallTaskBidApi> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.CREATE_BID, { id: requestId });
  const response = await fetch(url, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(bidData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to create bid');
  }
  return (await response.json()) as SmallTaskBidApi;
}

/** Withdraw bid - PATCH /small-tasks/bids/:id/withdraw */
export async function withdrawBid(bidId: number): Promise<{ message: string }> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.WITHDRAW_BID, { id: bidId });
  const response = await fetch(url, { method: 'PATCH', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to withdraw bid');
  }
  return (await response.json()) as { message: string };
}

/** Reject bid (user) - PATCH /small-tasks/bids/:bidId/reject */
export async function rejectBid(bidId: number): Promise<{ message: string }> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.REJECT_BID, { bidId });
  const response = await fetch(url, { method: 'PATCH', headers: await getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to reject bid');
  }
  return (await response.json()) as { message: string };
}

/** Update request status (technician) - PATCH /small-tasks/requests/:id/status. Body: { status: 'IN_PROGRESS' | 'COMPLETED' }. */
export async function updateRequestStatus(
  requestId: number,
  status: 'IN_PROGRESS' | 'COMPLETED'
): Promise<SmallTaskRequestApi> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.UPDATE_STATUS, { id: requestId });
  const response = await fetch(url, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Failed to update status');
  }
  return (await response.json()) as SmallTaskRequestApi;
}

/** Pay for small task (user) - POST /small-tasks/requests/:requestId/pay. Same payload/response as web. */
export async function payForSmallTask(
  requestId: number,
  paymentData: {
    amount: number;
    currency?: string;
    paymentType?: string;
    paymentBrand?: string;
    merchantTransactionId?: string;
    customer: { email: string; givenName: string; surname: string };
    billing: { street1: string; city: string; state: string; country: string; postcode: string };
  }
): Promise<{
  success: boolean;
  checkoutId?: string;
  redirectUrl?: string;
  shopperUrl?: string;
  transactionId?: number;
  amount?: number;
  commissionAmount?: number;
  netAmount?: number;
  error?: string;
}> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.PAY, { id: requestId });
  const response = await fetch(url, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(paymentData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = (err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Payment failed';
    return { success: false, error: msg };
  }
  const data = (await response.json()) as Record<string, unknown>;
  const redirectUrl = (data.redirectUrl || data.shopperUrl) as string | undefined;
  const checkoutId = (data.checkoutId || data.id || data.ndc) as string | undefined;
  if (!redirectUrl && !checkoutId) {
    return { success: false, error: 'No redirect URL or checkoutId from server' };
  }
  return {
    success: true,
    checkoutId,
    redirectUrl: redirectUrl || (checkoutId ? `https://eu-test.oppwa.com/v1/checkouts/${checkoutId}` : undefined),
    shopperUrl: data.shopperUrl as string | undefined,
    transactionId: data.transactionId as number | undefined,
    amount: data.amount as number | undefined,
    commissionAmount: data.commissionAmount as number | undefined,
    netAmount: data.netAmount as number | undefined,
  };
}
