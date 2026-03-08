/**
 * Terms and Conditions Service
 * Handles fetching terms for users and technicians
 */

import { buildApiUrl, API_ENDPOINTS } from '../config/api';

export interface TermsAndConditions {
  id: number;
  contentAr: string;
  contentEn: string;
  type: 'USER' | 'TECHNICIAN';
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch terms and conditions for users
 * GET /api/terms/user
 */
export async function getUserTerms(): Promise<TermsAndConditions | null> {
  try {
    const url = buildApiUrl('/terms/user');
    console.log('🔍 [TermsService] Fetching user terms from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 [TermsService] User terms response status:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('⚠️ [TermsService] User terms not found (404)');
        return null;
      }
      throw new Error(`Failed to fetch user terms: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [TermsService] User terms fetched successfully (ID:', data.id, ')');

    // Handle empty response
    if (data.message && !data.id) {
      return null;
    }

    return data as TermsAndConditions;
  } catch (error) {
    console.error('❌ [TermsService] Error fetching user terms:', error);
    return null;
  }
}

/**
 * Fetch terms and conditions for technicians
 * GET /api/terms/technician
 */
export async function getTechnicianTerms(): Promise<TermsAndConditions | null> {
  try {
    const url = buildApiUrl('/terms/technician');
    console.log('🔍 [TermsService] Fetching technician terms from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 [TermsService] Technician terms response status:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('⚠️ [TermsService] Technician terms not found (404)');
        return null;
      }
      throw new Error(`Failed to fetch technician terms: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [TermsService] Technician terms fetched successfully (ID:', data.id, ')');

    // Handle empty response
    if (data.message && !data.id) {
      return null;
    }

    return data as TermsAndConditions;
  } catch (error) {
    console.error('❌ [TermsService] Error fetching technician terms:', error);
    return null;
  }
}

/**
 * Get terms by type (generic)
 * GET /api/terms?type={type}
 */
export async function getTermsByType(type: 'USER' | 'TECHNICIAN'): Promise<TermsAndConditions | null> {
  console.log('🔄 [TermsService] getTermsByType called with type:', type);
  if (type === 'USER') {
    return getUserTerms();
  }
  return getTechnicianTerms();
}

/**
 * Approve terms and conditions
 * POST /api/users/terms/approve (to be implemented on backend)
 */
export async function approveTerms(
  termsId: number,
  version: string,
  token: string
): Promise<boolean> {
  try {
    // Note: This endpoint needs to be implemented on the backend
    const url = buildApiUrl('/users/terms/approve');
    console.log('📤 [TermsService] Approving terms:', { termsId, version, url });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        termsId,
        version,
      }),
    });

    console.log('📥 [TermsService] Approve terms response status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('❌ [TermsService] Error approving terms:', error);
    return false;
  }
}

/**
 * Get formatted content based on language
 */
export function getTermsContent(
  terms: TermsAndConditions,
  language: 'ar' | 'en' = 'en'
): string {
  return language === 'ar' ? terms.contentAr : terms.contentEn;
}
