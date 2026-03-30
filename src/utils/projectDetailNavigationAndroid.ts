import { storage } from './storage';

/** Run navigation immediately (simplified for reliability). */
function scheduleNav(
  navigate: (screen: string, params?: Record<string, string>) => void | Promise<void>,
  screen: string,
  params?: Record<string, string>
) {
  void navigate(screen, params);
}

/**
 * List endpoints use `serviceNameEn` / `serviceNameAr` (ProjectListItemResponse).
 * GET /api/projects/:id returns nested `service: { nameEn, nameAr }` on the project entity.
 * Screens read `project.serviceNameEn` — flatten so notification / deep-link fetches match the list.
 */
export function enrichProjectDetailFields(project: any): any {
  if (project == null || typeof project !== 'object') return project;
  const svc = project.service;
  const cat = project.serviceCategory;
  const region = project.region;

  const fromServiceEn = svc?.nameEn ?? svc?.name_en;
  const fromServiceAr = svc?.nameAr ?? svc?.name_ar;
  const fromCatEn = cat?.nameEn ?? cat?.name_en;
  const fromCatAr = cat?.nameAr ?? cat?.name_ar;

  const pickEn =
    project.serviceNameEn ??
    project.service_name_en ??
    fromServiceEn ??
    fromCatEn;
  const pickAr =
    project.serviceNameAr ??
    project.service_name_ar ??
    fromServiceAr ??
    fromCatAr;

  const out = { ...project };
  const missingEn = out.serviceNameEn == null || String(out.serviceNameEn).trim() === '';
  const missingAr = out.serviceNameAr == null || String(out.serviceNameAr).trim() === '';
  if (missingEn && pickEn != null && String(pickEn).trim() !== '') {
    out.serviceNameEn = pickEn;
  }
  if (missingAr && pickAr != null && String(pickAr).trim() !== '') {
    out.serviceNameAr = pickAr;
  }
  if (out.serviceId == null && svc?.id != null) {
    out.serviceId = Number(svc.id);
  }
  if (out.regionNameEn == null && region?.nameEn != null) {
    out.regionNameEn = region.nameEn;
  }
  if (out.regionNameAr == null && region?.nameAr != null) {
    out.regionNameAr = region.nameAr;
  }
  const titleStr = project.title != null ? String(project.title).trim() : '';
  if (titleStr !== '') {
    if (out.serviceNameEn == null || String(out.serviceNameEn).trim() === '') {
      out.serviceNameEn = titleStr;
    }
    if (out.serviceNameAr == null || String(out.serviceNameAr).trim() === '') {
      out.serviceNameAr = titleStr;
    }
  }
  return out;
}

/**
 * GET /api/projects/:id returns ProjectWithPhasesResponse (backend):
 * `{ project: { id, status, ... }, phases: [...], regionId, ... }` — not a flat project.
 * Merge so `id` and `status` exist at the root like list endpoints.
 */
/**
 * GET /projects/:id may expose small-task linkage as `smallTaskRequestId` etc.
 * List views use `_isSmallTask` / `_smallTaskId` — align so notification/deep-link fetches route the same.
 */
function applySmallTaskLinkFromApi(project: any): any {
  if (project == null || typeof project !== 'object') return project;
  const out = { ...project };
  const hasSmallTaskSignal =
    out._isSmallTask === true ||
    out.isSmallTask === true ||
    out.smallTaskRequestId != null ||
    out.small_task_request_id != null ||
    (out.smallTaskRequest != null && typeof out.smallTaskRequest === 'object');
  if (!hasSmallTaskSignal) return out;
  const rawId =
    out._smallTaskId ??
    out.smallTaskRequestId ??
    out.smallTaskRequest?.id ??
    out.linkedSmallTaskRequestId ??
    out.small_task_request_id;
  if (rawId == null || rawId === '') return out;
  const n = Number(rawId);
  if (!Number.isFinite(n) || n <= 0) return out;
  out._isSmallTask = true;
  out._smallTaskId = n;
  return out;
}

export function normalizeProjectDetailResponse(raw: any): any {
  if (raw == null || typeof raw !== 'object') return raw;
  const inner = raw.project;
  if (inner && typeof inner === 'object') {
    const merged = {
      ...inner,
      phases: raw.phases ?? inner.phases,
      regionId: raw.regionId ?? inner.regionId ?? inner.region?.id,
      regionNameEn: raw.regionNameEn ?? inner.regionNameEn,
      regionNameAr: raw.regionNameAr ?? inner.regionNameAr,
      smallTaskRequestId: raw.smallTaskRequestId ?? inner.smallTaskRequestId,
      small_task_request_id: raw.small_task_request_id ?? inner.small_task_request_id,
      isSmallTask: raw.isSmallTask ?? inner.isSmallTask,
      smallTaskRequest: raw.smallTaskRequest ?? inner.smallTaskRequest,
    };
    return applySmallTaskLinkFromApi(enrichProjectDetailFields(merged));
  }
  return applySmallTaskLinkFromApi(enrichProjectDetailFields(raw));
}

/** Resolve numeric project id from merged or nested API shapes; optional fallback from notification. */
export function resolveProjectNavigationId(project: any, fallbackId?: number | null): number | null {
  const raw = project?.id ?? project?.projectId ?? project?.project?.id ?? fallbackId;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface ProjectNavigationDeps {
  navigate: (screen: string, params?: Record<string, string>) => void;
  userRole: 'user' | 'technician';
  setSelectedPendingProject: (p: any) => void;
  setSelectedSmallTaskRequest: (r: { id: number } | null) => void;
  /** Matches App `setProjectsFilterState` when returning from small-task detail flows */
  setProjectsFilterState: (s: any) => void;
  /** When opening from a notification, prefer the screen that matches the notification type if status is ambiguous */
  routingContext?: { notificationType?: string; relatedProjectId?: number };
  /**
   * Android: the app embeds small tasks inside {@code ProjectsScreen} (no top-level small-task routes).
   * When set, small-task project payloads open via this hook instead of {@code navigate('smallTaskDetail')} etc.
   */
  onOpenSmallTaskInProjects?: (args: {
    smallTaskId: number;
    mergedProject: any;
    isTechnician: boolean;
    stStatus: string;
    activeFilter: 'all' | 'pending' | 'in-progress' | 'completed';
  }) => void | Promise<void>;
}

/** Exported for services that must read status from GET /projects/:id or approve-all payloads. */
export function extractProjectStatusFromApiEntity(project: any): string {
  const raw = project?.status ?? project?.projectStatus ?? project?.project_status ?? project?.state;
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object' && raw !== null && 'name' in (raw as object)) {
    return String((raw as { name?: string }).name || '').toUpperCase().trim();
  }
  return String(raw).toUpperCase().trim();
}

function normalizeProjectStatus(project: any): string {
  return extractProjectStatusFromApiEntity(project);
}

/**
 * Map API / DB variants to a single routing bucket (aligned with ProjectsScreen / MyProjects).
 * Exported for tests and App URL-load validation.
 */
export function canonicalStatusForProjectRouting(status: string): string {
  const raw = (status || '').trim();
  if (!raw) return '';
  const u = raw.toUpperCase().replace(/\s+/g, '_');
  if (u === 'PROJECT_COMPLETED' || u === 'PROJECT-COMPLETED') return 'COMPLETED';
  if (u === 'PROJECT_CANCELLED' || u === 'PROJECT-CANCELLED' || u === 'CANCELLED') return 'PROJECT_CANCELLED';
  if (u === 'BID_RECEIVED' || (u.includes('BID') && u.includes('RECEIVED'))) return 'BID_RECEIVED';
  return u;
}

/** Status values where bidding UI no longer applies (user or technician). */
function isPastBiddingPhase(status: string): boolean {
  if (!status) return false;
  const c = canonicalStatusForProjectRouting(status);
  return [
    'IN_PROGRESS',
    'COMPLETED',
    'APPROVED',
    'PHASE_PLANNING',
    'CONTRACT_SIGNING',
    'PROJECT_CANCELLED',
  ].includes(c);
}

/**
 * Map notification type → App screen id when project.status alone would land on the generic projects list
 * or the wrong step (e.g. PENDING vs BID_RECEIVED).
 */
function screenFromNotificationHint(
  notificationType: string | undefined,
  userRole: 'user' | 'technician',
  status: string
): string | null {
  if (!notificationType) return null;
  const c = canonicalStatusForProjectRouting(status);
  const t = notificationType.toUpperCase().trim();

  if (
    (t === 'BID_RECEIVED' || t === 'BID_REJECTED' || t === 'VISIT_REQUEST') &&
    userRole === 'user' &&
    !isPastBiddingPhase(status)
  ) {
    return 'bidReceivedProject';
  }

  /** Technician: new bid / visit on an active bidding project — same screen as list tap. */
  if (
    (t === 'BID_RECEIVED' || t === 'BID_REJECTED' || t === 'VISIT_REQUEST') &&
    userRole === 'technician' &&
    c === 'BID_RECEIVED'
  ) {
    return 'bidReceivedProject';
  }

  if (
    (t === 'PHASE_PLAN_CREATED' ||
      t === 'PHASE_APPROVED' ||
      t === 'PHASE_CHANGE_REQUESTED' ||
      t === 'PHASE_CHANGE_RESOLVED' ||
      t === 'PROJECT_APPROVED') &&
    !['COMPLETED', 'PROJECT_CANCELLED', 'PENDING', 'BID_RECEIVED'].includes(c)
  ) {
    if (c === 'CONTRACT_SIGNING') return 'contractSigningProject';
    if (c === 'IN_PROGRESS') return 'inProgressProject';
    if (c === 'APPROVED' || c === 'PHASE_PLANNING' || c === '') return 'approvedProject';
    return null;
  }

  if (
    (t === 'PHASE_COMPLETED' ||
      t === 'PHASE_PAYMENT_RECEIVED' ||
      t === 'PHASE_PAYMENT_PENDING' ||
      t === 'PROJECT_UPDATED') &&
    c === 'IN_PROGRESS'
  ) {
    return 'inProgressProject';
  }

  if (t === 'PROJECT_COMPLETED' || t === 'REVIEW_RECEIVED') {
    if (c === 'COMPLETED') return 'completedProject';
  }

  if (t === 'CONTRACT_SIGNING' || t === 'BID_ACCEPTED') {
    if (c === 'CONTRACT_SIGNING') return 'contractSigningProject';
    if (c === 'IN_PROGRESS') return 'inProgressProject';
    if (c === 'APPROVED' || c === 'PHASE_PLANNING') return 'approvedProject';
  }

  return null;
}

/**
 * Mirrors MyProjectsScreen → App onNavigateToProject routing so deep links and
 * notifications land on the same project detail flow as the projects list.
 */
export async function navigateToProjectDetailFromPayload(
  rawProject: any,
  options: ProjectNavigationDeps
): Promise<void> {
  const {
    navigate,
    userRole,
    setSelectedPendingProject,
    setSelectedSmallTaskRequest,
    setProjectsFilterState,
    routingContext,
    onOpenSmallTaskInProjects,
  } = options;

  if (!rawProject) {
    return;
  }

  let project = normalizeProjectDetailResponse(rawProject);
  const resolvedId = resolveProjectNavigationId(project, routingContext?.relatedProjectId ?? null);
  if (resolvedId == null) {
    navigate('projects');
    return;
  }
  if (project.id == null) {
    project = { ...project, id: resolvedId };
  }

  const projectIdParam = String(resolvedId);

  const storedRole = await storage.getUserRole();
  const isTechnician = userRole === 'technician' || storedRole?.toUpperCase() === 'TECHNICIAN';

  /** Notifications mark `_isBidProject` — must win over small-task routing (e.g. PROJECT_CREATED for tech). */
  if (isTechnician && project._isBidProject) {
    setSelectedPendingProject(project);
    scheduleNav(navigate, 'bidReceivedProject', { projectId: projectIdParam });
    return;
  }

  if (project._isSmallTask && project._smallTaskId) {
    const stStatus = (project.status || '').toUpperCase().trim();
    let activeFilter: 'all' | 'pending' | 'in-progress' | 'completed' = 'all';
    if (stStatus === 'PENDING') {
      activeFilter = 'pending';
    } else if (stStatus === 'IN_PROGRESS') {
      activeFilter = 'in-progress';
    } else if (stStatus === 'COMPLETED') {
      activeFilter = 'completed';
    }
    setProjectsFilterState({
      projectTypeFilter: 'small',
      activeFilter,
    });
    const smallTaskId = project._smallTaskId;
    const smallTaskParams = { id: String(smallTaskId) };
    setSelectedSmallTaskRequest({ id: smallTaskId });

    if (onOpenSmallTaskInProjects) {
      await onOpenSmallTaskInProjects({
        smallTaskId,
        mergedProject: project,
        isTechnician,
        stStatus,
        activeFilter,
      });
      return;
    }

    if (isTechnician) {
      const isFromMyBids = project._myBidStatus || project._myBidPrice !== undefined;

      if (isFromMyBids) {
        scheduleNav(navigate, 'technicianSmallTaskDetail', smallTaskParams);
      } else {
        if (stStatus === 'IN_PROGRESS') {
          scheduleNav(navigate, 'technicianInProgressSmallTask', smallTaskParams);
        } else if (stStatus === 'COMPLETED') {
          scheduleNav(navigate, 'technicianCompletedSmallTask', smallTaskParams);
        } else if (stStatus === 'ACCEPTED') {
          scheduleNav(navigate, 'technicianAcceptedSmallTask', smallTaskParams);
        } else {
          scheduleNav(navigate, 'technicianSmallTaskDetail', smallTaskParams);
        }
      }
    } else {
      scheduleNav(navigate, 'smallTaskDetail', smallTaskParams);
    }
    return;
  }

  const rawStatus = normalizeProjectStatus(project);
  const canonical = canonicalStatusForProjectRouting(rawStatus);
  const hintType = routingContext?.notificationType;

  // Owner tapped "new bid" / visit — open bid-review screen even if API still reports PENDING
  const hintUpper = hintType ? String(hintType).toUpperCase().trim() : '';
  if (
    (hintUpper === 'BID_RECEIVED' || hintUpper === 'BID_REJECTED' || hintUpper === 'VISIT_REQUEST') &&
    userRole === 'user' &&
    !isPastBiddingPhase(rawStatus)
  ) {
    setSelectedPendingProject(project);
    scheduleNav(navigate, 'bidReceivedProject', { projectId: projectIdParam });
    return;
  }

  if (canonical === 'PENDING') {
    setSelectedPendingProject(project);
    scheduleNav(navigate, 'pendingProject', { projectId: projectIdParam });
  } else if (canonical === 'COMPLETED') {
    setSelectedPendingProject(project);
    scheduleNav(navigate, 'completedProject', { projectId: projectIdParam });
  } else if (canonical === 'PROJECT_CANCELLED') {
    // Same full-screen detail as completed — both roles see read-only project outcome.
    setSelectedPendingProject(project);
    scheduleNav(navigate, 'completedProject', { projectId: projectIdParam });
  } else if (canonical === 'APPROVED' || canonical === 'PHASE_PLANNING' || canonical === 'PHASE_PLANNING_APPROVED') {
    setSelectedPendingProject(project);
    scheduleNav(navigate, 'approvedProject', { projectId: projectIdParam });
  } else if (canonical === 'CONTRACT_SIGNING') {
    setSelectedPendingProject(project);
    scheduleNav(navigate, 'contractSigningProject', { projectId: projectIdParam });
  } else if (canonical === 'IN_PROGRESS') {
    setSelectedPendingProject(project);
    scheduleNav(navigate, 'inProgressProject', { projectId: projectIdParam });
  } else if (canonical === 'BID_RECEIVED') {
    setSelectedPendingProject(project);
    scheduleNav(navigate, 'bidReceivedProject', { projectId: projectIdParam });
  } else {
    const hinted = screenFromNotificationHint(hintType, userRole, rawStatus);
    if (hinted) {
      setSelectedPendingProject(project);
      scheduleNav(navigate, hinted, { projectId: projectIdParam });
    } else {
      // Fallback: back to projects list if we can't confidently pick a step.
      setSelectedPendingProject(project);
      scheduleNav(navigate, 'projects');
    }
  }
}
