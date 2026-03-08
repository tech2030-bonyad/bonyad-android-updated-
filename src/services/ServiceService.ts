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
 * Helper function to get the active image URL for a service
 * Uses useSvg flag to determine whether to use SVG or photo
 */
export function getServiceImageUrl(service: ServiceCategoryOrSub): string | null {
  const baseUrl = getServerBaseUrl();
  
  if (service.useSvg && service.svgUrl) {
    return `${baseUrl}${service.svgUrl}`;
  } else if (service.imageUrl) {
    return `${baseUrl}${service.imageUrl}`;
  }
  
  return null;
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
