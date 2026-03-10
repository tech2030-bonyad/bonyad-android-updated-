import { storage } from '../utils/storage';
import { buildApiUrlWithParams, buildApiUrl, buildAssetUrl, API_ENDPOINTS } from '../config/api';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * User profile update data (same as web)
 */
export interface ProfileUpdateData {
  name?: string;
  email?: string;
  nationalId?: string | null;
  description?: string;
  yearsOfExperience?: number;
  regionIds?: number[];
}

/**
 * Update user profile information
 * PUT /api/users/profile - same as web
 */
export const updateProfile = async (updates: ProfileUpdateData): Promise<any> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) throw new Error('No authentication token');

    const url = buildApiUrl(API_ENDPOINTS.USER.UPDATE_PROFILE);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `Failed to update profile: ${response.status}`);
    }

    const profile = await response.json();
    if (profile.profileImage) {
      profile.profileImage = buildAssetUrl(profile.profileImage);
    }
    return profile;
  } catch (error: any) {
    console.error('❌ [ProfileService] Error updating profile:', error);
    throw error;
  }
};

/**
 * Change password - same endpoint and payload as web
 */
export const changePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const token = await storage.getAuthToken();
    const userId = await storage.getUserId();
    if (!token || !userId) throw new Error('No authentication data');

    const url = buildApiUrlWithParams(API_ENDPOINTS.USER.CHANGE_PASSWORD, { userId: String(userId) });
    if (!oldPassword || !newPassword) throw new Error('All fields are required');
    if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    const data = await response.json();
    if (response.status === 200) {
      return { success: true, message: data.message || 'Password changed successfully' };
    }
    throw new Error(data.message || 'Failed to change password');
  } catch (error: any) {
    console.error('❌ [ProfileService] Error changing password:', error);
    throw error;
  }
};

/**
 * Request phone change - try primary /change-phone then fallback to /change-phone-request (same as web)
 */
export const requestPhoneChange = async (newPhoneNumber: string): Promise<{ success: boolean; message: string; phoneNumber: string }> => {
  try {
    const token = await storage.getAuthToken();
    const userId = await storage.getUserId();
    if (!token || !userId) throw new Error('No authentication data');

    const primaryUrl = buildApiUrlWithParams(API_ENDPOINTS.USER.CHANGE_PHONE, { userId: String(userId) });
    const fallbackUrl = buildApiUrlWithParams(API_ENDPOINTS.USER.CHANGE_PHONE_REQUEST, { userId: String(userId) });

    let response = await fetch(primaryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPhoneNumber }),
    });

    if (response.status === 404) {
      response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPhoneNumber }),
      });
    }

    const data = await response.json();
    if (response.status === 200) {
      return {
        success: true,
        message: data.message || 'OTP sent successfully',
        phoneNumber: newPhoneNumber,
      };
    }
    throw new Error(data.message || 'Failed to send OTP');
  } catch (error: any) {
    console.error('❌ [ProfileService] Error requesting phone change:', error);
    throw error;
  }
};

/**
 * Verify phone change with OTP - 4-6 digits (same as web)
 */
export const verifyPhoneChange = async (otpCode: string): Promise<{ success: boolean; message: string; newPhoneNumber?: string }> => {
  try {
    const token = await storage.getAuthToken();
    const userId = await storage.getUserId();
    if (!token || !userId) throw new Error('No authentication data');

    if (otpCode.length < 4 || otpCode.length > 6) {
      throw new Error('OTP must be 4-6 digits');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.USER.CHANGE_PHONE_VERIFY, { userId: String(userId) });
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otpCode }),
    });

    const data = await response.json();
    if (response.status === 200) {
      return {
        success: true,
        message: data.message || 'Phone number updated successfully',
        newPhoneNumber: data.newPhoneNumber || data.phoneNumber,
      };
    }
    throw new Error(data.message || 'Failed to verify OTP');
  } catch (error: any) {
    console.error('❌ [ProfileService] Error verifying phone change:', error);
    throw error;
  }
};

/**
 * Resend OTP for phone change - same as web (primary + fallback)
 */
export const resendPhoneChangeOTP = async (newPhoneNumber: string): Promise<{ success: boolean; message: string }> => {
  try {
    const token = await storage.getAuthToken();
    const userId = await storage.getUserId();
    if (!token || !userId) throw new Error('No authentication data');

    const primaryUrl = buildApiUrlWithParams(API_ENDPOINTS.USER.CHANGE_PHONE, { userId: String(userId) });
    const fallbackUrl = buildApiUrlWithParams(API_ENDPOINTS.USER.CHANGE_PHONE_REQUEST, { userId: String(userId) });

    let response = await fetch(primaryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPhoneNumber }),
    });

    if (response.status === 404) {
      response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPhoneNumber }),
      });
    }

    const data = await response.json();
    if (response.status === 200) {
      return { success: true, message: data.message || 'OTP resent successfully' };
    }
    throw new Error(data.message || 'Failed to resend OTP');
  } catch (error: any) {
    console.error('❌ [ProfileService] Error resending OTP:', error);
    throw error;
  }
};

/**
 * Get current user profile - same endpoint and asset URL building as web
 */
export const getUserProfile = async (): Promise<any> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) throw new Error('No authentication token');

    const url = buildApiUrl(API_ENDPOINTS.USER.PROFILE);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const profile = await response.json();
    if (profile.profileImage) {
      profile.profileImage = buildAssetUrl(profile.profileImage);
    }
    if (profile.avatar) {
      profile.avatar = buildAssetUrl(profile.avatar);
    }
    return profile;
  } catch (error: any) {
    console.error('❌ [ProfileService] Error fetching profile:', error);
    throw error;
  }
};

/**
 * Upload profile image - same endpoint and field as web
 */
export const uploadProfileImage = async (imageAsset: ImagePicker.ImagePickerAsset): Promise<{ success: boolean; message: string; profileImage: string }> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) throw new Error('No authentication token');

    const url = buildApiUrl(API_ENDPOINTS.USER.PROFILE_IMAGE);
    const formData = new FormData();
    const filename = imageAsset.uri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    if (Platform.OS === 'web') {
      try {
        const resp = await fetch(imageAsset.uri);
        const blob = await resp.blob();
        formData.append('profileImage', blob, filename);
      } catch {
        formData.append('profileImage', { uri: imageAsset.uri, type, name: filename } as any);
      }
    } else {
      formData.append('profileImage', { uri: imageAsset.uri, type, name: filename } as any);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload image: ${response.status}`);
    }

    const data = await response.json();
    let fullImageUrl = data.profileImage || data.avatar;
    if (fullImageUrl) fullImageUrl = buildAssetUrl(fullImageUrl);

    return {
      success: true,
      message: data.message || 'Image uploaded successfully',
      profileImage: fullImageUrl,
    };
  } catch (error: any) {
    console.error('❌ [ProfileService] Error uploading profile image:', error);
    throw error;
  }
};

/**
 * Delete account - same as web (DELETE /users/me/account)
 */
export const deleteAccount = async (): Promise<void> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) throw new Error('No authentication token');

    const url = buildApiUrl(API_ENDPOINTS.USER.DELETE_ACCOUNT);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `Failed to delete account: ${response.status}`);
    }
  } catch (error: any) {
    console.error('❌ [ProfileService] Error deleting account:', error);
    throw error;
  }
};
