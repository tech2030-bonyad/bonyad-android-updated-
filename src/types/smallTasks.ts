// Small Tasks Type Definitions

export interface SmallTaskType {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  basePrice: number;
  estimatedDuration: number;
  isActive: boolean;
}

export interface SmallTaskRequest {
  id: number;
  taskType: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ASSIGNED';
  createdAt: string;
  bidCount?: number;
  budget?: number;
  amount?: number;
  estimatedDuration?: number;
  userId?: number;
  userName?: string;
  assignedTechnicianId?: number;
  assignedTechnicianName?: string;
}

export interface SmallTaskBid {
  id: number;
  requestId: number;
  technicianId: number;
  technicianName: string;
  technicianPhone?: string;
  technicianAvatar?: string;
  amount: number;
  description: string;
  estimatedHours: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
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

export type SmallTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ASSIGNED';
export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
