import type { Notification } from '../services/NotificationService';

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s !== '' ? s : undefined;
}

/**
 * Map API / MQTT / FCM-shaped payloads to the `Notification` shape used by the list and navigation.
 * Aligns with backend {@code NotificationResponse} (camelCase) and common snake_case / nested variants.
 *
 * Backend FCM often sends: {@code projectId} (not relatedProjectId), {@code requestId} for small tasks,
 * {@code notificationId} instead of {@code id}, and omits {@code actionUrl} on the wire — we repair
 * those so {@link handleNotificationNavigation} matches web behavior.
 * 
 * Backend FCM payload structure (from NotificationService.java):
 * - notificationType: e.g., "PROJECT_ASSIGNED", "BID_RECEIVED", "MESSAGE"
 * - projectId, bidId, phaseId, appointmentId, timeRequestId
 * - type, category (legacy fields)
 * - roomId (for chat messages)
 * - titleAr, titleEn, messageAr, messageEn (bilingual text)
 * - fromUserId, fromUserName
 */
export function normalizeNotificationFromApi(raw: any): Notification {
  const r = raw && typeof raw === 'object' ? raw : {};

  // Merge nested data if Bonyad REST API sends payloads inside a `data` block
  let payloadData = {};
  if (r.data) {
    if (typeof r.data === 'string') {
      try { payloadData = JSON.parse(r.data); } catch (e) {}
    } else if (typeof r.data === 'object' && r.data !== null) {
      payloadData = r.data;
    }
  }

  // Backend sends notificationType in data payload (FCM) or top level (REST)
  let notificationType = String(
    r.notificationType ?? r.notification_type ?? r.type ?? r.category ?? 
    (payloadData as any).notificationType ?? (payloadData as any).type ?? ''
  ).trim();

  const categoryUpper = String(r.category ?? (payloadData as any).category ?? '').toUpperCase();
  if (
    notificationType.toLowerCase() === 'chatmessage' ||
    categoryUpper === 'CHAT_MESSAGE'
  ) {
    notificationType = 'MESSAGE';
  }

  const typeUpper = notificationType.toUpperCase();

  // Backend sends projectId (not relatedProjectId) in FCM data payload or nested data string
  const relatedProjectId =
    num(r.relatedProjectId) ??
    num(r.related_project_id) ??
    num(r.projectId) ??
    num(r.project_id) ??
    num((payloadData as any).projectId) ??
    num((payloadData as any).project_id) ??
    num((payloadData as any).relatedProjectId);

  const title =
    str(r.title) ??
    str(r.titleEn) ??
    str(r.title_en) ??
    str(r.titleAr) ??
    str(r.title_ar) ??
    '';

  const message =
    str(r.message) ??
    str(r.messageEn) ??
    str(r.message_en) ??
    str(r.messageAr) ??
    str(r.message_ar) ??
    '';

  const idFromId = r.id != null && r.id !== '' ? Number(r.id) : NaN;
  const idFromNotif = r.notificationId != null && r.notificationId !== '' ? Number(r.notificationId) : NaN;
  const idVal = Number.isFinite(idFromId) && idFromId > 0 ? idFromId : idFromNotif;
  const id = Number.isFinite(idVal) && idVal > 0 ? idVal : 0;

  const fromUser = r.fromUser;

  let relatedSmallTaskRequestId =
    num(r.relatedSmallTaskRequestId) ??
    num(r.related_small_task_request_id) ??
    num(r.smallTaskRequestId);

  const requestIdNum = num(r.requestId);
  if (relatedSmallTaskRequestId == null && requestIdNum != null) {
    const isSmallTaskSignal =
      typeUpper.includes('SMALL_TASK') ||
      typeUpper === 'NEW_SMALL_TASK_REQUEST' ||
      String(r.type ?? '')
        .toLowerCase()
        .includes('smalltask');
    const isSupportSignal =
      typeUpper.startsWith('SUPPORT_REQUEST') ||
      typeUpper === 'SUPPORT_REQUEST_CREATED' ||
      typeUpper === 'SUPPORT_REQUEST_ASSIGNED';
    if (isSmallTaskSignal && !isSupportSignal) {
      relatedSmallTaskRequestId = requestIdNum;
    }
  }

  let actionUrl = str(r.actionUrl) ?? str(r.action_url);
  if (!actionUrl && relatedSmallTaskRequestId != null && typeUpper.includes('SMALL_TASK')) {
    actionUrl = `smalltask://request/${relatedSmallTaskRequestId}`;
  }
  if (
    !actionUrl &&
    requestIdNum != null &&
    (typeUpper.startsWith('SUPPORT_REQUEST') || typeUpper === 'SUPPORT_REQUEST_CREATED' || typeUpper === 'SUPPORT_REQUEST_ASSIGNED')
  ) {
    actionUrl = `support://request/${requestIdNum}`;
  }

  if (relatedSmallTaskRequestId == null && actionUrl) {
    const m = actionUrl.match(/^smalltask:\/\/request\/(\d+)/i);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) relatedSmallTaskRequestId = n;
    }
  }

  return {
    id,
    fromUserId:
      num(r.fromUserId) ??
      num(r.from_user_id) ??
      num(r.otherUserId) ??
      num(r.other_user_id) ??
      (fromUser && num(fromUser.id)),
    fromUserName: str(r.fromUserName) ?? str(r.from_user_name) ?? (fromUser && str(fromUser.name)),
    fromUserRole: str(r.fromUserRole) ?? str(r.from_user_role) ?? (fromUser && str(fromUser.role)),
    notificationType,
    title,
    message,
    relatedProjectId,
    // Backend sends phaseId (not relatedPhaseId) in FCM data payload
    relatedPhaseId: num(r.relatedPhaseId) ?? num(r.related_phase_id) ?? num(r.phaseId) ?? num(r.phase_id),
    // Backend sends bidId or offerId (not relatedBidId) in FCM data payload
    relatedBidId: num(r.relatedBidId) ?? num(r.related_bid_id) ?? num(r.bidId) ?? num(r.bid_id) ?? num(r.offerId) ?? num(r.offer_id),
    // Backend sends appointmentId (not relatedAppointmentId) in FCM data payload
    relatedAppointmentId: num(r.relatedAppointmentId) ?? num(r.related_appointment_id) ?? num(r.appointmentId) ?? num(r.appointment_id),
    // Backend sends timeRequestId (not relatedTimeRequestId) in FCM data payload
    relatedTimeRequestId: num(r.relatedTimeRequestId) ?? num(r.related_time_request_id) ?? num(r.timeRequestId) ?? num(r.time_request_id),
    relatedReviewId: num(r.relatedReviewId) ?? num(r.related_review_id) ?? num(r.reviewId),
    relatedSmallTaskRequestId,
    relatedSupportTicketId:
      num(r.relatedSupportTicketId) ??
      num(r.related_support_ticket_id) ??
      num(r.ticketId) ??
      num(r.ticket_id),
    // Backend sends roomId for chat messages in FCM data payload
    relatedChatRoomId:
      str(r.relatedChatRoomId) ?? str(r.related_chat_room_id) ?? str(r.chatRoomId) ?? str(r.chat_room_id) ?? str(r.roomId) ?? str(r.room_id) ?? 
      str((payloadData as any).roomId) ?? str((payloadData as any).chatRoomId),
    read: !!(r.read ?? r.isRead ?? r.is_read),
    readAt: str(r.readAt) ?? str(r.read_at),
    createdAt: str(r.createdAt) ?? str(r.created_at) ?? new Date().toISOString(),
    actionUrl,
  };
}
