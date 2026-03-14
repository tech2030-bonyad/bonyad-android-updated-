/**
 * Service Categories & Subcategories API
 * Base: https://bonyad-app-nyayeditqq-ww.a.run.app/api
 * 
 * Endpoints:
 * - GET /api/services - Get all services (categories + subcategories)
 * - GET /api/services/categories - Get only main categories
 * - GET /api/services/{categoryId}/subcategories - Get subcategories for a category
 */

import { buildApiUrl, buildApiUrlWithParams, getServerBaseUrl, API_ENDPOINTS } from '../config/api';

export interface ParentService {
  id: number;
  nameEn: string;
  nameAr?: string;
}

export interface ServiceCategoryOrSub {
  id: number;
  nameEn: string;
  nameAr?: string;
  description?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  imageUrl?: string | null;
  svgUrl?: string | null;
  useSvg: boolean;
  isActive: boolean;
  isCategory: boolean;
  parentService?: ParentService | null;
  displayOrder?: number;
  iconUrl?: string | null;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Only categories (isCategory = true) from GET /services/categories */
export type ServiceCategory = ServiceCategoryOrSub;

/** Subcategories (isCategory = false) from GET /services/:categoryId/subcategories */
export type ServiceSubcategory = ServiceCategoryOrSub;

/**
 * Get the display icon path/URL for a category or subcategory (same as web).
 * Priority: useSvg && svgUrl → imageUrl → iconUrl (legacy).
 * Returns the raw path (e.g. "/uploads/...") or full URL if already absolute.
 */
export function getDisplayIconUrl(service: ServiceCategoryOrSub): string | null {
  if (service.useSvg && service.svgUrl && String(service.svgUrl).trim()) {
    return service.svgUrl;
  }
  if (service.imageUrl && String(service.imageUrl).trim()) {
    return service.imageUrl;
  }
  if (service.iconUrl && String(service.iconUrl).trim()) {
    return service.iconUrl;
  }
  const raw = service as Record<string, unknown>;
  const icon = raw.icon ?? raw.image;
  if (icon && typeof icon === 'string' && icon.trim()) {
    return icon.trim();
  }
  return null;
}

/**
 * Get full URL for the display icon (same logic as web getImageUrl).
 * Use this when rendering: prepend server base URL to relative paths.
 */
export function getDisplayIconFullUrl(service: ServiceCategoryOrSub): string | null {
  const path = getDisplayIconUrl(service);
  if (!path) return null;
  const s = path.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const base = getServerBaseUrl();
  return `${base}${s.startsWith('/') ? s : '/' + s}`;
}

/**
 * Helper function to get the active image URL for a service (legacy).
 * Prefer getDisplayIconUrl + getDisplayIconFullUrl for consistency with web.
 */
export function getServiceImageUrl(service: ServiceCategoryOrSub): string | null {
  return getDisplayIconFullUrl(service);
}

/**
 * Get all services (categories + subcategories).
 * GET /api/services
 */
export async function getAllServices(): Promise<ServiceCategoryOrSub[]> {
  const url = buildApiUrl(API_ENDPOINTS.SERVICES.LIST);
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch services: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get all categories only (main service groups).
 * GET /api/services/categories
 */
export async function getCategories(): Promise<ServiceCategory[]> {
  const url = buildApiUrl(API_ENDPOINTS.SERVICES.CATEGORIES);
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get subcategories for a category.
 * GET /api/services/:categoryId/subcategories
 */
export async function getSubcategories(categoryId: number): Promise<ServiceSubcategory[]> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.SERVICES.SUBCATEGORIES, {
    categoryId,
  });
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch subcategories: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}
