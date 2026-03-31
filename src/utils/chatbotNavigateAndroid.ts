import { storage } from './storage';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import type { Screen } from './useRouter';
import { CHATBOT_NAV_SCREEN_MAP, isChatbotHomeTabTarget, resolveChatbotScreenToken } from './chatbotNavTargets';
import {
  navigateToProjectDetailFromPayload,
  normalizeProjectDetailResponse,
} from './projectDetailNavigationAndroid';

export type ProjectsFilterAndroid =
  | 'all'
  | 'available'
  | 'running'
  | 'approved'
  | 'completed'
  | 'bid_received'
  | 'direct_offers';

export type ProfileSubviewForChatbot =
  | 'myData'
  | 'editProfile'
  | 'portfolio'
  | 'subscription'
  | 'services'
  | 'availability'
  | 'changePassword'
  | 'changePhone'
  | 'paymentHistory'
  | 'smallTaskTypes'
  | 'regions';

/** Tabs / overlays inside UserHomeScreen / TechnicianHomeScreen (preserve top + bottom chrome). */
export type HomeShellTab =
  | 'home'
  | 'projects'
  | 'chat'
  | 'profile'
  | 'new'
  | 'appointments'
  | 'notifications'
  | 'wallet'
  | 'chatbot';

export type HomeShellNewProjectSubView =
  | null
  | 'project-type-selection'
  | 'creation-method'
  | 'ai'
  | 'manual'
  | 'small-task-type-selection'
  | 'small-task-request-form';

export type HomeShellFromChatbotPayload = {
  tab: HomeShellTab;
  /** When provided, `Projects` tab back should return to this tab (e.g. notification → project → back → notifications). */
  returnTabOnBack?: HomeShellTab;
  /** When set, open an exact chat thread inside the Chat tab. */
  embeddedChat?: {
    roomId: string;
    receiverId: number;
    receiverName: string;
    projectId?: number | null;
  };
  newProjectSubView?: HomeShellNewProjectSubView;
  embeddedProjects?: {
    initialSmallTask?: any;
    /** Optional: open a specific (large) project in Projects tab while keeping home chrome. */
    initialProject?: any;
    initialProjectType?: 'large' | 'small';
  };
  /** Technician: open Appointments embedded on home */
  technicianAppointments?: boolean;
};

export interface ChatbotAndroidNavDeps {
  navigate: (screen: Screen, options?: { replace?: boolean; replaceCurrent?: boolean }) => void;
  userRole: 'user' | 'technician';
  setShowProfile: (v: boolean) => void;
  setProjectsFilter: (f: ProjectsFilterAndroid) => void;
  setProjectsBootstrap: (
    v:
      | { initialSmallTask?: any; initialProjectType?: 'large' | 'small' }
      | null
      | ((prev: { initialSmallTask?: any; initialProjectType?: 'large' | 'small' } | null) => {
          initialSmallTask?: any;
          initialProjectType?: 'large' | 'small';
        } | null)
  ) => void;
  setProjectsRemountKey: (fn: (k: number) => number) => void;
  setChatRoomId: (id: string | null) => void;
  setChatReceiverId: (id: number) => void;
  setChatReceiverName: (name: string) => void;
  setViewTechnicianId: (id: number | null) => void;
  setSelectedProjectForDetail: (p: any) => void;
  setSelectedTicketId: (id: number) => void;
  bumpProfileNavFromChatbot: (subView: ProfileSubviewForChatbot) => void;
  openHomeShellNav: (payload: HomeShellFromChatbotPayload) => void;
  onOpenSmallTaskInProjects: (args: {
    smallTaskId: number;
    mergedProject: any;
    isTechnician: boolean;
    stStatus: string;
    activeFilter: 'all' | 'pending' | 'in-progress' | 'completed';
  }) => void | Promise<void>;
  setProjectsFilterState: (s: { projectTypeFilter?: string; activeFilter?: string }) => void;
}

function mapActiveFilterToProjectsFilter(af: string): ProjectsFilterAndroid {
  const key = af.toLowerCase().replace(/_/g, '-').trim();
  switch (key) {
    case 'pending':
      return 'available';
    case 'bidding':
      return 'bid_received';
    case 'direct-assigned':
      return 'direct_offers';
    case 'in-progress':
    case 'inprogress':
      return 'running';
    case 'approved':
      return 'approved';
    case 'completed':
      return 'completed';
    case 'contract':
    case 'accepted':
      return 'running';
    case 'cancelled':
    case 'canceled':
      return 'all';
    case 'all':
      return 'all';
    default:
      return 'all';
  }
}

function applyAndroidProjectsListParams(
  targetScreen: Screen,
  screenName: string,
  params: Record<string, unknown> | undefined,
  deps: ChatbotAndroidNavDeps
): void {
  if (targetScreen !== 'projects') return;

  const p = params as Record<string, string> | undefined;
  const ptf = (p?.projectTypeFilter || p?.taskScope || '').toString().toLowerCase();
  const raw = (p?.activeFilter || p?.tab || '').toLowerCase().replace(/_/g, '-').trim();
  const chatbotUx = (p?.chatbotUxTab || '').toString().toLowerCase();

  if (ptf === 'small') {
    deps.setProjectsBootstrap((prev) => ({
      ...(prev || {}),
      initialProjectType: 'small',
    }));
    deps.setProjectsRemountKey((k) => k + 1);
    return;
  }

  if (raw) {
    deps.setProjectsFilter(mapActiveFilterToProjectsFilter(raw));
    return;
  }

  const sn = screenName.toLowerCase().replace(/[\s_-]/g, '');
  if (
    chatbotUx === 'technician-available' ||
    sn === 'submitbid' ||
    sn === 'availableprojects' ||
    sn === 'techavailable'
  ) {
    deps.setProjectsFilter('available');
    return;
  }
  if (sn === 'bidreview' || sn === 'bidreceived' || sn === 'mybids') {
    deps.setProjectsFilter('bid_received');
    return;
  }
  if (sn === 'directassigned') {
    deps.setProjectsFilter('direct_offers');
    return;
  }
  if (sn === 'inprogress' || sn === 'inprogressprojects' || screenName === 'runningProjects') {
    deps.setProjectsFilter('running');
    return;
  }
  if (sn === 'completedprojects' || sn === 'completed') {
    deps.setProjectsFilter('completed');
    return;
  }
  if (sn === 'approvedprojects' || sn === 'approved') {
    deps.setProjectsFilter('approved');
    return;
  }
}

async function fetchAndRouteProject(
  projectId: number,
  deps: ChatbotAndroidNavDeps
): Promise<void> {
  const token = await storage.getAuthToken();
  if (!token) {
    deps.navigate('projects');
    return;
  }
  const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.DETAILS, { id: String(projectId) });
  let raw: any = { id: projectId };
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      raw = await res.json();
    }
  } catch {
    /* use minimal stub */
  }
  const project = normalizeProjectDetailResponse(raw);
  await navigateToProjectDetailFromPayload(project, {
    navigate: (s) => deps.navigate(s as Screen),
    userRole: deps.userRole,
    setSelectedPendingProject: deps.setSelectedProjectForDetail,
    setSelectedSmallTaskRequest: () => {},
    setProjectsFilterState: deps.setProjectsFilterState,
    onOpenSmallTaskInProjects: deps.onOpenSmallTaskInProjects,
  });
}

/**
 * Map chatbot parser targets (web screen ids) to Android routes and state.
 */
export async function handleChatbotNavigationAndroid(
  screenName: string,
  params: Record<string, unknown> | undefined,
  deps: ChatbotAndroidNavDeps
): Promise<void> {
  const lower = screenName.toLowerCase();
  const compact = lower.replace(/[\s_-]/g, '');

  const mergedMap = Object.fromEntries(
    Object.entries(CHATBOT_NAV_SCREEN_MAP).map(([k, v]) => [k, v as string])
  ) as Record<string, string>;

  const screenMapping: Record<string, Screen> = {
    ...mergedMap,
    Projects: 'projects',
    ProjectDetails: 'projects',
    Appointments: 'appointments',
    ChatRooms: 'chatRooms',
    chatRooms: 'chatRooms',
    Portfolio: 'portfolio',
    Notifications: 'notifications',
    Login: 'login',
    Signup: 'signup',
    home: 'home',
    subscriptionManagement: 'subscription',
    myData: 'myData',
    runningProjects: 'runningProjects',
    newProject: 'newProject',
    pendingProject: 'pendingProject',
    bidReceivedProject: 'bidReceivedProject',
    approvedProject: 'approvedProject',
    contractSigningProject: 'contractSigningProject',
    inProgressProject: 'inProgressProject',
    completedProject: 'completedProject',
    changeRequestList: 'changeRequestList',
    requestModification: 'requestModification',
    pendingProjects: 'projects',
    bidReview: 'projects',
    inProgress: 'projects',
    completedProjects: 'projects',
    aiForm: 'aiForm',
    manualForm: 'manualForm',
    createBlog: 'home',
    blogList: 'overview',
    helpCenter: 'ticketList',
    faq: 'ticketList',
    helpSearch: 'ticketList',
    supportTickets: 'ticketList',
    supportTicketDetail: 'ticketDetail',
    platformCommission: 'commissionPayment',
    dataRequests: 'waitingApproval',
    technicianOnboarding: 'technicianOnboarding',
    technicianProfile: 'technicianProfile',
    createSmallTask: 'newProject',
    askBonyadAI: 'askBonyadAI',
    projectsMap: 'projectsMap',
    roomDesign: 'roomDesign',
    voiceAI: 'voiceAI',
    costExplorer: 'costExplorer',
    roomVisualizer: 'roomVisualizer',
    booking: 'booking',
    serviceProviders: 'serviceProviders',
  };

  const decap = screenName.length > 0 ? screenName.charAt(0).toLowerCase() + screenName.slice(1) : screenName;

  let targetScreen =
    screenMapping[screenName] ??
    screenMapping[decap] ??
    screenMapping[lower] ??
    screenMapping[compact] ??
    (resolveChatbotScreenToken(screenName) as Screen | null) ??
    (resolveChatbotScreenToken(decap) as Screen | null) ??
    (resolveChatbotScreenToken(compact) as Screen | null) ??
    ('home' as Screen);

  const p = params as Record<string, string> | undefined;

  const goHome = () => deps.navigate('home', { replaceCurrent: true });

  const openShell = (payload: HomeShellFromChatbotPayload) => {
    deps.setShowProfile(false);
    deps.openHomeShellNav(payload);
    goHome();
  };

  if (targetScreen === ('ownerProjectEdit' as any) || compact === 'ownerprojectedit') {
    openShell({ tab: 'projects' });
    return;
  }

  if ((targetScreen as string) === 'paymentHistory' || compact === 'paymenthistory') {
    deps.bumpProfileNavFromChatbot('paymentHistory');
    deps.setShowProfile(true);
    goHome();
    return;
  }

  if (
    (targetScreen as string) === 'smallTaskTypes' ||
    compact === 'smalltasktypes' ||
    (compact === 'tasks' && screenName.toLowerCase().includes('small'))
  ) {
    deps.bumpProfileNavFromChatbot('smallTaskTypes');
    deps.setShowProfile(true);
    goHome();
    return;
  }

  if ((targetScreen as string) === 'profile') {
    const sec = (p?.section || '').toString();
    if (sec === 'changePhone') {
      deps.navigate('changePhone');
      return;
    }
    if (sec === 'changePassword') {
      deps.navigate('changePassword');
      return;
    }
    if (sec === 'subscription') {
      deps.navigate('subscription');
      return;
    }
    if (sec === 'services') {
      deps.navigate('services');
      return;
    }
    if (sec === 'availability') {
      deps.navigate('availability');
      return;
    }
    if (sec === 'portfolio') {
      deps.navigate('portfolio');
      return;
    }
    if (sec === 'transactions') {
      deps.bumpProfileNavFromChatbot('paymentHistory');
      deps.setShowProfile(true);
      goHome();
      return;
    }
    if (sec === 'smallTasks') {
      deps.bumpProfileNavFromChatbot('smallTaskTypes');
      deps.setShowProfile(true);
      goHome();
      return;
    }
    if (sec === 'regions') {
      deps.bumpProfileNavFromChatbot('regions');
      deps.setShowProfile(true);
      goHome();
      return;
    }
    deps.setShowProfile(true);
    goHome();
    return;
  }

  applyAndroidProjectsListParams(targetScreen, screenName, params, deps);

  if (targetScreen === 'newProject') {
    const modeVal = ((p?.mode ?? p?.entry ?? '') as string).toLowerCase();
    const wantManual =
      modeVal === 'manual' ||
      compact === 'manualproject' ||
      compact === 'newprojectmanual';
    if (wantManual) {
      if (deps.userRole === 'user') {
        openShell({ tab: 'new', newProjectSubView: 'manual' });
        return;
      }
      deps.navigate('manualForm');
      return;
    }
    if (deps.userRole === 'user') {
      openShell({ tab: 'new', newProjectSubView: null });
      return;
    }
  }

  const profileInline: Partial<Record<string, { screen: Screen; profileSubview?: ProfileSubviewForChatbot }>> = {
    changePhone: { screen: 'changePhone' },
    changePassword: { screen: 'changePassword' },
    paymentHistory: { screen: 'home', profileSubview: 'paymentHistory' },
    subscription: { screen: 'subscription' },
    regions: { screen: 'home', profileSubview: 'regions' },
    services: { screen: 'services' },
    availability: { screen: 'availability' },
    portfolio: { screen: 'portfolio' },
  };
  const inline = profileInline[targetScreen as string];
  if (inline?.profileSubview) {
    deps.bumpProfileNavFromChatbot(inline.profileSubview);
    deps.setShowProfile(true);
    goHome();
    return;
  }
  if (inline && inline.screen && inline.screen !== 'home') {
    deps.setShowProfile(false);
    deps.navigate(inline.screen);
    return;
  }

  if (targetScreen === 'chatDetail' && p?.roomId) {
    deps.setChatRoomId(String(p.roomId));
    if (p.receiverId) deps.setChatReceiverId(Number(p.receiverId));
    if (p.receiverName) deps.setChatReceiverName(String(p.receiverName));
    deps.navigate('chatDetail');
    return;
  }

  if (targetScreen === 'technicianProfile') {
    const tid = p?.technicianId ?? p?.id;
    if (tid != null && String(tid).trim() !== '') {
      deps.setViewTechnicianId(Number(tid));
    }
    deps.navigate('technicianProfile');
    return;
  }

  if (String(targetScreen) === 'supportTicketDetail' && p?.id) {
    deps.setSelectedTicketId(Number(p.id));
    deps.navigate('ticketDetail');
    return;
  }

  const lifecycle: Screen[] = [
    'pendingProject',
    'bidReceivedProject',
    'approvedProject',
    'contractSigningProject',
    'inProgressProject',
    'completedProject',
  ];
  if (lifecycle.includes(targetScreen)) {
    const pid = p?.projectId ?? p?.id;
    if (pid != null && String(pid).trim() !== '') {
      await fetchAndRouteProject(Number(pid), deps);
      return;
    }
  }

  if (userIsTechnicianOnlyScreen(targetScreen) && deps.userRole === 'user') {
    goHome();
    return;
  }
  if (userOnlyScreen(targetScreen) && deps.userRole === 'technician') {
    goHome();
    return;
  }

  if (targetScreen === 'projects') {
    openShell({ tab: 'projects' });
    return;
  }
  if (targetScreen === 'chatRooms') {
    openShell({ tab: 'chat' });
    return;
  }
  if (targetScreen === 'appointments') {
    if (deps.userRole === 'user') {
      openShell({ tab: 'appointments' });
      return;
    }
    deps.setShowProfile(false);
    deps.openHomeShellNav({ tab: 'home', technicianAppointments: true });
    goHome();
    return;
  }
  if (targetScreen === 'notifications') {
    openShell({ tab: 'notifications' });
    return;
  }
  if (targetScreen === 'commissionPayment' && deps.userRole === 'technician') {
    openShell({ tab: 'wallet' });
    return;
  }
  if (targetScreen === 'aiForm' && deps.userRole === 'user') {
    openShell({ tab: 'new', newProjectSubView: 'ai' });
    return;
  }
  if (targetScreen === 'manualForm' && deps.userRole === 'user') {
    openShell({ tab: 'new', newProjectSubView: 'manual' });
    return;
  }

  if (targetScreen === 'chatbot') {
    deps.setShowProfile(false);
    deps.openHomeShellNav({ tab: 'chatbot' });
    goHome();
    return;
  }

  deps.setShowProfile(false);

  if (!isKnownAndroidScreen(targetScreen)) {
    goHome();
    return;
  }

  if (targetScreen === 'home') {
    goHome();
    return;
  }

  deps.navigate(targetScreen);
}

function userIsTechnicianOnlyScreen(s: Screen): boolean {
  return ['portfolio', 'commissionPayment'].includes(s);
}

function userOnlyScreen(s: Screen): boolean {
  return ['booking', 'serviceProviders'].includes(s);
}

const ANDROID_SCREENS = new Set<Screen>([
  'splash',
  'onboarding',
  'welcome',
  'overview',
  'about',
  'contact',
  'introToApp',
  'login',
  'signup',
  'otp',
  'forgotPassword',
  'otpVerification',
  'resetPassword',
  'home',
  'editProfile',
  'myData',
  'changePhone',
  'changePassword',
  'portfolio',
  'services',
  'availability',
  'subscription',
  'newProject',
  'manualForm',
  'aiForm',
  'projects',
  'runningProjects',
  'chatRooms',
  'chatDetail',
  'notifications',
  'appointments',
  'booking',
  'technicianProfile',
  'technicianOnboarding',
  'technicianCompleteProfile',
  'waitingApproval',
  'roomDesign',
  'voiceAI',
  'costExplorer',
  'roomVisualizer',
  'askBonyadAI',
  'projectsMap',
  'chatbot',
  'supportChat',
  'ticketList',
  'createTicket',
  'ticketDetail',
  'serviceProviders',
  'commissionPayment',
  'paymentCheckout',
  'categorySubcategories',
  'creationMethod',
  'pendingProject',
  'bidReceivedProject',
  'approvedProject',
  'contractSigningProject',
  'inProgressProject',
  'completedProject',
  'changeRequestList',
  'changeRequestDetail',
  'requestModification',
]);

function isKnownAndroidScreen(s: Screen): boolean {
  return ANDROID_SCREENS.has(s);
}

export function handleChatbotTabAndroid(tabName: string, deps: ChatbotAndroidNavDeps): void {
  const t = tabName.trim();
  const lower = t.toLowerCase();
  const goHome = () => deps.navigate('home', { replaceCurrent: true });
  const openShell = (payload: HomeShellFromChatbotPayload) => {
    deps.setShowProfile(false);
    deps.openHomeShellNav(payload);
    goHome();
  };
  if (lower === 'profile' || t === 'Profile') {
    deps.setShowProfile(true);
    goHome();
    return;
  }
  const tabMapping: Record<string, Screen> = {
    Home: 'home',
    home: 'home',
    Projects: 'projects',
    Appointments: 'appointments',
    CreateProject: 'newProject',
    ChatRooms: 'chatRooms',
    Payments: 'commissionPayment',
  };
  const mapped = tabMapping[t] || tabMapping[t.charAt(0).toUpperCase() + t.slice(1)];
  if (mapped) {
    if (mapped === 'commissionPayment' && deps.userRole === 'user') {
      deps.navigate('subscription');
      return;
    }
    if (mapped === 'home') {
      openShell({ tab: 'home' });
      return;
    }
    if (mapped === 'projects') {
      openShell({ tab: 'projects' });
      return;
    }
    if (mapped === 'appointments') {
      if (deps.userRole === 'user') {
        openShell({ tab: 'appointments' });
        return;
      }
      deps.setShowProfile(false);
      deps.openHomeShellNav({ tab: 'home', technicianAppointments: true });
      goHome();
      return;
    }
    if (mapped === 'newProject') {
      if (deps.userRole === 'user') {
        openShell({ tab: 'new', newProjectSubView: null });
        return;
      }
      deps.navigate('newProject');
      return;
    }
    if (mapped === 'chatRooms') {
      openShell({ tab: 'chat' });
      return;
    }
    if (mapped === 'commissionPayment' && deps.userRole === 'technician') {
      openShell({ tab: 'wallet' });
      return;
    }
    deps.navigate(mapped);
    return;
  }
  const resolved = resolveChatbotScreenToken(t);
  if (resolved && !isChatbotHomeTabTarget(resolved)) {
    void handleChatbotNavigationAndroid(resolved, undefined, deps);
    return;
  }
  goHome();
}
