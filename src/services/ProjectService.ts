/**
 * Project API layer — same contracts as web `src/services/ProjectService.ts`
 * (endpoints, auth headers, regionId on list, normalization). Android screens
 * should call these instead of duplicating fetch logic.
 */
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { normalizeProjectDetailResponse } from '../utils/projectDetailNavigationAndroid';

// ===== TYPE DEFINITIONS (aligned with web) =====

export interface CreateProjectRequest {
  description: string;
  serviceCategoryId?: number;
  serviceSubcategoryId?: number;
  serviceId?: number;
  address: string;
  latitude: number;
  longitude: number;
  timeRequired: number;
  projectType: 'ALL' | 'DIRECT_ASSIGNMENT';
  budget?: number;
  budgetUnspecified?: boolean;
  images?: Array<{ uri: string; type: string; name: string }>;
  assignedTechnicianId?: number;
  assignmentType?: string;
  bidsCloseAt?: string;
  activeDuration?: number;
}

export interface CreateProjectResponse {
  id: number;
  description: string;
  service?: { id: number; nameEn: string; nameAr: string; isCategory: boolean };
  serviceCategory?: { id: number; nameEn: string; nameAr: string; isCategory: boolean };
  serviceId?: number;
  serviceName?: string;
  budget: number | null;
  budgetUnspecified?: boolean;
  address: string;
  latitude: number;
  longitude: number;
  timeRequiredDays?: number;
  timeRequired?: number;
  projectType: string;
  status: string;
  biddingStatus?: string;
  files?: string[];
  activeUntil?: string;
  bidsCloseAt?: string;
  createdAt: string;
}

export interface Project {
  id: number;
  userId: number;
  userName: string;
  serviceId: number;
  serviceName: string;
  description: string;
  budget: number | null;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  projectType: string;
  assignedTechnicianId: number | null;
  files: string[];
  timeRequired: number;
  bidsCloseAt?: string;
  createdAt: string;
  regionId?: number;
}

export interface Phase {
  id: number;
  phaseNumber: number;
  description: string;
  timeSpentDays: number;
  moneySpent: number;
  approvalStatus: string;
  paymentStatus: string;
}

export interface MyProject extends Project {
  assignedTechnicianName?: string;
  phases?: Phase[];
}

// ===== Response helpers (web list can be bare array or wrapped) =====

export function normalizeProjectsFromResponse(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.projects)) return data.projects;
    if (Array.isArray(data.data)) return data.data;
  }
  return [];
}

export function normalizeRegionFieldsOnProjects(list: any[]): any[] {
  return list.map((p: any) => {
    const rawId = p.regionId ?? p.region_id ?? p.region?.id ?? p.zoneId ?? p.zone_id;
    const rid = rawId != null ? Number(rawId) : undefined;
    return {
      ...p,
      regionId: rid === 0 || Number.isFinite(rid) ? rid : undefined,
    };
  });
}

function projectIdsWithBidsFromBidsArray(bidsArray: any[]): Set<number> {
  const ids = new Set<number>();
  for (const bid of bidsArray) {
    const raw = bid?.projectId ?? bid?.project_id;
    if (raw == null || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) ids.add(n);
  }
  return ids;
}

/** After getAvailableProjects: mark open-market rows with userHasBid (same as web ProjectsScreen). */
export async function mergeUserHasBidFlag<T extends { id?: number }>(projects: T[]): Promise<T[]> {
  const token = await storage.getAuthToken();
  if (!token || !projects.length) return projects;
  try {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.BIDS.MY_BIDS), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return projects;
    const myBidsData = await response.json();
    const bidsArray = Array.isArray(myBidsData) ? myBidsData : myBidsData.bids || [];
    const projectsWithBids = projectIdsWithBidsFromBidsArray(bidsArray);
    return projects.map((project: any) => ({
      ...project,
      userHasBid: projectsWithBids.has(Number(project.id)),
    })) as T[];
  } catch (e) {
    console.error('❌ [ProjectService] MY_BIDS merge failed:', e);
    return projects;
  }
}

/** GET /projects/my-assigned — technician running / completed / approved / direct offers */
export async function getMyAssignedProjects(options?: { type?: 'DIRECT_ASSIGNMENT' }): Promise<any[]> {
  const token = await storage.getAuthToken();
  if (!token) return [];
  let url = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_ASSIGNED);
  if (options?.type === 'DIRECT_ASSIGNMENT') {
    url = buildApiUrl(`${API_ENDPOINTS.PROJECTS.MY_ASSIGNED}?type=DIRECT_ASSIGNMENT`);
  }
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ProjectService] MY_ASSIGNED failed:', response.status, errorText);
      return [];
    }
    const data = await response.json();
    return normalizeRegionFieldsOnProjects(normalizeProjectsFromResponse(data));
  } catch (e) {
    console.error('❌ [ProjectService] getMyAssignedProjects:', e);
    return [];
  }
}

/** GET /bids/my mapped to project-shaped rows (technician “My bids” tab) */
export async function getTechnicianMyBidsAsProjectRows(): Promise<any[]> {
  const token = await storage.getAuthToken();
  if (!token) return [];
  try {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.BIDS.MY_BIDS), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return [];
    const bidsData = await response.json();
    const arr = Array.isArray(bidsData) ? bidsData : bidsData.bids || [];
    return arr.map((bid: any) => {
      let projectStatus = 'BID_RECEIVED';
      if (bid.status === 'ACCEPTED') {
        projectStatus = bid.projectStatus || 'APPROVED';
      } else {
        projectStatus = 'BID_RECEIVED';
      }
      return {
        id: bid.projectId,
        description: bid.projectDescription || bid.comment || 'Project',
        budget: bid.projectBudget || bid.proposedBudget || 0,
        status: projectStatus,
        address: bid.projectAddress || '',
        serviceNameEn: bid.serviceNameEn || 'Bid',
        serviceNameAr: bid.serviceNameAr || 'عرض',
        serviceId: bid.serviceId || 0,
        bidId: bid.id,
        proposedBudget: bid.proposedBudget,
        comment: bid.comment,
        estimatedDurationDays: bid.estimatedDurationDays,
        createdAt: bid.createdAt,
      };
    });
  } catch (e) {
    console.error('❌ [ProjectService] getTechnicianMyBidsAsProjectRows:', e);
    return [];
  }
}

export const createProject = async (data: CreateProjectRequest): Promise<CreateProjectResponse> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const formData = new FormData();
    formData.append('description', data.description);
    if (data.serviceCategoryId) {
      formData.append('serviceCategoryId', data.serviceCategoryId.toString());
      if (data.serviceSubcategoryId) {
        formData.append('serviceSubcategoryId', data.serviceSubcategoryId.toString());
      }
    } else if (data.serviceId) {
      formData.append('serviceId', data.serviceId.toString());
    } else {
      throw new Error('Either serviceId or (serviceCategoryId + serviceSubcategoryId) is required');
    }

    formData.append('address', data.address);
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());
    formData.append('timeRequired', data.timeRequired.toString());
    formData.append('projectType', data.projectType);

    if (data.activeDuration) {
      formData.append('activeDuration', data.activeDuration.toString());
    }
    if (data.budgetUnspecified) {
      formData.append('budgetUnspecified', 'true');
    } else if (data.budget !== undefined) {
      formData.append('budget', data.budget.toString());
    }
    if (data.assignedTechnicianId) {
      formData.append('assignedTechnicianId', data.assignedTechnicianId.toString());
    }
    if (data.assignmentType) {
      formData.append('assignmentType', data.assignmentType);
    }
    if (data.bidsCloseAt) {
      formData.append('bidsCloseAt', data.bidsCloseAt);
    }
    if (data.images && data.images.length > 0) {
      data.images.forEach((image, index) => {
        formData.append('images', {
          uri: Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri,
          name: image.name || `photo_${index}.jpg`,
          type: image.type || 'image/jpeg',
        } as any);
      });
    }

    const url = buildApiUrl(API_ENDPOINTS.PROJECTS.CREATE);
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to create project: ${response.status}`);
      } catch {
        throw new Error(`Server error: ${response.status}`);
      }
    }

    return (await response.json()) as CreateProjectResponse;
  } catch (error: any) {
    console.error('❌ [ProjectService] Error creating project:', error);
    throw error;
  }
};

/** Same as web: GET /projects with optional regionId; auth required */
export const getAvailableProjects = async (regionId?: number): Promise<Project[]> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    let url = buildApiUrl(API_ENDPOINTS.PROJECTS.LIST);
    if (regionId != null) {
      url += (url.includes('?') ? '&' : '?') + `regionId=${encodeURIComponent(regionId)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to fetch projects: ${response.status}`);
      } catch {
        throw new Error(`Server error: ${response.status}`);
      }
    }

    const data = await response.json();
    const list = normalizeProjectsFromResponse(data);
    const normalized = normalizeRegionFieldsOnProjects(list);
    return normalized as Project[];
  } catch (error: any) {
    console.error('❌ [ProjectService] Error fetching available projects:', error);
    throw error;
  }
};

/** Same as web: GET /projects/my */
/**
 * GET /projects/:id — same as web ProjectsScreen.fetchFullProjectDetails; merges nested `project` + phases.
 */
export async function fetchProjectById(projectId: number): Promise<any | null> {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      console.warn('⚠️ [ProjectService] No auth token for project details');
      return null;
    }
    const url = buildApiUrl(API_ENDPOINTS.PROJECTS.DETAILS.replace(':id', String(projectId)));
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      console.warn('⚠️ [ProjectService] fetchProjectById failed:', response.status);
      return null;
    }
    const raw = await response.json();
    return normalizeProjectDetailResponse(raw);
  } catch (e) {
    console.error('❌ [ProjectService] fetchProjectById:', e);
    return null;
  }
}

export const getMyProjects = async (): Promise<MyProject[]> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_PROJECTS);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to fetch my projects: ${response.status}`);
      } catch {
        throw new Error(`Server error: ${response.status}`);
      }
    }

    const data = await response.json();
    const list = normalizeProjectsFromResponse(data);
    return normalizeRegionFieldsOnProjects(list) as MyProject[];
  } catch (error: any) {
    console.error('❌ [ProjectService] Error fetching user projects:', error);
    throw error;
  }
};

export const completeProject = async (projectId: number) => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.COMPLETE, { id: projectId });
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to complete project: ${response.status}`);
      } catch {
        throw new Error(`Server error: ${response.status}`);
      }
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ [ProjectService] Error completing project:', error);
    throw error;
  }
};

export const completeProjectByTechnician = async (projectId: number) => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.COMPLETE, { id: projectId });
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ProjectService] Server returned error:', errorText);
      throw new Error(`Failed to complete project: ${response.status}`);
    }

    return { success: true, message: 'Project completed successfully' };
  } catch (error: any) {
    console.error('❌ [ProjectService] Error completing project:', error);
    throw error;
  }
};
