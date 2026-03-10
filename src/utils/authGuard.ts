import { Platform } from 'react-native';
import { storage } from './storage';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { showError } from './alert';

/** Thrown when token validation fails due to network/connectivity (caller should not clear storage). */
export class NetworkAuthError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkAuthError';
  }
}

function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error?.message === 'string' ? error.message : String(error);
  return (
    msg.includes('Network request failed') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    (error?.name === 'TypeError' && msg.includes('network'))
  );
}

interface ValidateTokenResponse {
  valid: boolean;
  message: string;
  token?: string;
  userId?: number;
  phoneNumber?: string;
  role?: string;
  status?: string;
  onboarded?: boolean;
  profileComplete?: boolean;
  user?: {
    id: number;
    userId: string;
    name: string;
    phoneNumber: string;
    role: string;
    status: string;
    onboarded?: boolean;
    profileComplete?: boolean;
    [key: string]: any;
  };
}

/**
 * Validates a JWT token with the backend API
 * @param token The JWT token to validate
 * @returns Promise with validation result and user data
 * @throws NetworkAuthError when request fails due to network (caller should not clear storage)
 */
export const validateToken = async (token: string): Promise<ValidateTokenResponse | null> => {
  try {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AUTH.VALIDATE_TOKEN), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    // API returns 200 with user data when token is valid
    if (response.ok && data.user) {
      console.log('✅ Token validated successfully');
      // Map API response to ValidateTokenResponse format
      return {
        valid: true,
        message: data.message || 'Token is valid',
        token: data.token || token,
        userId: data.user?.id,
        phoneNumber: data.user?.phoneNumber,
        role: data.user?.role,
        status: data.user?.status,
        onboarded: data.user?.onboarded,
        profileComplete: data.user?.profileComplete,
        user: data.user,
      };
    } else {
      console.log('❌ Token validation failed:', data.message);
      return null;
    }
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn('⚠️ Token validation failed (network) - keeping stored session');
      throw new NetworkAuthError(error?.message || 'Network request failed');
    }
    console.error('❌ Error validating token:', error);
    return null;
  }
};

export interface AuthResult {
  token: string;
  userId: number;
  role: string;
  user: any;
  onboarded: boolean;
  profileComplete: boolean;
}

/**
 * Checks if user is authenticated
 * Validates token with backend API and returns user data if valid
 * Returns null if no token exists or token is invalid.
 * On network error, does NOT clear storage so user can retry when back online.
 */
export const checkAuthentication = async (): Promise<AuthResult | null> => {
  try {
    // Get token from storage
    const token = await storage.getAuthToken();
    
    if (!token) {
      console.log('❌ No token found in storage');
      return null;
    }

    let validationResult: ValidateTokenResponse | null;
    try {
      validationResult = await validateToken(token);
    } catch (err: any) {
      // Network/connectivity failure: keep stored token, don't clear auth
      if (err?.name === 'NetworkAuthError' || isNetworkError(err)) {
        console.warn('⚠️ Could not validate token (network) - keeping session for retry');
        return null;
      }
      throw err;
    }
    
    if (!validationResult || !validationResult.valid) {
      console.log('❌ Token validation failed - clearing invalid token');
      await storage.clearAuthData();
      return null;
    }

    // Token is valid - get user data from validation result
    const userId = validationResult.userId || validationResult.user?.id || await storage.getUserId() || 0;
    const role = validationResult.role || validationResult.user?.role || await storage.getUserRole() || '';
    
    // Determine role from validation result or storage
    let userRole = role.toUpperCase();
    if (!userRole && token.includes('user')) {
      userRole = 'USER';
    } else if (!userRole && token.includes('technician')) {
      userRole = 'TECHNICIAN';
    } else if (!userRole) {
      userRole = 'USER'; // Default to USER
    }

    // Get onboarded and profileComplete from user data
    const onboarded = validationResult.user?.onboarded ?? validationResult.onboarded ?? true;
    const profileComplete = validationResult.user?.profileComplete ?? validationResult.profileComplete ?? true;

    console.log('✅ Token validated successfully');
    console.log('   User ID:', userId);
    console.log('   Role:', userRole);
    console.log('   Onboarded:', onboarded);
    console.log('   Profile Complete:', profileComplete);
    
    return {
      token: validationResult.token || token,
      userId,
      role: userRole,
      user: validationResult.user ?? {
        id: userId,
        role: userRole,
        phoneNumber: validationResult.phoneNumber ?? '',
        name: (validationResult.user as any)?.name ?? '',
        status: (validationResult.user as any)?.status ?? validationResult.status ?? 'ACTIVE',
        onboarded,
        profileComplete,
      },
      onboarded,
      profileComplete,
    };
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn('⚠️ Auth check failed (network) - keeping session for retry');
      return null;
    }
    console.error('❌ Error checking authentication:', error);
    await storage.clearAuthData();
    return null;
  }
};
