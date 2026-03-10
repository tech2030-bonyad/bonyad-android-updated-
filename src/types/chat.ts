// Chat-related types and interfaces

// ============================================
// CHATBOT & LIVE AGENT TYPES
// ============================================

// Chatbot Types
export interface ChatbotMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatbotResponse {
  response: string;
  conversationId: string;
  timestamp: string;
}

// AI Conversation History for Live Agent context
export interface AIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Live Agent Types
export type LiveAgentStatus = 'IDLE' | 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface LiveAgentRequest {
  id: number;
  status: LiveAgentStatus;
  assignedAdminId: number | null;
  assignedAdminName: string | null;
  chatRoomId: number;
  chatRoomRoomId: string;
  aiConversationHistory: AIConversationMessage[];
  subject?: string;
  description?: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  duration?: number | null;
}

// Support Chat File Attachment Types
export interface SendMessageWithFileRequest {
  receiverId: number;
  content: string;
  file?: {
    uri: string;
    type: string;
    name: string;
  };
  requestId?: number;
  duration?: number;
}

export interface SendMessageWithFileResponse {
  message: SupportChatMessage & {
    receiverId?: number;
    receiverName?: string;
    isRead?: boolean;
  };
  receiverMessage?: SupportChatMessage & {
    receiverId?: number;
    receiverName?: string;
    isRead?: boolean;
  };
}

// ============================================
// EXISTING CHAT TYPES
// ============================================

export interface ChatRoom {
  id: number;
  roomId: string;
  otherUserId: number;
  otherUserName: string;
  otherUserRole: string;
  otherUserProfileImage?: string | null;
  projectId?: number | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  chatRoomId?: number;
  roomId?: string;
  senderId: number;
  senderName?: string;
  receiverId: number;
  receiverName?: string;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  duration?: number | null; // For voice notes in seconds
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
  isMine?: boolean; // Calculated on client
  messageType?: string; // e.g. 'text'
}

export interface SendMessageRequest {
  receiverId: number;
  content: string;
  file?: {
    uri: string;
    type: string;
    name: string;
  };
}

export interface SendMessageResponse {
  id: number;
  chatRoomId: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  receiverName: string;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
  createdAt: string;
}

// ============================================
// SUPPORT TICKET TYPES (aligned with web SupportTicketService)
// ============================================

export type TicketStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'OPEN'
  | 'WAITING_FOR_CUSTOMER';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';

export type TicketCategory =
  | 'General'
  | 'Billing'
  | 'Technical'
  | 'Account'
  | 'Other';

/** Category node from GET /support/categories/hierarchy (public). */
export interface SupportCategoryHierarchyNode {
  id: number;
  nameAr: string;
  nameEn: string;
  hasChildren?: boolean;
  parentId?: number;
  children?: SupportCategoryHierarchyNode[];
}

/** Category / request type for create form (from hierarchy or request-types). */
export interface SupportRequestType {
  id: number;
  nameEn: string;
  nameAr?: string;
  name?: string;
  parentId?: number | null;
  active?: boolean;
  subcategories?: SupportRequestType[];
}

export interface SupportTicketMessage {
  id: number;
  userId?: number;
  senderId?: number;
  userName: string;
  senderName?: string;
  senderRole?: 'USER' | 'ADMIN';
  content: string;
  attachmentUrls?: string[];
  attachments?: string[];
  fileUrl?: string | null;
  fileType?: string | null;
  duration?: number;
  createdAt: string;
  isRead: boolean;
  readAt?: string | null;
  isAdminMessage?: boolean;
  isInternal?: boolean;
}

export interface TicketMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: 'USER' | 'ADMIN';
  message: string;
  attachments: string[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  isAdminMessage: boolean;
  isInternal: boolean;
}

export interface SupportTicket {
  id: number;
  userId?: number;
  userName?: string;
  subject: string;
  description: string;
  category?: TicketCategory | string;
  subcategory?: string;
  categoryId?: number;
  subcategoryId?: number;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAdminId?: number | null;
  assignedAdminName?: string | null;
  chatRoomId?: number | null;
  chatRoomRoomId?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAt?: string | null;
  resolvedAt?: string | null;
  hasUnreadMessages?: boolean;
  unreadMessageCount?: number;
  rating?: number;
  feedback?: string;
  attachmentUrls?: string[];
  messages?: (SupportTicketMessage | TicketMessage)[];
}

/** Web create-ticket payload: subject, description, priority, categoryId?, subcategoryId?, attachmentUrls? */
export interface CreateTicketRequest {
  subject: string;
  description: string;
  category?: TicketCategory;
  subcategory?: string;
  priority: TicketPriority;
  categoryId?: number;
  subcategoryId?: number;
  attachmentUrls?: string[];
}

export interface TicketRating {
  rating: number;
  feedback?: string;
}

