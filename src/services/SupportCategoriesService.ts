/**
 * Support Categories API Service
 * Handles fetching support ticket categories and subcategories
 */

import { buildApiUrl, API_ENDPOINTS } from '../config/api';

export interface SupportCategory {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
  parentId: number | null;
  parentName: string | null;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  slaResponseHours: number;
  slaResolutionHours: number;
  slaResponseFormatted: string;
  slaResolutionFormatted: string;
  hasChildren: boolean;
  children?: SupportCategory[];
}

export interface SupportCategoryResponse {
  categories: SupportCategory[];
  total: number;
}

/**
 * Get all support categories with subcategories
 */
export async function getAllSupportCategories(): Promise<SupportCategory[]> {
  const response = await fetch(buildApiUrl(API_ENDPOINTS.SUPPORT.CATEGORIES), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch support categories: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.categories || data || []);
}

/**
 * Get root categories only (no subcategories)
 */
export async function getRootSupportCategories(): Promise<SupportCategory[]> {
  const response = await fetch(
    buildApiUrl('/api/support/categories/root'),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch root categories: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.categories || data || []);
}

/**
 * Get category hierarchy (tree structure)
 */
export async function getCategoryHierarchy(): Promise<SupportCategory[]> {
  const response = await fetch(
    buildApiUrl('/api/support/categories/hierarchy'),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch category hierarchy: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.categories || data || []);
}

/**
 * Get subcategories by parent ID
 */
export async function getSubcategories(parentId: number): Promise<SupportCategory[]> {
  const response = await fetch(
    buildApiUrl(`/api/support/categories/${parentId}/subcategories`),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch subcategories: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.categories || data || []);
}

