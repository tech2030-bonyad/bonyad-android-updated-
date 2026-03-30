import { Linking } from 'react-native';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from './storage';
import { navigateToProjectDetailFromPayload, type ProjectNavigationDeps } from './projectDetailNavigationAndroid';
import type { Notification } from '../services/NotificationService';

export type NotificationNavigationDeps = ProjectNavigationDeps & {
  /** When set, MESSAGE notifications open this thread instead of only chat list. */
  openChatFromNotification?: (n: Notification) => void | Promise<void>;
  /** Open live support chat for `support://request/{id}` (backend support chat request). */
  openSupportChatFromRequestId?: (requestId: number) => void | Promise<void>;
  setSelectedSupportTicketId?: (id: number | null) => void;
};

/**
 * Backend stores small-task deep links in `actionUrl` (custom scheme, not https), e.g.:
 * `smalltask://request/123` or `smalltask://request/123/bid/456`
 * (NotificationService.notifyNewSmallTaskRequest, notifyNewSmallTaskBid, etc.)
 */
export function parseSmallTaskActionUrl(url: string | undefined | null): {
  requestId: number;
  bidId?: number;
} | null {
  if (url == null || typeof url !== 'string') return null;
  const u = url.trim();
  const m = u.match(/^smalltask:\/\/request\/(\d+)(?:\/bid\/(\d+))?$/i);
  if (!m) return null;
  const requestId = Number(m[1]);
  const bidId = m[2] != null ? Number(m[2]) : undefined;
  if (!Number.isFinite(requestId) || requestId <= 0) return null;
  if (bidId != null && (!Number.isFinite(bidId) || bidId <= 0)) return null;
  return { requestId, bidId };
}

/**
 * Live support chat request deep link from backend (`NotificationService.notifySupportRequest*`).
 * Example: `support://request/42`
 */
export function parseSupportRequestActionUrl(url: string | undefined | null): number | null {
  if (url == null || typeof url !== 'string') return null;
  const m = url.trim().match(/^support:\/\/request\/(\d+)$/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Deep link to a formal support ticket (ticket center), if backend sends it. */
export function parseSupportTicketDeepLink(url: string | undefined | null): number | null {
  if (url == null || typeof url !== 'string') return null;
  const u = url.trim();
  let m = u.match(/^support:\/\/ticket\/(\d+)$/i);
  if (m) {
    const id = Number(m[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  m = u.match(/\/support\/tickets\/(\d+)/i);
  if (m) {
    const id = Number(m[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  return null;
}

function tryParseTicketIdAfterHash(text: string | undefined | null): number | null {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/#(\d{1,12})\b/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function extractSupportTicketIdForNavigation(
  notification: Notification,
  typeUpper: string
): number | null {
  const raw =
    notification.relatedSupportTicketId ??
    (notification as any).related_support_ticket_id ??
    (notification as any).ticketId ??
    (notification as any).ticket_id;
  if (raw != null && raw !== '') {
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) return id;
  }
  const fromUrl =
    parseSupportTicketDeepLink(notification.actionUrl) ??
    tryParseTicketIdAfterHash(notification.actionUrl);
  if (fromUrl != null) return fromUrl;

  const ticketish =
    typeUpper.startsWith('TICKET_') ||
    typeUpper === 'SLA_BREACH' ||
    typeUpper === 'SLA_WARNING' ||
    typeUpper === 'CSAT_SURVEY' ||
    typeUpper === 'LOW_CSAT_ALERT';
  if (!ticketish) return null;
  return (
    tryParseTicketIdAfterHash(notification.message) ?? tryParseTicketIdAfterHash(notification.title)
  );
}

/**
 * Maps notification types to ProfileScreen sidebar sections (`profileSectionIntent.section`).
 * See ProfileScreen `applyProfileSectionRef` switch (editProfile, changePassword, subscription, etc.).
 */
export function profileSectionForNotificationType(
  typeUpper: string,
  userRole: 'user' | 'technician'
): string | null {
  if (typeUpper.startsWith('SUBSCRIPTION_')) {
    return 'subscription';
  }
  if (typeUpper === 'PASSWORD_RESET_SUCCESS') {
    return 'changePassword';
  }
  if (typeUpper === 'ACCOUNT_SUSPENDED' && userRole === 'user') {
    return 'support';
  }
  if (typeUpper === 'ADMIN_REQUEST' && userRole === 'user') {
    return 'editProfile';
  }
  if (typeUpper === 'ACCOUNT_VERIFIED' || typeUpper === 'ACCOUNT_UNSUSPENDED') {
    return 'editProfile';
  }
  if (typeUpper === 'ACCOUNT_APPROVED' && userRole === 'user') {
    return 'editProfile';
  }
  if (typeUpper === 'SUGGESTION_APPROVED' || typeUpper === 'SUGGESTION_REJECTED') {
    return 'services';
  }
  if (typeUpper === 'REVIEW_RECEIVED' || typeUpper === 'REVIEW_RESPONSE') {
    return 'portfolio';
  }
  if (
    typeUpper === 'SLA_BREACH' ||
    typeUpper === 'SLA_WARNING' ||
    typeUpper === 'CSAT_SURVEY' ||
    typeUpper === 'LOW_CSAT_ALERT'
  ) {
    return 'support';
  }
  return null;
}

function scheduleNavigate(
  navigate: (screen: string, params?: Record<string, string>) => void | Promise<void>,
  screen: string,
  params?: Record<string, string>
) {
  void navigate(screen, params);
}

function navigateFromSmallTaskActionUrl(
  typeUpper: string,
  userRole: 'user' | 'technician',
  requestId: number,
  deps: Pick<
    NotificationNavigationDeps,
    'navigate' | 'setSelectedSmallTaskRequest' | 'setProjectsFilterState'
  >
): void {
  const { navigate, setSelectedSmallTaskRequest, setProjectsFilterState } = deps;
  const idParams = { id: String(requestId) };

  setProjectsFilterState({
    projectTypeFilter: 'small',
    activeFilter: 'all',
  });
  setSelectedSmallTaskRequest({ id: requestId });

  if (userRole === 'user') {
    scheduleNavigate(navigate, 'smallTaskDetail', idParams);
    return;
  }

  switch (typeUpper) {
    case 'BID_ACCEPTED':
      scheduleNavigate(navigate, 'technicianAcceptedSmallTask', idParams);
      return;
    case 'SMALL_TASK_PAYMENT_RECEIVED':
      scheduleNavigate(navigate, 'technicianInProgressSmallTask', idParams);
      return;
    case 'PROJECT_COMPLETED':
      scheduleNavigate(navigate, 'technicianCompletedSmallTask', idParams);
      return;
    case 'BID_REJECTED':
    case 'PROJECT_CANCELLED':
    case 'PROJECT_ASSIGNED':
    case 'BID_RECEIVED':
    default:
      scheduleNavigate(navigate, 'technicianSmallTaskDetail', idParams);
  }
}

export async function handleNotificationNavigation(
  notification: Notification,
  deps: NotificationNavigationDeps
): Promise<void> {
  console.log('[🧭 NAV] ========== handleNotificationNavigation START ==========');
  console.log('[🧭 NAV] Notification:', {
    id: notification.id,
    type: notification.notificationType,
    title: notification.title,
    relatedProjectId: notification.relatedProjectId,
    relatedBidId: notification.relatedBidId,
    relatedSmallTaskRequestId: notification.relatedSmallTaskRequestId,
    relatedSupportTicketId: notification.relatedSupportTicketId,
    relatedAppointmentId: notification.relatedAppointmentId,
    relatedTimeRequestId: notification.relatedTimeRequestId,
    actionUrl: notification.actionUrl,
  });
  console.log('[🧭 NAV] User role:', deps.userRole);

  const {
    navigate,
    userRole,
    setSelectedPendingProject,
    setSelectedSmallTaskRequest,
    setProjectsFilterState,
    openChatFromNotification,
    openSupportChatFromRequestId,
    setSelectedSupportTicketId,
    onOpenSmallTaskInProjects,
  } = deps;

  const rawType = String(notification.notificationType ?? '').trim();
  const type = rawType || 'UNKNOWN';
  const typeUpper = rawType.toUpperCase().trim() || 'UNKNOWN';
  console.log('[🧭 NAV] Parsed type:', { rawType, type, typeUpper });

  const rawPid = (notification as any).relatedProjectId ?? (notification as any).related_project_id;
  const parsedPid =
    rawPid != null && rawPid !== '' ? Number(rawPid) : NaN;
  const pid = Number.isFinite(parsedPid) && parsedPid > 0 ? parsedPid : null;
  console.log('[🧭 NAV] Project ID:', { rawPid, parsedPid, pid });

  const openProjectById = async (projectId: number, opts?: { technicianBidProject?: boolean }) => {
    console.log('[🧭 NAV] openProjectById called:', { projectId, technicianBidProject: opts?.technicianBidProject });
    try {
      const token = await storage.getAuthToken();
      console.log('[🧭 NAV] Auth token:', token ? 'PRESENT' : 'MISSING');
      if (!token) {
        console.log('[🧭 NAV] No token, navigating to projects list');
        navigate('projects');
        return;
      }
      const projectUrl = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.DETAILS, { id: projectId });
      console.log('[🧭 NAV] Fetching project from:', projectUrl);
      const res = await fetch(projectUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('[🧭 NAV] Project fetch response:', { status: res.status, ok: res.ok });
      if (!res.ok) {
        console.log('[🧭 NAV] Project fetch failed, navigating to projects list');
        navigate('projects');
        return;
      }
      const projectData = await res.json();
      console.log('[🧭 NAV] Project data received:', { id: projectData?.id, status: projectData?.status });
      if (opts?.technicianBidProject) {
        projectData._isBidProject = true;
        console.log('[🧭 NAV] Marked as bid project');
      }
      console.log('[🧭 NAV] Calling navigateToProjectDetailFromPayload...');
      await navigateToProjectDetailFromPayload(projectData, {
        navigate,
        userRole,
        setSelectedPendingProject,
        setSelectedSmallTaskRequest,
        setProjectsFilterState,
        routingContext: { notificationType: type, relatedProjectId: projectId },
        onOpenSmallTaskInProjects,
      });
      console.log('[🧭 NAV] navigateToProjectDetailFromPayload completed');
    } catch (e) {
      console.warn('[🧭 NAV] Project fetch failed', e);
      navigate('projects');
    }
  };

  if (typeUpper === 'MESSAGE') {
    console.log('[🧭 NAV] Routing: MESSAGE -> chat');
    if (openChatFromNotification) {
      console.log('[🧭 NAV] Using openChatFromNotification');
      await openChatFromNotification(notification);
    } else {
      console.log('[🧭 NAV] Navigating to chatRooms');
      navigate('chatRooms');
    }
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  const actionUrlTrimmed = notification.actionUrl?.trim();
  console.log('[🧭 NAV] actionUrlTrimmed:', actionUrlTrimmed);
  
  const smallTaskLink = parseSmallTaskActionUrl(actionUrlTrimmed);
  console.log('[🧭 NAV] smallTaskLink:', smallTaskLink);
  if (smallTaskLink) {
    console.log('[🧭 NAV] Routing: smallTaskLink -> small task detail');
    navigateFromSmallTaskActionUrl(typeUpper, userRole, smallTaskLink.requestId, {
      navigate,
      setSelectedSmallTaskRequest,
      setProjectsFilterState,
    });
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  const rawSt =
    notification.relatedSmallTaskRequestId ?? (notification as any).related_small_task_request_id;
  const parsedSt = rawSt != null && rawSt !== '' ? Number(rawSt) : NaN;
  const relatedSmallTaskRequestId = Number.isFinite(parsedSt) && parsedSt > 0 ? parsedSt : null;
  console.log('[🧭 NAV] relatedSmallTaskRequestId:', { rawSt, parsedSt, relatedSmallTaskRequestId });
  if (relatedSmallTaskRequestId != null) {
    console.log('[🧭 NAV] Routing: relatedSmallTaskRequestId -> small task detail');
    navigateFromSmallTaskActionUrl(typeUpper, userRole, relatedSmallTaskRequestId, {
      navigate,
      setSelectedSmallTaskRequest,
      setProjectsFilterState,
    });
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  // Prefer concrete project context when the API attached a project id (must run before https actionUrl — many payloads include both).
  if (pid != null) {
    const technicianBid =
      userRole === 'technician' && (typeUpper === 'BID_RECEIVED' || typeUpper === 'PROJECT_CREATED');
    console.log('[🧭 NAV] Routing: projectId -> openProjectById, technicianBid:', technicianBid);
    await openProjectById(pid, { technicianBidProject: technicianBid });
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  const url = actionUrlTrimmed;
  // MESSAGE: keep https links in-app (parse room in openChatFromNotification); other types may open browser.
  const openActionUrlInBrowser = typeUpper !== 'MESSAGE';
  console.log('[🧭 NAV] Checking actionUrl:', { url, openActionUrlInBrowser });
  if (url && (url.startsWith('http://') || url.startsWith('https://')) && openActionUrlInBrowser) {
    const deepTicket = parseSupportTicketDeepLink(url);
    console.log('[🧭 NAV] deepTicket from actionUrl:', deepTicket);
    if (deepTicket != null && setSelectedSupportTicketId) {
      console.log('[🧭 NAV] Routing: support ticket from actionUrl -> ticket detail');
      setSelectedSupportTicketId(deepTicket);
      navigate('supportTicketDetail', { id: String(deepTicket) });
      console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
      return;
    }
    console.log('[🧭 NAV] Routing: external URL -> browser');
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn('[🧭 NAV] Failed to open actionUrl', e);
    }
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  const supportTicketNavId = extractSupportTicketIdForNavigation(notification, typeUpper);
  console.log('[🧭 NAV] supportTicketNavId:', supportTicketNavId);
  if (supportTicketNavId != null && setSelectedSupportTicketId) {
    console.log('[🧭 NAV] Routing: support ticket -> ticket detail');
    setSelectedSupportTicketId(supportTicketNavId);
    navigate('supportTicketDetail', { id: String(supportTicketNavId) });
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  /**
   * Technician account/admin notifications use the approval screen (same as before profile sections).
   */
  if (
    userRole === 'technician' &&
    (typeUpper === 'ACCOUNT_APPROVED' ||
      typeUpper === 'ACCOUNT_SUSPENDED' ||
      typeUpper === 'ADMIN_REQUEST')
  ) {
    console.log('[🧭 NAV] Routing: technician account notification -> waitingApproval');
    navigate('waitingApproval');
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  const profileSection = profileSectionForNotificationType(typeUpper, userRole);
  console.log('[🧭 NAV] profileSection:', profileSection);
  if (profileSection) {
    console.log('[🧭 NAV] Routing: profile section -> profile');
    navigate('profile', { section: profileSection });
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  if (
    type.startsWith('TICKET_') ||
    type === 'SUPPORT_REQUEST_CREATED' ||
    type === 'SUPPORT_REQUEST_ASSIGNED'
  ) {
    console.log('[🧭 NAV] Routing: ticket/support request -> supportTickets');
    navigate('supportTickets');
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  if (
    (type.startsWith('APPOINTMENT_') || type.startsWith('TIME_REQUEST_')) &&
    (notification.relatedAppointmentId != null || notification.relatedTimeRequestId != null)
  ) {
    console.log('[🧭 NAV] Routing: appointment/time request -> appointments');
    navigate('appointments');
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  if (type === 'ADMIN_NOTIFICATION' || type === 'SYSTEM_ANNOUNCEMENT' || type === 'WARNING') {
    console.log('[🧭 NAV] Routing: admin/system/warning -> notifications');
    navigate('notifications');
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  if (type === 'PROMOTION' || type === 'REMINDER') {
    console.log('[🧭 NAV] Routing: promotion/reminder -> home');
    navigate('home');
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  if (notification.relatedAppointmentId != null || notification.relatedTimeRequestId != null) {
    console.log('[🧭 NAV] Routing: has appointment/time id -> appointments');
    navigate('appointments');
    console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
    return;
  }

  console.log('[🧭 NAV] Routing: default fallback -> notifications');
  navigate('notifications');
  console.log('[🧭 NAV] ========== handleNotificationNavigation END ==========');
}
