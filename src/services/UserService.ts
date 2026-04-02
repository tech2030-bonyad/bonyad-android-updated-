import { storage } from '../utils/storage';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

/**
 * User search result (e.g. technician for direct assignment)
 */
export interface UserSearchResult {
  id: number;
  name: string;
  phoneNumber: string;
  role: string;
  status?: string;
  email?: string;
}

function digitsOnly(s: string): string {
  return (s || '').replace(/\D/g, '');
}

/** Match local vs international formats (e.g. 5xxxxxxxx vs 9665xxxxxxxx). */
function phoneNumbersMatch(input: string, candidate: string): boolean {
  const a = digitsOnly(input);
  const b = digitsOnly(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  const tailA = a.slice(-9);
  const tailB = b.slice(-9);
  if (tailA.length >= 9 && tailB.length >= 9 && tailA === tailB) return true;
  return a.endsWith(b) || b.endsWith(a);
}

function toUserSearchResult(raw: any): UserSearchResult {
  const id = Number(raw?.id ?? raw?.userId);
  if (!Number.isFinite(id)) {
    throw new Error('Invalid user id in response');
  }
  return {
    id,
    name: String(raw?.name ?? ''),
    phoneNumber: String(raw?.phoneNumber ?? ''),
    role: String(raw?.role ?? 'TECHNICIAN'),
    status: raw?.status,
    email: raw?.email,
  };
}

async function fetchApprovedTechniciansList(): Promise<any[]> {
  const token = await storage.getAuthToken();
  if (!token) {
    throw new Error('No authentication token');
  }
  /** Use /users/technicians — not /users/search (that path is captured as /users/{id} on the server). */
  const url = buildApiUrl(API_ENDPOINTS.USER.TECHNICIANS_LIST);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    let message = `Search failed: ${response.status}`;
    try {
      const err = JSON.parse(errorText);
      message = err.message || err.error || message;
    } catch {
      if (errorText) message = errorText;
    }
    throw new Error(message);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Find an approved technician by phone (client-side match on list from GET /api/users/technicians).
 * Avoids GET /api/users/search which the server routes as /users/{id} with id "search".
 */
export const searchUserByPhone = async (phoneNumber: string): Promise<UserSearchResult> => {
  const trimmed = (phoneNumber || '').trim().replace(/\s/g, '');
  if (!trimmed) {
    throw new Error('Phone number is required');
  }

  const technicians = await fetchApprovedTechniciansList();
  const match = technicians.find((u: any) => {
    const role = String(u?.role ?? '').toUpperCase();
    if (role && role !== 'TECHNICIAN') return false;
    return phoneNumbersMatch(trimmed, String(u?.phoneNumber ?? ''));
  });

  if (!match) {
    throw new Error('Technician not found');
  }

  return toUserSearchResult(match);
};
