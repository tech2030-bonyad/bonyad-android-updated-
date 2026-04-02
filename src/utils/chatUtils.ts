// Chat utility functions

import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from './storage';
import type { ChatRoom } from '../types/chat';

/**
 * Generate a consistent room ID for two users
 * Format: room-{smallerId}-{largerId}
 * Always puts smaller ID first to ensure both users get the same room ID
 */
export const generateRoomId = (userId: number, otherUserId: number): string => {
  const smallerId = Math.min(userId, otherUserId);
  const largerId = Math.max(userId, otherUserId);
  
  return `room-${smallerId}-${largerId}`;
};

/** Sorted pair fallback when backend has not created a room yet (aligned with web chatUtils). */
function deterministicPairRoomId(a: number, b: number): string {
  const id1 = String(a);
  const id2 = String(b);
  const sorted = [id1, id2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Extract a chat room id from notification deep links (full URL, path-only, or query).
 */
export function tryParseChatRoomIdFromActionUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const t = url.trim();
  if (!t) return null;

  const fromQueryString = (s: string): string | null => {
    const m = s.match(/[?&](?:roomId|room_id)=([^&#]+)/i);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  };

  const fromPath = (s: string): string | null => {
    const m = s.match(/\/(?:chat|chat-detail|messages)\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  };

  try {
    const withBase = t.startsWith('http') ? t : `https://placeholder.invalid${t.startsWith('/') ? '' : '/'}${t}`;
    const u = new URL(withBase);
    const q = u.searchParams.get('roomId') ?? u.searchParams.get('room_id');
    if (q) return q;
    const p = fromPath(u.pathname);
    if (p) return p;
  } catch {
    /* relative or malformed */
  }

  const q = fromQueryString(t);
  if (q) return q;
  return fromPath(t);
}

export const getOrCreateRoomId = async (otherUserId: number): Promise<string> => {
  try {
    const token = await storage.getAuthToken();
    const currentUserId = await storage.getUserId();

    if (!token || currentUserId == null) {
      return deterministicPairRoomId(currentUserId ?? 0, otherUserId);
    }

    const url = buildApiUrl(API_ENDPOINTS.CHAT.MY_CHATS);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const responseText = await response.text();
      if (responseText && responseText.trim() !== '') {
        const responseData = JSON.parse(responseText);
        let chatRooms: ChatRoom[] = [];
        if (Array.isArray(responseData)) {
          chatRooms = responseData;
        } else if (responseData?.data) {
          chatRooms = responseData.data;
        } else if (responseData?.rooms) {
          chatRooms = responseData.rooms;
        } else if (responseData?.chatRooms) {
          chatRooms = responseData.chatRooms;
        }
        const existingRoom = chatRooms.find((room) => room.otherUserId === otherUserId);
        if (existingRoom) {
          return existingRoom.roomId;
        }
      }
    }

    return deterministicPairRoomId(currentUserId, otherUserId);
  } catch {
    const currentUserId = await storage.getUserId();
    return deterministicPairRoomId(currentUserId ?? 0, otherUserId);
  }
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string, isArabic = false): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isArabic) {
    if (diffInSeconds < 60) return 'الآن';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} ${diffInMinutes === 1 ? 'دقيقة' : 'دقائق'}`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ${diffInHours === 1 ? 'ساعة' : 'ساعات'}`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `منذ ${diffInDays} ${diffInDays === 1 ? 'يوم' : 'أيام'}`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `منذ ${diffInWeeks} ${diffInWeeks === 1 ? 'أسبوع' : 'أسابيع'}`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `منذ ${diffInMonths} ${diffInMonths === 1 ? 'شهر' : 'أشهر'}`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `منذ ${diffInYears} ${diffInYears === 1 ? 'سنة' : 'سنوات'}`;
  }

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
};

/**
 * Format time (e.g., "10:30 AM")
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format date (e.g., "Jan 15, 2025")
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format message timestamp for chat bubble
 */
export const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  // If less than 24 hours, show time
  if (diffInDays < 1) {
    return formatTime(dateString);
  }

  // If less than 7 days, show day of week
  if (diffInDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Otherwise show date
  return formatDate(dateString);
};

