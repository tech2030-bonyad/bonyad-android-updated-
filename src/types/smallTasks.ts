// Small Tasks Type Definitions

export interface SmallTaskType {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  basePrice?: number;
  estimatedDuration?: number;
  isActive: boolean;
}

export type SmallTaskPaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface SmallTaskRequest {
  id: number;
  taskType?: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
  taskTypeId?: number;
  taskTypeNameEn?: string;
  taskTypeNameAr?: string;
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ASSIGNED';
  paymentStatus?: SmallTaskPaymentStatus | null;
  createdAt: string;
  bidCount?: number;
  bidsCount?: number;
  budget?: number;
  amount?: number;
  estimatedDuration?: number;
  userId?: number;
  userName?: string;
  assignedTechnicianId?: number;
  assignedTechnicianName?: string;
  acceptedBidId?: number;
  acceptedTechnicianId?: number;
  acceptedTechnicianName?: string;
}

export interface SmallTaskBid {
  id: number;
  requestId?: number;
  smallTaskRequestId?: number;
  technicianId: number;
  technicianName: string;
  technicianPhone?: string;
  technicianAvatar?: string;
  amount?: number;
  price?: number;
  description?: string;
  notes?: string;
  estimatedHours?: number;
  estimatedDuration?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
  request?: SmallTaskRequest;
}

export interface ServiceSuggestion {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  category: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
  technicianId?: number;
  technicianName?: string;
}

export interface TaskTypeRequest {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  estimatedDuration: number;
  suggestedBasePrice: number;
  category?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
  technicianId?: number;
  technicianName?: string;
}

export type SmallTaskStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ASSIGNED';
export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
