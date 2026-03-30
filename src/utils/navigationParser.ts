/**
 * Navigation Parser
 * Parses chatbot responses and extracts navigation instructions
 */

import { resolveChatbotScreenToken, isChatbotHomeTabTarget } from './chatbotNavTargets';

export interface NavigationAction {
  type: 'tab' | 'screen' | 'link';
  target: string;
  label: string;
  params?: Record<string, any>;
  description?: string;
}

export interface ParsedResponse {
  text: string;
  actions: NavigationAction[];
  hasNavigation: boolean;
}

/** Lowercase alnum-only key for matching [NAV:...] tokens regardless of `-` / `_` / spaces. */
function normalizeNavTokenKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Bold text (lowercased) that should match a profile subsection tap.
 * Keeps chat links working when labels differ slightly from **bold** text.
 */
export const CHATBOT_PROFILE_SECTION_ALIASES: Record<string, readonly string[]> = {
  editProfile: [
    'edit profile',
    'edit profile info',
    'edit your profile',
    'my data',
    'my information',
    'account details',
    'profile information',
    'personal information',
  ],
  changePhone: [
    'change phone',
    'change phone number',
    'change your phone',
    'update phone',
    'update phone number',
    'update your phone number',
    'phone number',
  ],
  changePassword: [
    'change password',
    'change your password',
    'update password',
    'password',
  ],
  portfolio: ['portfolio', 'my portfolio'],
  subscription: ['subscription', 'my subscription', 'subscriptions', 'billing', 'payment plan'],
  availability: ['availability', 'my availability', 'schedule'],
  services: ['services', 'my services', 'service management', 'my suggestions', 'suggest service'],
  smallTasks: [
    'small tasks',
    'task types',
    'task specializations',
    'my task types',
    'specializations',
  ],
  regions: ['regions', 'manage regions', 'working areas', 'service areas', 'coverage areas'],
  transactions: [
    'payment history',
    'transaction history',
    'transactions',
    'payments history',
    'transaction details',
    'view transactions',
  ],
  support: ['support', 'customer support', 'help desk', 'contact support'],
};

/** Maps compact token → profile sidebar section (matches ProfileScreen switch + App profileInlineRedirect). */
const PROFILE_SECTION_BY_COMPACT: Record<string, string> = {
  changephone: 'changePhone',
  changepassword: 'changePassword',
  editprofile: 'editProfile',
  mydata: 'editProfile',
  myinformation: 'editProfile',
  accountdetails: 'editProfile',
  personalinformation: 'editProfile',
  profileinformation: 'editProfile',
  subscription: 'subscription',
  subscriptionmanagement: 'subscription',
  mysubscription: 'subscription',
  availability: 'availability',
  myavailability: 'availability',
  services: 'services',
  servicemanagement: 'services',
  myservices: 'services',
  suggestservice: 'services',
  regions: 'regions',
  regionsmanagement: 'regions',
  workingareas: 'regions',
  serviceareas: 'regions',
  /** Profile technician task-type specializations (not the global small-task browse screen). */
  taskspecializations: 'smallTasks',
  myspecializations: 'smallTasks',
  profilesmalltasks: 'smallTasks',
  paymenthistory: 'transactions',
  transactionhistory: 'transactions',
  mytransactions: 'transactions',
  transactions: 'transactions',
  paymenttransactions: 'transactions',
  support: 'support',
};

/**
 * Maps compact [NAV:...] token → `projects` list with `activeFilter` (MyProjectsScreen / PhaseFilter).
 * After profile map. Omit bare `all` — too ambiguous; use allprojects / myprojects.
 */
const PROJECT_LIST_PHASE_BY_COMPACT: Record<string, string> = {
  allprojects: 'all',
  myprojects: 'all',
  projectlist: 'all',
  everyproject: 'all',
  /** Large-project pending tab (`[NAV:pending]` = this list, not small tasks). */
  pending: 'pending',
  pendingprojects: 'pending',
  largepending: 'pending',
  projectspending: 'pending',
  awaitingapproval: 'pending',
  awaiting: 'pending',
  directassigned: 'direct-assigned',
  directassignment: 'direct-assigned',
  assignedtome: 'direct-assigned',
  bidding: 'bidding',
  bidreview: 'bidding',
  mybids: 'bidding',
  mybidding: 'bidding',
  placebid: 'bidding',
  approved: 'approved',
  approvedprojects: 'approved',
  contract: 'contract',
  contractsigning: 'contract',
  contracts: 'contract',
  signing: 'contract',
  inprogress: 'in-progress',
  inprogressprojects: 'in-progress',
  runningprojects: 'in-progress',
  running: 'in-progress',
  ongoing: 'in-progress',
  activeprojects: 'in-progress',
  completed: 'completed',
  completedprojects: 'completed',
  done: 'completed',
  finished: 'completed',
  accepted: 'accepted',
  acceptedprojects: 'accepted',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

/** Tap phrases (lowercase) per project list phase — used by ChatBotScreen bold matching. */
export const CHATBOT_PROJECT_PHASE_ALIASES: Record<string, readonly string[]> = {
  all: ['all projects', 'my projects', 'project list', 'all my projects'],
  pending: [
    'pending projects',
    'large projects pending',
    'large project pending',
    'awaiting approval',
    'draft projects',
    'projects — pending',
    'pending',
  ],
  'direct-assigned': ['direct assigned', 'direct-assigned', 'assigned projects'],
  bidding: ['bidding', 'bid review', 'my bids', 'place bid', 'open bids'],
  approved: ['approved', 'approved projects'],
  contract: ['contract', 'contract signing', 'sign contract', 'contracts'],
  'in-progress': [
    'in progress',
    'in-progress',
    'running projects',
    'ongoing',
    'active projects',
    'currently running',
  ],
  completed: ['completed', 'completed projects', 'done', 'finished'],
  accepted: ['accepted', 'accepted projects'],
  cancelled: ['cancelled', 'canceled'],
};

/**
 * Compact NAV token → small-task row on Projects (`projectTypeFilter: 'small'` + `activeFilter`).
 * Placed before large-project phase map in `resolveNavTagToAction`. Do not use bare `smalltasks` (that maps to smallTaskTypes screen).
 */
/**
 * Technician large-project list: **Available** (open market / submit bid) uses `activeFilter: 'pending'`
 * with label "Available" in the UI — same filter value as owner "Pending" but different role UX.
 * Use these tokens so the chatbot link says **Available** and lands on the right tab.
 */
const TECHNICIAN_PROJECTS_LIST_BY_COMPACT: Record<
  string,
  { activeFilter: string; chatbotUxTab: string }
> = {
  techavailable: { activeFilter: 'pending', chatbotUxTab: 'technician-available' },
  availableprojects: { activeFilter: 'pending', chatbotUxTab: 'technician-available' },
  availableforbidding: { activeFilter: 'pending', chatbotUxTab: 'technician-available' },
  submitbid: { activeFilter: 'pending', chatbotUxTab: 'technician-available' },
  browseprojects: { activeFilter: 'pending', chatbotUxTab: 'technician-available' },
  openmarket: { activeFilter: 'pending', chatbotUxTab: 'technician-available' },
};

const SMALL_TASK_PROJECTS_LIST_BY_COMPACT: Record<string, string> = {
  /** Bare `[NAV:pending]` is large projects (see PROJECT_LIST_PHASE). Small-task pending: stpending / smalltasksp / or params. */
  smalltasksall: 'all',
  smalltaskspending: 'pending',
  smalltasksmybids: 'pending',
  smalltasksbidding: 'pending',
  smalltaskaccepted: 'accepted',
  smalltasksinprogress: 'in-progress',
  smalltaskscompleted: 'completed',
  smalltaskscancelled: 'cancelled',
  stall: 'all',
  stpending: 'pending',
  staccepted: 'accepted',
  stinprogress: 'in-progress',
  stcompleted: 'completed',
  stcancelled: 'cancelled',
  mysmalltasks: 'all',
  smalltaskstatus: 'all',
  smalltasksstatus: 'all',
  smalltaskstate: 'all',
};

/** Tap phrases per small-task phase (Projects screen, small tab). */
export const CHATBOT_SMALL_TASK_LIST_ALIASES: Record<string, readonly string[]> = {
  all: [
    'small tasks',
    'my small tasks',
    'all small tasks',
    'small task list',
    'small task status',
    'small tasks status',
    'status of small tasks',
    'check small task status',
  ],
  pending: [
    'small tasks — pending',
    'my small bids',
    'small task pending',
    'pending small tasks',
    'small task bids',
    'my bids small',
    'available small tasks',
  ],
  accepted: ['accepted small tasks'],
  'in-progress': ['small tasks in progress', 'in progress small tasks', 'ongoing small tasks'],
  completed: ['completed small tasks', 'finished small tasks'],
  cancelled: ['cancelled small tasks', 'canceled small tasks'],
};

/**
 * Parse chatbot response and extract navigation actions
 */
export function parseNavigationFromResponse(responseText: string): ParsedResponse {
  const actions: NavigationAction[] = [];
  /** When the model uses [NAV:...], skip loose heuristics that duplicate the same screens (Pattern 5). */
  const hadStructuredNavTags = /\[\s*NAV\s*:/i.test(responseText);

  // Pattern 0: JSON navigation format (fallback - AI should use [NAV:] but handle JSON if it appears)
  try {
    // Try to find JSON objects in the response
    const jsonPattern = /\{[\s\S]*?"action"\s*:\s*"navigate"[\s\S]*?\}/g;
    let jsonMatch;
    while ((jsonMatch = jsonPattern.exec(responseText)) !== null) {
      try {
        const jsonObj = JSON.parse(jsonMatch[0]);
        if (jsonObj.action === 'navigate') {
          let screenName: string | null = null;
          let actionType: 'tab' | 'screen' = 'screen';
          
          // Check method field first (e.g., "Tab: .profile")
          if (jsonObj.method) {
            const methodMatch = jsonObj.method.match(/Tab:\s*\.(\w+)/i);
            if (methodMatch) {
              const tabName = methodMatch[1];
              screenName = mapSwiftTabToReactNative(tabName);
              actionType = 'tab';
            }
          }
          
          // If no method, try view field (e.g., "MyProfileView")
          if (!screenName && jsonObj.view) {
            const viewName = jsonObj.view.replace('View', '').replace('My', '');
            screenName = mapViewNameToScreen(viewName);
            actionType = 'screen';
          }
          
          if (screenName) {
            actions.push({
              type: actionType,
              target: screenName,
              label: jsonObj.description || `Go to ${screenName}`,
              params: jsonObj.parameters || {},
              description: jsonObj.description,
            });
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  } catch (e) {
    // Ignore JSON extraction errors
  }

  /** Models sometimes write a stray `` ` `` before `[NAV:...]`, which stops the tag from matching. */
  const navSourceText = responseText.replace(/[`\u2018\u2019]+\s*(\[\s*NAV\s*:)/gi, '$1');

  // Pattern 1: [NAV:screen_name] — replace each tag with **Link label** so the chat UI renders blue Pressable
  // links (it matches **bold** to navigationActions). Stripping tags alone left empty `` and black text.
  // Allow `projects/pending`‑style path tokens (models often emit URL-like NAV labels).
  const navTagPattern = /\[\s*NAV\s*:\s*([\w./-]+)(?::([^\]]+))?\]/gi;
  let cleanedText = navSourceText.replace(navTagPattern, (_full, rawSn, paramsString) => {
    const screenName = String(rawSn).replace(/\./g, '-');
    const raw = resolveNavTagToAction(screenName, paramsString);
    if (!raw) {
      return '';
    }
    const phrase = navTagToBoldPhrase(raw);
    actions.push({ ...raw, label: phrase });
    return `**${phrase}**`;
  });

  // Pattern 2: Tab navigation - selectedTab = .projects (unknown tokens like .pendingProject → screen, not tab)
  const tabPattern = /selectedTab\s*=\s*\.(\w+)/gi;
  let tabMatch;
  while ((tabMatch = tabPattern.exec(navSourceText)) !== null) {
    const tabName = tabMatch[1];
    const mappedTarget = mapSwiftTabToReactNative(tabName);
    const resolved =
      resolveChatbotScreenToken(mappedTarget) ?? resolveChatbotScreenToken(tabName);
    if (!isChatbotHomeTabTarget(mappedTarget)) {
      const screenId = resolved ?? mappedTarget;
      actions.push({
        type: 'screen',
        target: screenId,
        label: `Go to ${formatScreenName(screenId)}`,
        description: `Navigate to ${formatScreenName(screenId)}`,
      });
    } else {
      actions.push({
        type: 'tab',
        target: mappedTarget,
        label: `Go to ${formatTabName(tabName)}`,
        description: `Navigate to ${formatTabName(tabName)} tab`,
      });
    }
  }

  // Pattern 3: NavigationLink - NavigationLink(destination: ViewName(...))
  const navLinkPattern = /NavigationLink\(destination:\s*(\w+)\(([^)]*)\)/gi;
  let navMatch;
  while ((navMatch = navLinkPattern.exec(navSourceText)) !== null) {
    const viewName = navMatch[1];
    const params = navMatch[2];
    
    const screenInfo = mapSwiftViewToReactNative(viewName);
    if (screenInfo) {
      actions.push({
        type: 'screen',
        target: screenInfo.screen,
        label: screenInfo.label,
        params: parseParams(params),
        description: screenInfo.description,
      });
    }
  }

  // Pattern 4: View references without NavigationLink
  const viewPattern = /`(\w+View)\(\)`/g;
  let viewMatch;
  while ((viewMatch = viewPattern.exec(navSourceText)) !== null) {
    const viewName = viewMatch[1].replace('View', '');
    const screenInfo = mapSwiftViewToReactNative(viewName);
    if (screenInfo && !actions.some(a => a.target === screenInfo.screen)) {
      actions.push({
        type: 'screen',
        target: screenInfo.screen,
        label: screenInfo.label,
        description: screenInfo.description,
      });
    }
  }

  // Pattern 5: Explicit instructions like "Navigate to X", "Go to Y", "Open Z"
  // Skip when [NAV:] tags are present — prose duplicates "Go to Projects" style links and floods the UI.
  if (!hadStructuredNavTags) {
    const instructionPattern = /(?:navigate to|go to|open|view|access)\s+(?:the\s+)?([A-Z][\w\s]+?)(?:\s+tab|\s+screen|\s+page|\.|\n|$)/gi;
    let instMatch;
    while ((instMatch = instructionPattern.exec(navSourceText)) !== null) {
      const target = instMatch[1].trim();
      const screenInfo = findScreenByKeyword(target);
      if (screenInfo && !actions.some(a => a.target === screenInfo.screen)) {
        actions.push({
          type: screenInfo.type as any,
          target: screenInfo.screen,
          label: screenInfo.label,
          description: screenInfo.description,
        });
      }
    }
  }

  // Clean up JSON navigate blocks from displayed text (NAV tags already converted to **labels** above)
  cleanedText = cleanedText
    .replace(/\{[\s\S]*?"action"\s*:\s*"navigate"[\s\S]*?\}/g, '')
    .replace(/```json[\s\S]*?```/gi, '')
    // Do not strip all ``` blocks — it removed legitimate assistant examples. Empty `` from stripped NAV:
    .replace(/`[\s\u00a0]*`/g, '')
    // Inline `code` and stray backticks — client renders one paragraph; backticks looked like broken layout
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/`/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const deduped = removeDuplicateActions(actions);
  return {
    text: cleanedText,
    actions: deduped,
    hasNavigation: deduped.length > 0,
  };
}

/**
 * Map Swift tab names to React Native tab names
 */
function mapSwiftTabToReactNative(swiftTab: string): string {
  const mapping: Record<string, string> = {
    'home': 'Home',
    'profile': 'Profile',
    'myProjects': 'Projects',
    'projects': 'Projects',
    'appointments': 'Appointments',
    'createProject': 'CreateProject',
    'payments': 'Payments',
  };
  
  return mapping[swiftTab] || swiftTab;
}

/**
 * Map Swift view names to React Native screens
 */
function mapSwiftViewToReactNative(swiftView: string): { screen: string; label: string; description: string; type: string } | null {
  const mapping: Record<string, { screen: string; label: string; description: string; type: string }> = {
    'AvailableProjectsView': {
      screen: 'Projects',
      label: 'View Available Projects',
      description: 'Browse projects available for bidding',
      type: 'tab',
    },
    'AllUserProjectsView': {
      screen: 'Projects',
      label: 'View My Projects',
      description: 'See all your projects',
      type: 'tab',
    },
    'ProjectStatusTimelineView': {
      screen: 'ProjectDetails',
      label: 'View Project Details',
      description: 'See project timeline and status',
      type: 'screen',
    },
    'ServiceProvidersView': {
      screen: 'ServiceProviders',
      label: 'View Service Providers',
      description: 'Browse available service providers',
      type: 'screen',
    },
    'TechUserProfileView': {
      screen: 'TechnicianProfile',
      label: 'View Technician Profile',
      description: 'See technician details',
      type: 'screen',
    },
    'AppointmentsListView': {
      screen: 'Appointments',
      label: 'View Appointments',
      description: 'Manage your appointments',
      type: 'tab',
    },
    'BidForm': {
      screen: 'BidForm',
      label: 'Submit Bid',
      description: 'Submit a bid for this project',
      type: 'screen',
    },
    'CreateProjectSelectionView': {
      screen: 'CreateProject',
      label: 'Create Project',
      description: 'Start creating a new project',
      type: 'tab',
    },
    'PortfolioManagementView': {
      screen: 'Portfolio',
      label: 'Manage Portfolio',
      description: 'View and edit your portfolio',
      type: 'screen',
    },
    'ChatsModule.ListView': {
      screen: 'ChatRooms',
      label: 'View Messages',
      description: 'See your conversations',
      type: 'screen',
    },
  };
  
  return mapping[swiftView] || null;
}

/**
 * Find screen by keyword matching
 */
function findScreenByKeyword(keyword: string): { screen: string; label: string; description: string; type: string } | null {
  const lower = keyword.toLowerCase();
  
  if (lower.includes('available project') || lower.includes('projects available')) {
    return {
      screen: 'Projects',
      label: 'View Available Projects',
      description: 'Browse projects available for bidding',
      type: 'tab',
    };
  }
  
  if (lower.includes('my project') || lower.includes('your project')) {
    return {
      screen: 'Projects',
      label: 'View My Projects',
      description: 'See all your projects',
      type: 'tab',
    };
  }
  
  if (lower.includes('appointment')) {
    return {
      screen: 'Appointments',
      label: 'View Appointments',
      description: 'Manage your appointments',
      type: 'tab',
    };
  }
  
  if (lower.includes('profile')) {
    return {
      screen: 'Profile',
      label: 'View Profile',
      description: 'See your profile',
      type: 'tab',
    };
  }
  
  if (lower.includes('bid') && (lower.includes('submit') || lower.includes('place'))) {
    return {
      screen: 'BidForm',
      label: 'Submit Bid',
      description: 'Submit a bid for a project',
      type: 'screen',
    };
  }
  
  if (lower.includes('create project') || lower.includes('new project')) {
    return {
      screen: 'CreateProject',
      label: 'Create Project',
      description: 'Start creating a new project',
      type: 'tab',
    };
  }
  
  if (lower.includes('service provider') || lower.includes('technician')) {
    return {
      screen: 'ServiceProviders',
      label: 'View Service Providers',
      description: 'Browse available service providers',
      type: 'screen',
    };
  }
  
  if (lower.includes('chat') || lower.includes('message')) {
    return {
      screen: 'ChatRooms',
      label: 'View Messages',
      description: 'See your conversations',
      type: 'screen',
    };
  }
  
  // New screens
  if (lower.includes('blog')) {
    return {
      screen: 'blogList',
      label: 'View Blogs',
      description: 'Browse construction articles',
      type: 'screen',
    };
  }
  
  if (lower.includes('help') || lower.includes('faq')) {
    return {
      screen: 'helpCenter',
      label: 'Help Center',
      description: 'Get help using Bonyad',
      type: 'screen',
    };
  }
  
  if (lower.includes('small task')) {
    return {
      screen: 'smallTaskTypes',
      label: 'Small Tasks',
      description: 'Browse quick jobs',
      type: 'screen',
    };
  }
  
  if (lower.includes('ticket') || lower.includes('support')) {
    return {
      screen: 'supportTickets',
      label: 'Support Tickets',
      description: 'Get help from our team',
      type: 'screen',
    };
  }
  
  if (lower.includes('pending project')) {
    return {
      screen: 'pendingProjects',
      label: 'Pending Projects',
      description: 'View projects awaiting approval',
      type: 'screen',
    };
  }
  
  if (lower.includes('completed project')) {
    return {
      screen: 'completedProjects',
      label: 'Completed Projects',
      description: 'View finished projects',
      type: 'screen',
    };
  }
  
  return null;
}

/**
 * Parse parameters from Swift syntax
 */
function parseParams(paramsString: string): Record<string, any> {
  const params: Record<string, any> = {};
  
  // Parse projectId: "123"
  const idMatch = paramsString.match(/(?:projectId|technicianId|userId):\s*"?(\w+)"?/);
  if (idMatch) {
    params.id = idMatch[1];
  }

  const blogIdMatch = paramsString.match(/blogId:\s*"?(\w+)"?/i);
  if (blogIdMatch) {
    params.blogId = blogIdMatch[1];
  }

  const projectIdMatch = paramsString.match(/projectId:\s*"?(\w+)"?/i);
  if (projectIdMatch) {
    params.projectId = projectIdMatch[1];
  }

  const roomIdMatch = paramsString.match(/roomId:\s*"?([^"\],;\]]+)"?/i);
  if (roomIdMatch) {
    params.roomId = roomIdMatch[1].trim();
  }

  const requestIdMatch = paramsString.match(/requestId:\s*"?(\w+)"?/i);
  if (requestIdMatch) {
    params.requestId = requestIdMatch[1];
  }

  const receiverIdMatch = paramsString.match(/receiverId:\s*"?(\w+)"?/i);
  if (receiverIdMatch) {
    params.receiverId = receiverIdMatch[1];
  }

  const receiverNameMatch = paramsString.match(/receiverName:\s*"([^"]*)"|receiverName:\s*([^\s,\]]+)/i);
  if (receiverNameMatch) {
    params.receiverName = (receiverNameMatch[1] ?? receiverNameMatch[2] ?? '').trim();
  }

  // Generic key=value segments (e.g. mode=manual, entry=ai) from [NAV:newProject:mode=manual]
  const segments = paramsString
    .split(/[&,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const seg of segments) {
    const eq = seg.indexOf('=');
    if (eq <= 0) continue;
    const k = seg.slice(0, eq).trim();
    let v = seg.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && v !== '' && params[k] === undefined) {
      params[k] = v;
    }
  }

  return params;
}

/**
 * Resolve [NAV:...] token to a navigation action (same logic as former Pattern-1 loop).
 */
function resolveNavTagToAction(screenName: string, paramsString?: string): NavigationAction | null {
  const params = paramsString ? parseParams(paramsString) : undefined;
  const lower = screenName.trim().toLowerCase();
  const nk = normalizeNavTokenKey(screenName);

  if (lower === 'manualproject' || lower === 'newprojectmanual') {
    return {
      type: 'screen',
      target: 'newProject',
      params: { ...(params || {}), mode: (params as Record<string, string>)?.mode || 'manual' },
      label: '',
      description: 'Manual project creation',
    };
  }
  if (lower === 'aiproject' || lower === 'newprojectai') {
    return {
      type: 'screen',
      target: 'aiForm',
      params,
      label: '',
      description: 'AI-assisted project creation',
    };
  }

  /** e.g. [NAV:profile-changePassword], [NAV:profile.password] → `profile-changePassword` after dot fix */
  const profilePref = screenName.trim().match(/^profile[-._\s]+(.+)$/i);
  if (profilePref) {
    const innerNk = normalizeNavTokenKey(profilePref[1]);
    const sec = PROFILE_SECTION_BY_COMPACT[innerNk];
    if (sec) {
      return {
        type: 'screen',
        target: 'profile',
        params: { ...(params || {}), section: sec },
        label: '',
        description: 'Profile section',
      };
    }
  }

  const sectionFromCompact = PROFILE_SECTION_BY_COMPACT[nk];
  if (sectionFromCompact) {
    return {
      type: 'screen',
      target: 'profile',
      params: { ...(params || {}), section: sectionFromCompact },
      label: '',
      description: 'Profile section',
    };
  }

  const smallTaskPhase = SMALL_TASK_PROJECTS_LIST_BY_COMPACT[nk];
  if (smallTaskPhase) {
    return {
      type: 'screen',
      target: 'projects',
      params: { ...(params || {}), projectTypeFilter: 'small', activeFilter: smallTaskPhase },
      label: '',
      description: 'Small tasks list',
    };
  }

  const techList = TECHNICIAN_PROJECTS_LIST_BY_COMPACT[nk];
  if (techList) {
    return {
      type: 'screen',
      target: 'projects',
      params: {
        ...(params || {}),
        projectTypeFilter: 'large',
        activeFilter: techList.activeFilter,
        chatbotUxTab: techList.chatbotUxTab,
      },
      label: '',
      description: 'Technician Available / browse projects',
    };
  }

  const projectPhase = PROJECT_LIST_PHASE_BY_COMPACT[nk];
  if (projectPhase) {
    return {
      type: 'screen',
      target: 'projects',
      params: {
        ...(params || {}),
        projectTypeFilter: 'large',
        activeFilter: projectPhase,
      },
      label: '',
      description: 'Projects — phase filter',
    };
  }

  const screenInfo = mapSwiftViewToReactNative(screenName);
  if (screenInfo) {
    return {
      type: screenInfo.type as 'tab' | 'screen',
      target: screenInfo.screen,
      label: screenInfo.label,
      params,
      description: screenInfo.description,
    };
  }
  const mappedScreen = mapViewNameToScreen(screenName);
  if (mappedScreen) {
    return {
      type: 'screen',
      target: mappedScreen,
      label: `Go to ${formatScreenName(screenName)}`,
      params,
      description: `Navigate to ${formatScreenName(screenName)}`,
    };
  }
  const mappedTab = mapSwiftTabToReactNative(screenName);
  if (mappedTab) {
    return {
      type: 'tab',
      target: mappedTab,
      label: `Go to ${formatTabName(screenName)}`,
      description: `Navigate to ${formatTabName(screenName)} tab`,
    };
  }
  const resolved = resolveChatbotScreenToken(screenName);
  if (resolved) {
    return {
      type: 'screen',
      target: resolved,
      label: `Go to ${formatScreenName(resolved)}`,
      params,
      description: `Navigate to ${formatScreenName(resolved)}`,
    };
  }
  return null;
}

/**
 * Phrase inserted as **phrase** so ChatBotScreen inline matcher + navigationActions share the same label.
 */
function navTagToBoldPhrase(action: NavigationAction): string {
  const t = action.target;
  const p = action.params as Record<string, string> | undefined;
  const mode = String(p?.mode ?? p?.entry ?? '').toLowerCase();
  if (t === 'newProject' && mode === 'manual') return 'Manual entry';
  if (t === 'newProject') return 'New project';
  if (t === 'aiForm') return 'AI form';
  if (t === 'projects' && p?.activeFilter) {
    if (String((p as Record<string, string>)?.chatbotUxTab ?? '') === 'technician-available') {
      return 'Available';
    }
    const af = String(p.activeFilter).toLowerCase().replace(/_/g, '-');
    const isSmall = String(p.projectTypeFilter ?? '').toLowerCase() === 'small';
    if (isSmall) {
      const smallLabels: Record<string, string> = {
        all: 'Small tasks — All',
        pending: 'Small tasks — Pending',
        accepted: 'Small tasks — Accepted',
        'in-progress': 'Small tasks — In progress',
        completed: 'Small tasks — Completed',
        cancelled: 'Small tasks — Cancelled',
      };
      return smallLabels[af] || `Small tasks — ${formatScreenName(af)}`;
    }
    const phaseLabels: Record<string, string> = {
      all: 'All projects',
      /** Distinct from small-task “Pending” links */
      pending: 'Projects — Pending',
      'direct-assigned': 'Direct assigned',
      bidding: 'Bidding',
      approved: 'Approved',
      contract: 'Contract',
      'in-progress': 'In progress',
      completed: 'Completed',
      accepted: 'Accepted',
      cancelled: 'Cancelled',
    };
    return phaseLabels[af] || formatScreenName(af);
  }

  if (t === 'profile' && p?.section) {
    const bySection: Record<string, string> = {
      editProfile: 'Edit profile',
      changePhone: 'Change phone',
      changePassword: 'Change password',
      subscription: 'Subscription',
      availability: 'Availability',
      services: 'Services',
      smallTasks: 'Small tasks',
      regions: 'Working areas',
      transactions: 'Payment history',
      portfolio: 'Portfolio',
      support: 'Support',
    };
    return bySection[p.section] || 'Profile';
  }

  const known: Record<string, string> = {
    smallTaskTypes: 'Small tasks',
    projects: 'Projects',
    helpCenter: 'Help Center',
    chatRooms: 'Chat',
    profile: 'Profile',
    changePassword: 'Change password',
    changePhone: 'Change phone',
    paymentHistory: 'Payment history',
    platformCommission: 'Payments',
    blogList: 'Blogs',
    supportTickets: 'Support tickets',
    createSmallTask: 'Create small task',
  };
  if (known[t]) return known[t];
  return formatScreenName(t);
}

/**
 * Map view names to screen names (e.g., "MyProfile" -> "profile", "Profile" -> "profile")
 */
function mapViewNameToScreen(viewName: string): string | null {
  const lower = viewName.toLowerCase();
  
  // Direct mappings
  const mappings: Record<string, string> = {
    'profile': 'profile',
    'myprofile': 'profile',
    'login': 'login',
    'signup': 'signup',
    'projects': 'projects',
    'home': 'home',
    'editprofile': 'profile',
    'mydata': 'profile',
    'chatrooms': 'chatRooms',
    'notifications': 'notifications',
    'appointments': 'appointments',
    'newproject': 'newProject',
    'runningprojects': 'inProgress',
    'portfolio': 'portfolio',
    'services': 'services',
    // New screens
    'bloglist': 'blogList',
    'blog': 'blogList',
    'blogs': 'blogList',
    'myblogs': 'myBlogs',
    'createblog': 'myBlogs',
    'helpcenter': 'helpCenter',
    'faq': 'faq',
    'smalltasks': 'smallTaskTypes',
    'createsmalltask': 'createSmallTask',
    'supporttickets': 'supportTickets',
    'bidreview': 'bidReview',
    'projectdetail': 'projectDetail',
    'pendingprojects': 'pendingProjects',
    'approvedprojects': 'approvedProjects',
    'inprogress': 'inProgress',
    'completedprojects': 'completedProjects',
    'contractsigning': 'contractSigning',
    'changerequests': 'changeRequests',
    'howitworks': 'howItWorks',
    'ourservices': 'ourServices',
    'tasks': 'tasks',
    'regionsmanagement': 'regionsManagement',
  };
  
  if (mappings[lower]) {
    return mappings[lower];
  }
  
  // Try camelCase conversion
  const camelCase = lower.charAt(0).toLowerCase() + lower.slice(1);
  if (mappings[camelCase]) {
    return mappings[camelCase];
  }
  
  return null;
}

/**
 * Format screen name for display
 */
function formatScreenName(screenName: string): string {
  // Convert camelCase to Title Case
  return screenName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Format tab name for display
 */
function formatTabName(tabName: string): string {
  // Convert camelCase to Title Case
  return tabName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Remove duplicate actions
 */
function removeDuplicateActions(actions: NavigationAction[]): NavigationAction[] {
  const seen = new Set<string>();
  return actions.filter(action => {
    const key = `${action.type}-${action.target}-${JSON.stringify(action.params ?? {})}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

