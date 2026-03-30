/**
 * Maps chatbot [NAV:...] tokens and parser output to App screen ids.
 * Also provides a full registry so any valid app screen can be opened from the chatbot.
 */

/** Must match `Screen` in App.tsx / useRouter.ts (single source for chatbot pass-through). */
export const APP_SCREEN_IDS: readonly string[] = [
  'splash',
  'welcome',
  'overviewLanding',
  'ourServices',
  'howItWorks',
  'about',
  'contact',
  'faq',
  'introToApp',
  'introVideos',
  'login',
  'signup',
  'otp',
  'forgotPassword',
  'otpVerification',
  'resetPassword',
  'home',
  'profile',
  'changePhone',
  'changePassword',
  'portfolio',
  'services',
  'regions',
  'availability',
  'subscription',
  'newProject',
  'aiForm',
  'projects',
  'projectsDetail',
  'chatRooms',
  'chatDetail',
  'notifications',
  'appointments',
  'booking',
  'technicianProfile',
  'technicianOnboarding',
  'roomDesign',
  'voiceAI',
  'costExplorer',
  'roomVisualizer',
  'askBonyadAI',
  'projectsMap',
  'chatDemo',
  'chatBot',
  'pendingProject',
  'ownerProjectEdit',
  'bidReceivedProject',
  'approvedProject',
  'contractSigningProject',
  'inProgressProject',
  'completedProject',
  'platformCommission',
  'changeRequestList',
  'requestModification',
  'smallTaskTypes',
  'createSmallTask',
  'smallTaskDetail',
  'technicianSmallTaskDetail',
  'technicianAcceptedSmallTask',
  'technicianInProgressSmallTask',
  'technicianCompletedSmallTask',
  'technicianTaskProgress',
  'completeProfile',
  'waitingApproval',
  'dataRequests',
  'blogList',
  'blogDetail',
  'myBlogs',
  'helpCenter',
  'helpCategory',
  'helpArticle',
  'helpSearch',
  'supportTickets',
  'supportTicketDetail',
  'paymentCallback',
  'paymentHistory',
] as const;

const SCREEN_SET = new Set<string>(APP_SCREEN_IDS);

function compactAlnum(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** e.g. in-progress-project → inProgressProject (only when separators present). */
function hyphenatedToCamelToken(s: string): string | null {
  if (!/[-_\s]/.test(s)) return null;
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part, i) =>
      i === 0
        ? part.charAt(0).toLowerCase() + part.slice(1).toLowerCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join('');
}

/**
 * Resolve a chatbot token to a canonical app screen id, or null if unknown.
 */
export function resolveChatbotScreenToken(token: string): string | null {
  const raw = token?.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const decap = raw.charAt(0).toLowerCase() + raw.slice(1);
  const compact = compactAlnum(raw);

  const tryId = (id: string | null | undefined): string | null => {
    if (!id) return null;
    if (SCREEN_SET.has(id)) return id;
    return null;
  };

  const hyRaw = hyphenatedToCamelToken(raw);
  const hyLower = hyphenatedToCamelToken(lower);

  return (
    tryId(raw) ??
    tryId(decap) ??
    tryId(lower) ??
    tryId(hyRaw) ??
    tryId(hyLower) ??
    (() => {
      for (const id of APP_SCREEN_IDS) {
        if (compactAlnum(id) === compact) return id;
      }
      return null;
    })()
  );
}

/**
 * True if the parser/chat should treat this as a home bottom-tab switch (onNavigateToTab).
 * Swift `selectedTab = .pendingProject` is NOT a tab — it must open a full screen (e.g. pendingProject).
 */
const HOME_TAB_COMPACT = new Set<string>([
  'home',
  'projects',
  'profile',
  'chat',
  'chatrooms',
  'notifications',
  'appointments',
  'wallet',
  'payments',
  'createproject',
]);

export function isChatbotHomeTabTarget(name: string): boolean {
  if (!name?.trim()) return false;
  return HOME_TAB_COMPACT.has(compactAlnum(name));
}

export const CHATBOT_NAV_SCREEN_MAP: Record<string, string> = {
  // Blogs & content
  bloglist: 'blogList',
  blog: 'blogList',
  blogs: 'blogList',
  blogdetail: 'blogDetail',
  myblogs: 'myBlogs',
  createblog: 'myBlogs',
  createBlog: 'myBlogs',
  myblog: 'myBlogs',

  // Help & support
  helpcenter: 'helpCenter',
  help: 'helpCenter',
  faq: 'faq',
  supporttickets: 'supportTickets',
  tickets: 'supportTickets',
  support: 'supportTickets',
  ticket: 'supportTickets',
  helpsearch: 'helpSearch',
  helpcategory: 'helpCategory',
  helparticle: 'helpArticle',
  supportticketdetail: 'supportTicketDetail',

  // Auth & public marketing screens
  splash: 'splash',
  welcome: 'welcome',
  overviewlanding: 'overviewLanding',
  ourservices: 'ourServices',
  howitworks: 'howItWorks',
  about: 'about',
  contact: 'contact',
  introtoapp: 'introToApp',
  introvideos: 'introVideos',
  forgotpassword: 'forgotPassword',
  otpverification: 'otpVerification',
  resetpassword: 'resetPassword',
  otp: 'otp',

  // Account & profile routes
  mydata: 'profile',
  myData: 'profile',
  editprofile: 'profile',
  changephone: 'changePhone',
  changepassword: 'changePassword',
  subscriptionmanagement: 'profile',
  paymenthistory: 'paymentHistory',
  paymentcallback: 'paymentCallback',

  // Technician / provider
  technicianonboarding: 'technicianOnboarding',
  technicianprofile: 'technicianProfile',
  completeprofile: 'completeProfile',
  completeProfile: 'completeProfile',
  waitingapproval: 'waitingApproval',
  waitingApproval: 'waitingApproval',
  datarequests: 'dataRequests',
  dataRequests: 'dataRequests',
  techniciantaskprogress: 'technicianTaskProgress',
  technicianTaskProgress: 'technicianTaskProgress',
  taskprogress: 'technicianTaskProgress',

  // Small tasks (canonical screens — not legacy parser names)
  smalltasks: 'smallTaskTypes',
  smalltasktypes: 'smallTaskTypes',
  tasktypes: 'smallTaskTypes',
  createsmalltask: 'createSmallTask',
  smalltaskdetail: 'smallTaskDetail',
  techniciansmalltaskdetail: 'technicianSmallTaskDetail',
  technicianacceptedsmalltask: 'technicianAcceptedSmallTask',
  technicianinprogresssmalltask: 'technicianInProgressSmallTask',
  techniciancompletedsmalltask: 'technicianCompletedSmallTask',

  // Service / regions naming from docs (no dedicated screen ids)
  servicemanagement: 'services',
  regionsmanagement: 'regions',
  suggestservice: 'services',
  mysuggestions: 'services',

  // Features & extras
  roomdesign: 'roomDesign',
  voiceai: 'voiceAI',
  costexplorer: 'costExplorer',
  roomvisualizer: 'roomVisualizer',
  askbonyadai: 'askBonyadAI',
  projectsmap: 'projectsMap',
  chatdemo: 'chatDemo',
  aiform: 'aiForm',
  projectsdetail: 'projects',
  tasks: 'smallTaskTypes',

  // Bids / projects list tab aliases → still resolved to `projects`; tab set in App
  bidreceived: 'projects',
  bidreview: 'projects',

  // Parser / keyword PascalCase leftovers (normalize also lowercases first char)
  BlogList: 'blogList',
  Bloglist: 'blogList',
  HelpCenter: 'helpCenter',
  SupportTickets: 'supportTickets',
  SmallTasks: 'smallTaskTypes',
  CreateBlog: 'myBlogs',
  MyBlogs: 'myBlogs',
};
