/**
 * Presence Service - User online/offline via REST (same as web)
 */

import { buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';

export interface PresenceResponse {
  message: string;
  userId: number;
  timestamp?: string;
  lastSeen?: string;
}

class PresenceService {
  async markOnline(): Promise<PresenceResponse | null> {
    try {
      const token = await storage.getAuthToken();
      if (!token) return null;
      const url = buildApiUrl('/presence/online');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data: PresenceResponse = await response.json();
        if (__DEV__) console.log('🟢 [Presence] User marked as online');
        return data;
      }
      return null;
    } catch (e) {
      if (__DEV__) console.warn('⚠️ [Presence] markOnline failed:', (e as Error)?.message);
      return null;
    }
  }

  async markOffline(): Promise<PresenceResponse | null> {
    try {
      const token = await storage.getAuthToken();
      if (!token) return null;
      const url = buildApiUrl('/presence/offline');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data: PresenceResponse = await response.json();
        if (__DEV__) console.log('🔴 [Presence] User marked as offline');
        return data;
      }
      return null;
    } catch (e) {
      if (__DEV__) console.warn('⚠️ [Presence] markOffline failed:', (e as Error)?.message);
      return null;
    }
  }
}

export const presenceService = new PresenceService();
