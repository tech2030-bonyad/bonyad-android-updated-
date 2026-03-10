import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

/**
 * Technician Status Response (same as web)
 */
export interface TechnicianStatusResponse {
  userId: number;
  name: string;
  status: 'PENDING' | 'WAITING_ADMIN_APPROVAL' | 'APPROVED' | 'SUSPENDED';
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

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || `Failed to fetch technician status: ${response.status}`);
    } catch {
      throw new Error(`Failed to fetch technician status: ${response.status}`);
    }
  }

  const data = await response.json();
  return data;
};
