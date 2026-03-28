import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

/**
 * Thrown when the API returns an error body that actually means "application rejected"
 * (e.g. code 1 + "Technician Onboarding" — misleading for users).
 */
export const TECHNICIAN_STATUS_REJECTED = '__TECHNICIAN_APPLICATION_REJECTED__';

/** 403 with `{ error: "… Current status: SUSPENDED …" }` — no 200 technician-status payload */
export const TECHNICIAN_STATUS_SUSPENDED_API = '__TECHNICIAN_STATUS_SUSPENDED_API__';

function getApiErrorText(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const o = body as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof o.message === 'string') parts.push(o.message);
  if (typeof o.error === 'string') parts.push(o.error);
  return parts.join(' ').trim();
}

function inferBlockedStatusFromErrorBody(httpStatus: number, body: unknown): 'REJECTED' | 'SUSPENDED' | null {
  if (httpStatus !== 403 && httpStatus !== 400) return null;
  const raw = getApiErrorText(body);
  if (!raw) return null;
  const m = raw.match(/current\s+status\s*:\s*([A-Za-z_]+)/i);
  if (m) {
    const s = m[1]!.toUpperCase();
    if (s === 'REJECTED' || s === 'DECLINED') return 'REJECTED';
    if (s === 'SUSPENDED') return 'SUSPENDED';
  }
  const low = raw.toLowerCase();
  if (low.includes('not in valid status') && low.includes('rejected')) return 'REJECTED';
  if (low.includes('not in valid status') && low.includes('suspended')) return 'SUSPENDED';
  return null;
}

function isMisleadingRejectionErrorBody(httpStatus: number, body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const o = body as Record<string, unknown>;
  const message = typeof o.message === 'string' ? o.message.trim().toLowerCase() : '';
  const errorStr = typeof o.error === 'string' ? o.error.trim().toLowerCase() : '';
  const statusField =
    typeof o.status === 'string' ? o.status.trim().toUpperCase() : '';
  const code = o.code;

  if (statusField === 'REJECTED') return true;

  const vagueOnboarding =
    message.includes('technician onboarding') || errorStr.includes('technician onboarding');
  if (!vagueOnboarding) return false;

  if (code === 1 || code === '1') return true;
  if (httpStatus === 400 || httpStatus === 403 || httpStatus === 422) return true;

  return false;
}

export interface TechnicianStatusResponse {
  userId: number;
  name: string;
  status: 'PENDING' | 'WAITING_ADMIN_APPROVAL' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  role: string;
  profileComplete: boolean;
  onboarded: boolean;
  hasPendingDataRequests: boolean;
  onboardingChecks?: {
    hasAvailability: boolean;
    hasServices: boolean;
    hasSubscription: boolean;
  };
  recommendedPage: 'WAITING_APPROVAL' | 'SUBMIT_DATA_REQUESTS' | 'ADD_AVAILABILITY' | 'ADD_SERVICES' | 'SUBSCRIBE' | 'DASHBOARD';
}

/**
 * Get technician status (admin approval status) – same as web
 * @param optionalToken - If provided, use this token instead of reading from storage (use after OTP/login to avoid race)
 */
export const getTechnicianStatus = async (optionalToken?: string): Promise<TechnicianStatusResponse> => {
  const token = optionalToken || (await storage.getAuthToken());
  if (!token) {
    throw new Error('No authentication token found');
  }

  const url = buildApiUrl(API_ENDPOINTS.USER.TECHNICIAN_STATUS);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const httpStatus = response.status;

  if (!response.ok) {
    const errorText = await response.text();

    let errorJson: unknown;
    try {
      errorJson = JSON.parse(errorText) as unknown;
    } catch {
      throw new Error(`Failed to fetch technician status: ${httpStatus}`);
    }

    const blocked = inferBlockedStatusFromErrorBody(httpStatus, errorJson);
    if (blocked === 'REJECTED') {
      throw new Error(TECHNICIAN_STATUS_REJECTED);
    }
    if (blocked === 'SUSPENDED') {
      throw new Error(TECHNICIAN_STATUS_SUSPENDED_API);
    }

    if (isMisleadingRejectionErrorBody(httpStatus, errorJson)) {
      throw new Error(TECHNICIAN_STATUS_REJECTED);
    }

    const msg = getApiErrorText(errorJson);
    throw new Error(msg || `Failed to fetch technician status: ${httpStatus}`);
  }

  const data = await response.json();
  return data;
};
