/**
 * Support Ticket Service – same integration as web (src/services/SupportTicketService.ts).
 * Endpoints: GET /support/categories/hierarchy, POST /support/tickets, GET /support/tickets,
 * GET /support/tickets/:id, POST /support/tickets/:id/messages, PUT /support/tickets/:id/resolve.
 */

import { storage } from '../utils/storage';
import { buildApiUrl, buildApiUrlWithParams, buildAssetUrl, API_ENDPOINTS } from '../config/api';
import type {
  SupportTicket,
  SupportTicketMessage,
  CreateTicketRequest,
  SupportCategoryHierarchyNode,
  SupportRequestType,
  TicketPriority,
  TicketStatus,
} from '../types/chat';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await storage.getAuthToken();
  if (!token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
}

/**
 * Get support category hierarchy (public, no auth).
 * GET /support/categories/hierarchy – for create-ticket category/subcategory.
 */
export async function getSupportCategoriesHierarchy(): Promise<SupportCategoryHierarchyNode[]> {
  const url = buildApiUrl(API_ENDPOINTS.SUPPORT.CATEGORIES_HIERARCHY);
  const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' } });
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => ({
    id: item.id,
    nameAr: item.nameAr ?? '',
    nameEn: item.nameEn ?? item.name ?? '',
    hasChildren: item.hasChildren === true,
    parentId: item.parentId,
    children: Array.isArray(item.children)
      ? item.children.map((c: any) => ({
          id: c.id,
          nameAr: c.nameAr ?? '',
          nameEn: c.nameEn ?? c.name ?? '',
          hasChildren: c.hasChildren === true,
          parentId: c.parentId ?? item.id,
          children: c.children,
        }))
      : undefined,
  }));
}

/**
 * Create a new support ticket – same as web.
 * POST /support/tickets with subject, description, priority, categoryId?, subcategoryId?, attachmentUrls?.
 */
export async function createTicket(payload: CreateTicketRequest): Promise<SupportTicket> {
  const headers = await getAuthHeaders();
  const url = buildApiUrl(API_ENDPOINTS.SUPPORT.TICKETS);
  const body: Record<string, unknown> = {
    subject: payload.subject,
    description: payload.description,
    priority: payload.priority === 'CRITICAL' ? 'URGENT' : payload.priority,
    attachmentUrls: payload.attachmentUrls ?? [],
  };
  if (payload.categoryId != null) body.categoryId = payload.categoryId;
  if (payload.subcategoryId != null) body.subcategoryId = payload.subcategoryId;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to create ticket');
  }
  const data = await response.json();
  return normalizeTicket(data);
}

/**
 * Get my tickets, optionally filtered by status – same as web.
 * GET /support/tickets?status=...
 */
export async function getMyTickets(status?: TicketStatus): Promise<SupportTicket[]> {
  const headers = await getAuthHeaders();
  let url = buildApiUrl(API_ENDPOINTS.SUPPORT.TICKETS);
  if (status) url += `?status=${encodeURIComponent(status)}`;
  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) throw new Error('Failed to get tickets');
  const data = await response.json();
  const list = Array.isArray(data) ? data : (data?.requests ?? data?.data ?? data?.items ?? []);
  return list.map((t: any) => normalizeTicket(t));
}

/**
 * Get ticket details including messages – same as web.
 * GET /support/tickets/:id
 */
export async function getTicketDetails(id: number): Promise<SupportTicket> {
  const headers = await getAuthHeaders();
  const url = buildApiUrlWithParams(API_ENDPOINTS.SUPPORT.TICKET_BY_ID, { id: String(id) });
  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to get ticket');
  }
  const data = await response.json();
  return normalizeTicket(data);
}

/**
 * Add a message to a ticket – same as web.
 * POST /support/tickets/:id/messages
 */
export async function addMessage(
  ticketId: number,
  content: string,
  attachmentUrls: string[] = []
): Promise<SupportTicketMessage> {
  const headers = await getAuthHeaders();
  const url = buildApiUrlWithParams(API_ENDPOINTS.SUPPORT.TICKET_MESSAGES, { id: String(ticketId) });
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: content, content, attachmentUrls }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to add message');
  }
  const data = await response.json();
  return normalizeMessage(data);
}

/**
 * Resolve a ticket – same as web.
 * PUT /support/tickets/:id/resolve
 */
export async function resolveTicket(ticketId: number): Promise<SupportTicket> {
  const headers = await getAuthHeaders();
  const url = buildApiUrlWithParams(API_ENDPOINTS.SUPPORT.TICKET_RESOLVE, { id: String(ticketId) });
  const response = await fetch(url, { method: 'PUT', headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to resolve ticket');
  }
  const data = await response.json();
  return normalizeTicket(data);
}

/** File for sendMessageWithFile: web File or RN { uri, type, name } */
export type SupportTicketFile = File | { uri: string; type: string; name: string };

/**
 * Send a message with file attachment – same as web (POST /support/send-with-file).
 * Use when ticket has assignedAdminId (or other party); requestId is the ticket id.
 */
export async function sendMessageWithFile(params: {
  requestId: number;
  receiverId: number;
  content?: string;
  file: SupportTicketFile;
}): Promise<{ message: SupportTicketMessage; receiverMessage?: SupportTicketMessage }> {
  const token = await storage.getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('receiverId', String(params.receiverId));
  formData.append('content', (params.content != null && params.content.trim() !== '') ? params.content : ' ');
  formData.append('requestId', String(params.requestId));

  const file = params.file;
  if (file instanceof File) {
    formData.append('file', file);
  } else {
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'application/octet-stream',
      name: file.name || 'file',
    } as any);
  }

  const url = buildApiUrl(API_ENDPOINTS.SUPPORT.SEND_WITH_FILE);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to send message with file');
  }

  const data = await response.json();
  const msg = data.message || data;
  return {
    message: normalizeMessage(msg),
    receiverMessage: data.receiverMessage ? normalizeMessage(data.receiverMessage) : undefined,
  };
}

function normalizeMessage(m: any): SupportTicketMessage {
  const content = m.content ?? m.message ?? m.body ?? m.text ?? '';
  const urls = m.attachments ?? m.attachmentUrls ?? [];
  const fileUrl = m.fileUrl ?? (urls[0] ? buildAssetUrl(urls[0]) : null);
  return {
    id: m.id,
    userId: m.userId ?? m.senderId,
    senderId: m.senderId ?? m.userId,
    userName: m.userName ?? m.senderName ?? '',
    senderName: m.senderName ?? m.userName,
    senderRole: m.senderRole,
    content: typeof content === 'string' ? content : String(content || ''),
    attachmentUrls: urls.map((u: string) => buildAssetUrl(u)),
    attachments: urls,
    fileUrl: fileUrl || undefined,
    fileType: m.fileType ?? undefined,
    duration: m.duration,
    createdAt: m.createdAt ?? '',
    isRead: m.isRead ?? false,
    readAt: m.readAt ?? null,
    isAdminMessage: m.isAdminMessage,
    isInternal: m.isInternal,
  };
}

function normalizeTicket(t: any): SupportTicket {
  const messages = (t.messages || []).map((m: any) => {
    const content = m.content ?? m.message ?? m.body ?? m.text ?? '';
    const urls = m.attachments ?? m.attachmentUrls ?? [];
    const fileUrl = m.fileUrl ?? (urls[0] ? buildAssetUrl(urls[0]) : null);
    return {
      id: m.id,
      userId: m.userId ?? m.senderId,
      senderId: m.senderId ?? m.userId,
      userName: m.userName ?? m.senderName ?? '',
      senderName: m.senderName ?? m.userName,
      senderRole: m.senderRole,
      content: typeof content === 'string' ? content : String(content || ''),
      attachmentUrls: urls.map((u: string) => buildAssetUrl(u)),
      attachments: urls,
      fileUrl: fileUrl || undefined,
      fileType: m.fileType ?? undefined,
      duration: m.duration,
      createdAt: m.createdAt ?? '',
      isRead: m.isRead ?? false,
      readAt: m.readAt ?? null,
      isAdminMessage: m.isAdminMessage,
      isInternal: m.isInternal,
    };
  });
  return {
    id: t.id,
    userId: t.userId,
    userName: t.userName ?? '',
    subject: t.subject ?? '',
    description: t.description ?? '',
    status: (t.status ?? 'OPEN') as TicketStatus,
    priority: (t.priority ?? 'MEDIUM') as TicketPriority,
    category: t.category,
    categoryId: t.categoryId,
    subcategoryId: t.subcategoryId,
    assignedAdminId: t.assignedAdminId ?? null,
    assignedAdminName: t.assignedAdminName ?? null,
    attachmentUrls: (t.attachmentUrls || []).map((u: string) => buildAssetUrl(u)),
    createdAt: t.createdAt ?? '',
    updatedAt: t.updatedAt ?? '',
    messages,
    unreadMessageCount: t.unreadMessageCount ?? 0,
    hasUnreadMessages: (t.unreadMessageCount ?? 0) > 0,
  };
}

/** Helper for list/detail UI – status label */
export function getStatusText(status: string, language: 'en' | 'ar' = 'en'): string {
  const statusMap: Record<string, { en: string; ar: string }> = {
    OPEN: { en: 'Open', ar: 'مفتوح' },
    PENDING: { en: 'Pending', ar: 'قيد الانتظار' },
    IN_PROGRESS: { en: 'In Progress', ar: 'قيد التنفيذ' },
    WAITING_FOR_CUSTOMER: { en: 'Waiting for your reply', ar: 'في انتظار ردك' },
    ASSIGNED: { en: 'Assigned', ar: 'تم التعيين' },
    ESCALATED: { en: 'Escalated', ar: 'مُصَعَّد' },
    RESOLVED: { en: 'Resolved', ar: 'تم الحل' },
    CLOSED: { en: 'Closed', ar: 'مغلق' },
    REJECTED: { en: 'Rejected', ar: 'مرفوض' },
  };
  const key = (status || '').toUpperCase().replace(/\s+/g, '_');
  return statusMap[key]?.[language] || status;
}

export function getStatusColor(status: string): string {
  const s = (status || '').toUpperCase().replace(/\s+/g, '_');
  switch (s) {
    case 'OPEN':
    case 'PENDING': return '#FFA500';
    case 'IN_PROGRESS':
    case 'ASSIGNED': return '#3498db';
    case 'WAITING_FOR_CUSTOMER': return '#9b59b6';
    case 'ESCALATED': return '#e67e22';
    case 'RESOLVED': return '#2ecc71';
    case 'CLOSED': return '#95a5a6';
    case 'REJECTED': return '#e74c3c';
    default: return '#7f8c8d';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'URGENT':
    case 'CRITICAL': return '#e74c3c';
    case 'HIGH': return '#e67e22';
    case 'MEDIUM': return '#f39c12';
    case 'LOW': return '#27ae60';
    default: return '#95a5a6';
  }
}

export function getPriorityText(priority: string, language: 'en' | 'ar' = 'en'): string {
  const priorityMap: Record<string, { en: string; ar: string }> = {
    URGENT: { en: 'Urgent', ar: 'عاجل' },
    CRITICAL: { en: 'Critical', ar: 'حرج' },
    HIGH: { en: 'High', ar: 'عالي' },
    MEDIUM: { en: 'Medium', ar: 'متوسط' },
    LOW: { en: 'Low', ar: 'منخفض' },
  };
  return priorityMap[priority]?.[language] || priority;
}

export function getCategoryText(category: string, language: 'en' | 'ar' = 'en'): string {
  const categoryMap: Record<string, { en: string; ar: string }> = {
    General: { en: 'General', ar: 'عام' },
    Billing: { en: 'Billing', ar: 'الفواتير' },
    Technical: { en: 'Technical', ar: 'تقني' },
    Account: { en: 'Account', ar: 'الحساب' },
    Other: { en: 'Other', ar: 'أخرى' },
  };
  return categoryMap[category]?.[language] || category;
}

/** Map hierarchy to SupportRequestType[] for create form (same as web CreateTicketModal) */
export function hierarchyToRequestTypes(hierarchy: SupportCategoryHierarchyNode[]): SupportRequestType[] {
  return hierarchy.map((root) => ({
    id: root.id,
    nameEn: root.nameEn,
    nameAr: root.nameAr,
    name: root.nameEn,
    active: true,
    subcategories: (root.children || []).map((c) => ({
      id: c.id,
      nameEn: c.nameEn,
      nameAr: c.nameAr,
      name: c.nameEn,
      active: true,
    })),
  }));
}

export default {
  getSupportCategoriesHierarchy,
  createTicket,
  getMyTickets,
  getTicketDetails,
  addMessage,
  resolveTicket,
  sendMessageWithFile,
  getStatusText,
  getStatusColor,
  getPriorityText,
  getPriorityColor,
  getCategoryText,
  hierarchyToRequestTypes,
};
