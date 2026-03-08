/**
 * Small Task Types API Service
 * Base: https://bonyad-app-nyayeditqq-ww.a.run.app/api
 * 
 * Endpoint: GET /api/small-tasks/types
 */

import { buildApiUrl, getServerBaseUrl, API_ENDPOINTS } from '../config/api';

export interface SmallTaskType {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  icon?: string | null;
  imageUrl?: string | null;
  svgUrl?: string | null;
  useSvg: boolean;
  activeImageUrl: string;
  imageType: 'svg' | 'photo';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmallTaskTypesResponse {
  taskTypes: SmallTaskType[];
  count: number;
}

/**
 * Get all active small task types
 * GET /api/small-tasks/types
 * 
 * This is a public endpoint - no authentication required
 */
export async function getSmallTaskTypes(): Promise<SmallTaskType[]> {
  const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.TYPES);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch small task types: ${response.status}`);
  }

  const data: SmallTaskTypesResponse = await response.json();
  return data.taskTypes || [];
}

/**
 * Helper function to get the full image URL for a small task type
 * Uses activeImageUrl which already points to the correct image (SVG or photo)
 */
export function getSmallTaskTypeImageUrl(taskType: SmallTaskType): string | null {
  if (!taskType.activeImageUrl) return null;
  const baseUrl = getServerBaseUrl();
  return `${baseUrl}${taskType.activeImageUrl}`;
}

/**
 * Filter small task types by search query
 * Searches in both name and description (English and Arabic)
 */
export function filterSmallTaskTypes(
  taskTypes: SmallTaskType[],
  query: string,
  language: 'en' | 'ar' = 'en'
): SmallTaskType[] {
  if (!query.trim()) return taskTypes;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return taskTypes.filter((taskType) => {
    const name = language === 'ar' ? taskType.nameAr : taskType.nameEn;
    const description = language === 'ar' 
      ? (taskType.descriptionAr || taskType.description)
      : (taskType.descriptionEn || taskType.description);
    
    const nameMatch = name?.toLowerCase().includes(lowerQuery) || false;
    const descMatch = description?.toLowerCase().includes(lowerQuery) || false;
    
    return nameMatch || descMatch;
  });
}
