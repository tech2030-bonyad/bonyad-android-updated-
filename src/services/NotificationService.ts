/**
 * Notification Service – same API as web (src/services/NotificationService.ts).
 * Fetch, mark as read, mark all read, delete via REST.
 */

import { storage } from '../utils/storage';
import { buildApiUrl, buildApiUrlWithParams, API_ENDPOINTS } from '../config/api';

export interface Notification {
  id: number;
  fromUserId?: number;
  fromUserName?: string;
  fromUserRole?: string;
  notificationType: string;
  title: string;
  message: string;
  relatedProjectId?: number;
  relatedPhaseId?: number;
  relatedBidId?: number;
  relatedAppointmentId?: number;
  relatedTimeRequestId?: number;
  relatedReviewId?: number;
  read: boolean;
  readAt?: string;
  createdAt: string;
  actionUrl?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await storage.getAuthToken();
  if (!token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch my notifications – same as web.
 * GET /notifications/my-notifications
 */
export async function fetchNotifications(): Promise<Notification[]> {
  try {
    const headers = await getAuthHeaders();
    const url = buildApiUrl(API_ENDPOINTS.NOTIFICATIONS.MY_NOTIFICATIONS);
    const response = await fetch(url, { method: 'GET', headers });
    if (response.ok) {
      const data = await response.json();
      return (Array.isArray(data) ? data : []).map((n: any) => ({
        ...n,
        read: n.read !== undefined ? Boolean(n.read) : Boolean(n.isRead),
        readAt: n.readAt ?? n.read_at ?? undefined,
        createdAt: n.createdAt ?? n.created_at ?? new Date().toISOString(),
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}

/**
 * Mark one notification as read – same as web.
 * POST /notifications/:id/read
 */
export async function markAsRead(id: number): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const url = buildApiUrlWithParams(API_ENDPOINTS.NOTIFICATIONS.MARK_READ, { id });
    const response = await fetch(url, { method: 'POST', headers });
    return response.ok;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read – same as web.
 * POST /notifications/mark-all-read
 */
export async function markAllAsRead(): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const url = buildApiUrl(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    const response = await fetch(url, { method: 'POST', headers });
    return response.ok;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return false;
  }
}

/**
 * Delete a notification – same as web.
 * DELETE /notifications/:id
 */
export async function deleteNotification(id: number): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const url = buildApiUrlWithParams(API_ENDPOINTS.NOTIFICATIONS.DELETE, { id });
    const response = await fetch(url, { method: 'DELETE', headers });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return false;
  }
}

export const notificationService = {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

export default notificationService;
