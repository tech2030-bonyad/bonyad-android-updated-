/**
 * Rating Service with Category Support
 * Handles rating categories and category-based reviews
 */

import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

// ===== Types =====

export interface RatingCategory {
  id: number;
  nameAr: string;
  nameEn: string;
  displayOrder: number;
  isRequired: boolean;
  isActive: boolean;
}

export interface CategoryRating {
  ratingCategoryId: number;
  ratingValue: number; // 1-5
}

export interface CreateReviewRequest {
  reviewType: 'PROJECT_REVIEW' | 'SMALL_TASK_REVIEW' | 'USER_REVIEW';
  projectId?: number;
  smallTaskRequestId?: number;
  reviewedUserId: number;
  rating: number; // 0.0-5.0
  comment?: string;
  categoryRatings: CategoryRating[];
}

export interface ReviewResponse {
  id: number;
  reviewType: string;
  reviewTypeDisplay: string;
  reviewerId: number;
  reviewerName: string;
  reviewedUserId: number;
  reviewedUserName: string;
  rating: number;
  comment?: string;
  projectId?: number;
  projectDescription?: string;
  smallTaskRequestId?: number;
  smallTaskTypeName?: string;
  categoryRatings: Array<{
    ratingCategoryId: number;
    categoryNameAr: string;
    categoryNameEn: string;
    rating: number;
  }>;
  createdAt: string;
  isLowRating: boolean;
}

// ===== Rating Categories API =====

/**
 * Get all active rating categories
 */
export const getRatingCategories = async (): Promise<RatingCategory[]> => {
  try {
    const token = await storage.getAuthToken();
    
    const url = buildApiUrl(API_ENDPOINTS.RATING_CATEGORIES.LIST);
    
    console.log('📤 [RatingService] Fetching rating categories');
    console.log('   URL:', url);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch rating categories: ${response.status}`);
    }
    
    const categories = await response.json();
    console.log('✅ [RatingService] Loaded categories:', categories.length);
    
    // Sort by displayOrder
    return categories.sort((a: RatingCategory, b: RatingCategory) => 
      a.displayOrder - b.displayOrder
    );
  } catch (error: any) {
    console.error('❌ [RatingService] Error fetching categories:', error);
    throw error;
  }
};

// ===== Review API with Categories =====

/**
 * Create a review with category ratings
 */
export const createReviewWithCategories = async (
  request: CreateReviewRequest
): Promise<ReviewResponse> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = buildApiUrl(API_ENDPOINTS.REVIEWS.CREATE);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 [RatingService] Creating review with categories');
    console.log('   Review Type:', request.reviewType);
    console.log('   Reviewed User ID:', request.reviewedUserId);
    console.log('   Overall Rating:', request.rating);
    console.log('   Category Ratings:', request.categoryRatings.length);
    console.log('   URL:', url);
    console.log('═══════════════════════════════════════════════════════════');
    
    // Validate required categories are included
    const categories = await getRatingCategories();
    const requiredCategories = categories.filter(cat => cat.isRequired && cat.isActive);
    const providedCategoryIds = request.categoryRatings.map(cr => cr.ratingCategoryId);
    const missingRequired = requiredCategories.filter(
      cat => !providedCategoryIds.includes(cat.id)
    );
    
    if (missingRequired.length > 0) {
      const missingNames = missingRequired.map(cat => cat.nameEn).join(', ');
      throw new Error(`Missing required category ratings: ${missingNames}`);
    }
    
    // Validate rating values (1-5)
    for (const catRating of request.categoryRatings) {
      if (catRating.ratingValue < 1 || catRating.ratingValue > 5) {
        throw new Error(`Invalid rating value for category ID ${catRating.ratingCategoryId}. Rating must be between 1 and 5.`);
      }
    }
    
    // Check for duplicates
    const categoryIds = request.categoryRatings.map(cr => cr.ratingCategoryId);
    const uniqueIds = new Set(categoryIds);
    if (categoryIds.length !== uniqueIds.size) {
      throw new Error('Duplicate category ratings found. Each category can only be rated once.');
    }
    
    // Validate comment for low ratings
    if (request.rating < 3.0 && (!request.comment || request.comment.trim().length === 0)) {
      throw new Error('Comment is mandatory for ratings below 3.0');
    }
    
    const requestBody: any = {
      reviewType: request.reviewType,
      reviewedUserId: request.reviewedUserId,
      rating: parseFloat(request.rating.toString()),
      categoryRatings: request.categoryRatings.map(cr => ({
        ratingCategoryId: cr.ratingCategoryId,
        ratingValue: cr.ratingValue,
      })),
    };
    
    if (request.comment && request.comment.trim().length > 0) {
      requestBody.comment = request.comment.trim();
    }
    
    if (request.reviewType === 'PROJECT_REVIEW' && request.projectId) {
      requestBody.projectId = request.projectId;
    }
    
    if (request.reviewType === 'SMALL_TASK_REVIEW' && request.smallTaskRequestId) {
      requestBody.smallTaskRequestId = request.smallTaskRequestId;
    }
    
    console.log('📤 [RatingService] Request Body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const status = response.status;
    console.log('📥 [RatingService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RatingService] Server Error Response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        const errorMessage = errorJson.message || errorJson.error || `Failed to create review: ${status}`;
        throw new Error(errorMessage);
      } catch (parseError) {
        throw new Error(errorText || `Failed to create review: ${status}`);
      }
    }
    
    const data = await response.json();
    console.log('✅ [RatingService] Review created successfully');
    console.log('✅ [RatingService] Review ID:', data.id);
    console.log('═══════════════════════════════════════════════════════════');
    
    return data;
  } catch (error: any) {
    console.error('❌ [RatingService] Error creating review:', error);
    throw error;
  }
};

/**
 * Get reviews for a user
 */
export const getUserReviews = async (userId: number): Promise<ReviewResponse[]> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = buildApiUrl(API_ENDPOINTS.REVIEWS.BY_USER.replace(':userId', userId.toString()));
    
    console.log('📤 [RatingService] Fetching reviews for user:', userId);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to fetch reviews: ${response.status}`);
    }
    
    const reviews = await response.json();
    console.log('✅ [RatingService] Loaded reviews:', reviews.length);
    
    return reviews;
  } catch (error: any) {
    console.error('❌ [RatingService] Error fetching reviews:', error);
    throw error;
  }
};
