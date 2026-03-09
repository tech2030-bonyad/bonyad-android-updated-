/**
 * Change Request Service – Android
 * Matches web ChangeRequestService; uses CHANGE_REQUESTS endpoints.
 */

import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';

export enum ChangeRequestStatus {
  PENDING = 'PENDING',
  IN_DISCUSSION = 'IN_DISCUSSION',
  RESPONDED = 'RESPONDED',
  PARTIALLY_AGREED = 'PARTIALLY_AGREED',
  AGREED = 'AGREED',
  REJECTED = 'REJECTED',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  USER_SIGNED = 'USER_SIGNED',
  TECHNICIAN_SIGNED = 'TECHNICIAN_SIGNED',
  BOTH_SIGNED = 'BOTH_SIGNED',
  COMPLETED = 'COMPLETED',
}

export interface PhaseChange {
  id?: number;
  phaseId: number | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  phaseNumber: number;
  description: string;
  timeSpentDays: number;
  moneySpent: number;
}

export interface PhaseChangeRequest {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  phaseId?: number | null;
  description?: string;
  timeSpentDays?: number;
  moneySpent?: number;
  phaseNumber?: number;
}

export interface ChangeRequest {
  id: number;
  description: string;
  status: ChangeRequestStatus;
  requestedBy: string;
  requestedAt: string;
  response?: string | null;
  respondedBy?: string | null;
  respondedAt?: string | null;
  agreedChanges?: string | null;
  agreedAt?: string | null;
  userAgreed?: boolean;
  technicianAgreed?: boolean;
  bothAgreed?: boolean;
  agreedChangesByUser?: string | null;
  agreedChangesByTechnician?: string | null;
  userAgreedAt?: string | null;
  technicianAgreedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  reason?: string | null;
  completedAt?: string | null;
  parentRequestId?: number | null;
  newBudget?: number | null;
  userEmail?: string | null;
  technicianEmail?: string | null;
  userPhone?: string | null;
  technicianPhone?: string | null;
  phaseChanges?: PhaseChangeRequest[];
}

export interface RequestChangesRequest {
  description: string;
  parentRequestId?: number | null;
  newBudget?: number | null;
  userEmail?: string | null;
  technicianEmail?: string | null;
  userPhone?: string | null;
  technicianPhone?: string | null;
  phaseChanges?: PhaseChangeRequest[];
}

async function getHeaders(): Promise<Record<string, string>> {
  const token = await storage.getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function getChangeRequestsByProject(projectId: number): Promise<ChangeRequest[]> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.CHANGE_REQUESTS.BY_PROJECT, { projectId });
  const response = await fetch(url, { method: 'GET', headers: await getHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to get change requests' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function getChangeRequestThread(changeRequestId: number): Promise<ChangeRequest[]> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.CHANGE_REQUESTS.THREAD, { changeRequestId });
  const response = await fetch(url, { method: 'GET', headers: await getHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to get thread' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [data];
}

export async function requestChanges(
  projectId: number,
  request: RequestChangesRequest
): Promise<{ message: string; changeRequestId: number; status: ChangeRequestStatus; requestedBy: string; requestedAt: string }> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.CHANGE_REQUESTS.REQUEST, { projectId });
  const response = await fetch(url, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to request changes' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function respondToChangeRequest(
  changeRequestId: number,
  body: { response: string }
): Promise<{ message: string; changeRequestId: number; responseRequestId?: number; status: ChangeRequestStatus; respondedBy: string; respondedAt: string }> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.CHANGE_REQUESTS.RESPOND, { changeRequestId });
  const response = await fetch(url, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to respond' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function agreeOnChanges(
  changeRequestId: number,
  body?: { agreedChanges?: string }
): Promise<{ message: string; changeRequestId: number; status: ChangeRequestStatus }> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.CHANGE_REQUESTS.AGREE, { changeRequestId });
  const response = await fetch(url, {
    method: 'POST',
    headers: await getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to agree' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function rejectChangeRequest(
  changeRequestId: number,
  body?: { reason?: string }
): Promise<{ message: string; changeRequestId: number; status: ChangeRequestStatus; rejectedAt: string; rejectedBy: string }> {
  const url = buildApiUrlWithParams(API_ENDPOINTS.CHANGE_REQUESTS.REJECT, { changeRequestId });
  const response = await fetch(url, {
    method: 'POST',
    headers: await getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to reject' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}
