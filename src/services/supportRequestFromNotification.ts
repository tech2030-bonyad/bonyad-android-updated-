/**
 * Minimal support-request fetch for notification deep links (parity with web supportChatService.getRequestById).
 */

import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';

export interface SupportRequestForNotification {
  id: number;
  assignedAdminId?: number;
  assignedAdminName?: string;
  chatRoomId?: number;
  chatRoomRoomId?: string;
}

export async function getSupportRequestByIdForNotification(requestId: number): Promise<SupportRequestForNotification> {
  const token = await storage.getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const url = buildApiUrlWithParams(API_ENDPOINTS.SUPPORT.REQUEST_BY_ID, { requestId: String(requestId) });
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch support request');
  }
  return response.json();
}
