import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';

// ===== TYPE DEFINITIONS (aligned with web) =====

/**
 * Request interface for creating a project.
 * New method: serviceCategoryId + serviceSubcategoryId.
 * Legacy: serviceId.
 */
export interface CreateProjectRequest {
  title?: string;
  description: string;
  targetScope?: string;
  timeline?: string;
  requirements?: string;
  projectPurpose?: string;
  deliverables?: string;
  projectPhases?: string[];
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

/**
 * Response interface for created project (aligned with web).
 */
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

/**
 * Create a new project (User). Same backend contract as web.
 * Uses FormData: description, serviceCategoryId/serviceSubcategoryId or serviceId, address, lat/long, timeRequired, projectType, budget/budgetUnspecified, images, assignedTechnicianId, assignmentType, bidsCloseAt, activeDuration.
 */
export const createProject = async (data: CreateProjectRequest): Promise<CreateProjectResponse> => {
  try {
    const token = await storage.getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const formData = new FormData();
    if (data.title) {
      formData.append('title', data.title);
    }
    formData.append('description', data.description);
    if (data.targetScope) {
      formData.append('targetScope', data.targetScope);
    }
    if (data.timeline) {
      formData.append('timeline', data.timeline);
    }
    if (data.requirements) {
      formData.append('requirements', data.requirements);
    }
    if (data.projectPurpose) {
      formData.append('projectPurpose', data.projectPurpose);
    }
    if (data.deliverables) {
      formData.append('deliverables', data.deliverables);
    }
    if (data.projectPhases && data.projectPhases.length > 0) {
      formData.append('projectPhases', JSON.stringify(data.projectPhases));
    }

    if (data.serviceCategoryId) {
      formData.append('serviceCategoryId', data.serviceCategoryId.toString());
      if (data.serviceSubcategoryId) {
        formData.append('serviceSubcategoryId', data.serviceSubcategoryId.toString());
      }
    } else if (data.serviceId) {
      formData.append('serviceId', data.serviceId.toString());
    } else {
      throw new Error('Either serviceId or serviceCategoryId is required');
    }

    formData.append('address', data.address);
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());
    formData.append('timeRequired', data.timeRequired.toString());
    formData.append('projectType', data.projectType);

    if (data.activeDuration != null) {
      formData.append('activeDuration', data.activeDuration.toString());
    }

    if (data.budgetUnspecified) {
      formData.append('budgetUnspecified', 'true');
    } else if (data.budget !== undefined) {
      formData.append('budget', data.budget.toString());
    }

    if (data.assignedTechnicianId != null) {
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to create project: ${response.status}`);
      } catch (e: any) {
        if (e.message && e.message.startsWith('Failed to create')) throw e;
        throw new Error(`Server error: ${response.status}`);
      }
    }

    const responseData = await response.json();
    return responseData as CreateProjectResponse;
  } catch (error: any) {
    console.error('❌ [ProjectService] Error creating project:', error);
    throw error;
  }
};

/**
 * Complete a project by marking it as COMPLETED
 * @param projectId - The ID of the project to complete
 * @returns Promise with the completed project data
 */
export const completeProject = async (projectId: number) => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.COMPLETE, {
      id: projectId,
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ [ProjectService] Marking project as complete');
    console.log('✅ [ProjectService] Project ID:', projectId);
    console.log('✅ [ProjectService] URL:', url);
    console.log('✅ [ProjectService] Method: POST');
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [ProjectService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ProjectService] Error response:', errorText);
      
      // Parse error message
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to complete project: ${status}`);
      } catch {
        throw new Error(`Server error: ${status}`);
      }
    }
    
    const data = await response.json();
    console.log('📥 [ProjectService] Response Data:', data);
    console.log(`✅ [ProjectService] Project ${projectId} marked as COMPLETED`);
    console.log('═══════════════════════════════════════════════════════════');
    
    return data;
    
  } catch (error: any) {
    console.error('❌ [ProjectService] Error completing project:', error);
    throw error;
  }
};

/**
 * Complete a project by technician - marks project as COMPLETED
 * @param projectId - The ID of the project to complete
 * @returns Promise with success status and message
 */
export const completeProjectByTechnician = async (projectId: number) => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.COMPLETE, {
      id: projectId,
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ [ProjectService] Technician marking project as complete');
    console.log('📤 [ProjectService] API URL:', url);
    console.log('📤 [ProjectService] Method: POST');
    console.log('📤 [ProjectService] Token:', token.substring(0, 20) + '...');
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [ProjectService] Status Code:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ProjectService] Server returned error:', errorText);
      throw new Error(`Failed to complete project: ${status}`);
    }
    
    const responseText = await response.text();
    console.log('📥 [ProjectService] Response Body:', responseText);
    console.log(`✅ [ProjectService] Project ${projectId} marked as COMPLETED by technician`);
    console.log('═══════════════════════════════════════════════════════════');
    
    return {
      success: true,
      message: 'Project completed successfully',
    };
    
  } catch (error: any) {
    console.error('❌ [ProjectService] Error completing project:', error);
    throw error;
  }
};

