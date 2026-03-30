// API Configuration
// Same integration as web: absolute base URL, same endpoints and payloads.
// Base URL comes from env (apiBaseUrl in app.config extra) when set.

import { Platform } from 'react-native';
import { ENV } from './env';

const DEFAULT_BASE_URL = 'https://bonyad-app-nyayeditqq-ww.a.run.app/api';

/** Use ENV.API_BASE_URL (same as web) so one config drives both. */
const getBaseUrl = (): string => {
  const fromEnv = ENV.API_BASE_URL;
  if (fromEnv && fromEnv.startsWith('http')) {
    return fromEnv;
  }
  return DEFAULT_BASE_URL;
};

// Main Production API
export const API_BASE_URL = getBaseUrl();

if (__DEV__) {
  console.log('✅ [API] API_BASE_URL (small tasks use this):', API_BASE_URL);
}

/**
 * Bonyad AI chatbot (bonyad-chat): POST /api/chat on the configured host.
 * Configure via app.json extra.chatbotApiUrl or EXPO_PUBLIC_CHATBOT_API_URL.
 */
export function getChatbotBaseUrl(): string {
  const raw = (ENV.CHATBOT_API_URL || '').trim();
  if (!raw) {
    return Platform.OS === 'android' ? 'http://10.0.2.2:7860' : 'http://localhost:7860';
  }
  return raw
    .replace(/\/$/, '')
    .replace(/\/api\/chat\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/chat\/?$/i, '');
}

export function getChatbotChatUrl(): string {
  const base = getChatbotBaseUrl();
  const p = (ENV.CHATBOT_API_CHAT_PATH || '').trim();
  if (p) {
    const path = p.startsWith('/') ? p : `/${p}`;
    return `${base}${path}`;
  }
  return `${base}/api/chat`;
}

export function getChatbotHistoryUrl(conversationId: string): string {
  return `${getChatbotBaseUrl()}/api/chat/history/${encodeURIComponent(conversationId)}`;
}

/** @deprecated Prefer getChatbotBaseUrl() / getChatbotChatUrl() */
export const CHATBOT_BASE_URL = getChatbotBaseUrl();

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/users/register',
    REGISTER_WITH_FILES: '/users/register-with-files',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    FORGOT_PASSWORD_RESEND: '/auth/forgot-password/resend',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
    REFRESH_TOKEN: '/auth/refresh-token',
    VALIDATE_TOKEN: '/auth/validate-token',
  },

  // User Profile
  USER: {
    PROFILE: '/users/profile',
    PROFILE_BY_ID: '/users/:id/profile',
    UPDATE_PROFILE: '/users/profile',
    PROFILE_IMAGE: '/users/update-profile-image',
    CHANGE_PHONE: '/users/:userId/change-phone',
    CHANGE_PHONE_REQUEST: '/users/:userId/change-phone-request',
    CHANGE_PHONE_VERIFY: '/users/:userId/change-phone-verify',
    CHANGE_PASSWORD: '/users/:userId/change-password',
    USER_DETAILS: '/user-details',
    COMPLETE_PROFILE: '/users/complete-profile',
    DELETE_ACCOUNT: '/users/me/account',
    TECHNICIAN_STATUS: '/users/technician-status',
    SEARCH: '/users/search',
    TECHNICIANS_LIST: '/users/technicians',
    /** Approve terms (signup flow) */
    TERMS_APPROVE: '/users/terms/approve',
  },

  // Terms and Conditions (aligned with web)
  TERMS: {
    USER: '/terms/user',
    TECHNICIAN: '/terms/technician',
    BY_TYPE: '/terms',
  },

  // Zones (Regions)
  ZONES: {
    LIST: '/regions',
  },

  // Projects
  PROJECTS: {
    LIST: '/projects',
    CREATE: '/projects/create',
    UPDATE: '/projects/:id',
    DELETE: '/projects/:id',
    DETAILS: '/projects/:id',
    OWNER_EDIT: '/projects/:id/owner-edit',
    COMPLETE: '/projects/:id/complete',
    PHASES: '/phases',
    PROJECT_PHASES: '/projects/:id/phases',
    MY_PROJECTS: '/projects/my',
    MY_ASSIGNED: '/projects/my-assigned',
  },

  // Bids
  BIDS: {
    CREATE: '/bids/create',
    LIST: '/bids/project/:projectId',
    MY_BIDS: '/bids/my',
    UPDATE: '/bids/:id',
    DELETE: '/bids/:id',
    ACCEPT: '/bids/:id/accept',
  },

  // Visit Requests (aligned with web)
  VISIT_REQUESTS: {
    CREATE: '/visit-requests',
    MY: '/visit-requests/my',
    FOR_ME: '/visit-requests/for-me',
    LIST: '/visit-requests/project/:projectId',
    ACCEPT: '/visit-requests/:id/accept',
    REJECT: '/visit-requests/:id/reject',
    UPDATE: '/visit-requests/:id',
    DELETE: '/visit-requests/:id',
  },

  // Chat
  CHAT: {
    MY_CHATS: '/chat/my-chats',
    MESSAGES: '/chat/room/:roomId/messages',
    SEND: '/chat/send',
    SEND_WITH_FILE: '/chat/send-with-file',
    MARK_READ: '/chat/messages/:messageId/mark-read',
    MARK_ALL_READ: '/chat/rooms/:roomId/mark-all-read',
  },

  // Services (categories & subcategories)
  SERVICES: {
    LIST: '/services',
    CATEGORIES: '/services/categories',
    SUBCATEGORIES: '/services/:categoryId/subcategories',
  },

  // Technicians
  TECHNICIANS: {
    LIST: '/technicians',
    SEARCH: '/technicians/search',
    DETAILS: '/technicians/:id',
    REVIEWS: '/technicians/:id/reviews',
    SERVICES: '/technician/services/my-services',
    ADD_SERVICES: '/technician/services/add',
    REMOVE_SERVICE: '/technicians/services/:serviceId',
    AVAILABILITY: '/technicians/availability',
    ADD_AVAILABILITY: '/technicians/availability',
    SET_AVAILABILITY: '/technicians/availability/set',
    ADD_AVAILABILITY_BULK: '/technicians/availability/bulk',
    DELETE_AVAILABILITY: '/technicians/availability/:slotId',
    SUBSCRIPTION: '/users/subscription',
    SUBSCRIBE: '/users/subscribe',
    CANCEL_SUBSCRIPTION: '/users/subscription',
    SUBSCRIPTION_BIDS: '/users/subscription/bids',
    RESERVATIONS: '/technician/reservations/:id/:action',
  },

  // Portfolio
  PORTFOLIO: {
    CREATE: '/portfolios/create',
    MY: '/portfolios/my',
    BY_USER: '/portfolios/user/:userId',
    UPDATE: '/portfolios/update',
    ADD_PROJECT: '/portfolios/projects/add',
    UPDATE_PROJECT: '/portfolios/projects/:projectId',
    DELETE_PROJECT: '/portfolios/projects/:projectId',
    MY_PROJECTS: '/portfolios/projects/my',
    USER_PROJECTS: '/portfolios/projects/user/:userId',
    UPLOAD_PHOTO: '/portfolios/projects/upload-photo',
  },

  // Reviews
  REVIEWS: {
    CREATE: '/reviews',
    BY_USER: '/reviews/user/:userId',
    STATUS_BY_PROJECT: '/reviews/project/:projectId/status',
    MY_REVIEWS: '/reviews/my-reviews',
    REVIEW_DETAIL: '/reviews/:reviewId',
  },

  // Rating Categories
  RATING_CATEGORIES: {
    LIST: '/rating-categories',
  },

  // Phases (aligned with web backend)
  PHASES: {
    LIST: '/phases/project/:projectId',
    GET: '/phases/:phaseId',
    CREATE: '/phases',
    UPDATE: '/phases/:phaseId',
    DELETE: '/phases/:phaseId',
    APPROVE_ALL: '/phases/project/:projectId/approve-all',
    COMPLETE: '/phases/:phaseId/complete',
    PAY: '/phases/:phaseId/pay',
    REQUEST_PAYMENT: '/phases/:phaseId/request-payment',
    FINISH: '/phases/:phaseId/finish',
    CONFIRM_COMPLETION: '/phases/:phaseId/confirm-completion',
    PAYMENT_TIMING: '/phases/:phaseId/payment-timing',
    EXTENDED_STATUS: '/phases/:phaseId/extended-status',
    ISSUES: '/phases/:phaseId/issues',
    ISSUE_BY_ID: '/phases/:phaseId/issues/:issueId',
    RESOLVE_ISSUE: '/phases/:phaseId/issues/:issueId/resolve',
  },

  // Feedbacks
  FEEDBACKS: {
    CREATE: '/feedbacks',
    LIST: '/feedbacks/project/:projectId',
    PENDING: '/feedbacks/project/:projectId/pending',
    RESOLVE: '/feedbacks/:feedbackId/resolve',
  },

  // Contracts/Signatures (aligned with web)
  CONTRACTS: {
    CREATE: '/signatures',
    STATUS: '/signatures/:projectId/status',
    VIEW: '/contracts/:projectId',
    GENERATE_PDF: '/contracts/test/generate-pdf',
    BY_PROJECT: '/contracts/project/:projectId',
    MY: '/contracts/my',
    BY_USER: '/contracts/user/:userId',
    TECHNICIAN_MY: '/contracts/technician/my',
    BY_TECHNICIAN: '/contracts/technician/:technicianId',
    BY_ID: '/contracts/:contractId',
  },
  SIGNATURES: {
    CREATE: '/signatures',
    GET_BY_PROJECT: '/signatures/project/:projectId',
    GET_STATUS: '/signatures/:id/status',
    UPDATE: '/signatures/:id',
    DELETE: '/signatures/:id',
  },

  // Change Requests (aligned with web)
  CHANGE_REQUESTS: {
    REQUEST: '/change-requests/project/:projectId/request',
    RESPOND: '/change-requests/:changeRequestId/respond',
    AGREE: '/change-requests/:changeRequestId/agree',
    REJECT: '/change-requests/:changeRequestId/reject',
    BY_PROJECT: '/change-requests/project/:projectId',
    THREAD: '/change-requests/:changeRequestId/thread',
    ACTIVE: '/change-requests/project/:projectId/active',
    PENDING: '/change-requests/project/:projectId/pending',
  },

  // Notifications
  NOTIFICATIONS: {
    MY_NOTIFICATIONS: '/notifications/my-notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/mark-all-read',
    DELETE: '/notifications/:id',
  },

  // Appointments (Time Requests)
  APPOINTMENTS: {
    MY_REQUESTS: '/time-requests/my-requests',
    FOR_ME: '/time-requests/for-me',
    MY_BOOKINGS: '/time-requests/my-bookings',
    UPCOMING: '/time-requests/upcoming-appointments',
    COMPLETED: '/time-requests/completed-appointments',
    ACCEPT: '/time-requests/:id/accept',
    REJECT: '/time-requests/:id/reject',
    COMPLETE: '/time-requests/appointments/:id/complete',
    DELETE: '/time-requests/:id',
    CREATE: '/time-requests',
  },

  // Technician Availability (Public)
  TECHNICIAN_AVAILABILITY: '/technicians/:id/availability',

  SUBSCRIPTIONS: {
    CATEGORIES: '/subscriptions/categories',
  },

  // Onboarding
  ONBOARDING: {
    STATUS: '/onboarding/:userId',
    COMPLETE: '/onboarding/:userId/complete',
  },

  // AI Features
  AI: {
    VOICE_TRANSCRIBE: '/ai/speech/transcribe',
    VOICE_TRANSCRIBE_AND_CHAT: '/ai/speech/transcribe-and-chat',
    VOICE_SPEECH: '/ai/voice/speech',
    COST_ESTIMATE: '/ai/cost/estimate',
    ROOM_DESIGN: '/ai/design/generate',
    CHAT: '/ai/chat',
    CHAT_SERVICES: '/ai/chat/services',
    CHAT_SUGGESTIONS: '/ai/chat/suggestions',
    CHAT_RECOMMENDATIONS: '/ai/chat/recommendations',
    MAP_SUMMARIZE: '/ai/map/summarize',
    MAP_PROJECTS: '/ai/map/projects',
  },

  // Chatbot & AI Support
  AI_SUPPORT: {
    CHAT: '/ai-support/chat',
    CHAT_HISTORY: '/ai-support/chat/history',
  },

  // Support Centre – same as web (SupportTicketService + supportChatService)
  SUPPORT: {
    TICKETS: '/support/tickets',
    TICKETS_CREATE_WITH_FILES: '/support/tickets/create-with-files',
    TICKET_BY_ID: '/support/tickets/:id',
    TICKET_MESSAGES: '/support/tickets/:id/messages',
    TICKET_RESOLVE: '/support/tickets/:id/resolve',
    REQUEST_TYPES: '/support/request-types',
    /** Public, no auth. GET /api/support/categories/hierarchy */
    CATEGORIES_HIERARCHY: '/support/categories/hierarchy',
    SEND_WITH_FILE: '/support/send-with-file',
    REQUESTS: '/support/requests',
    REQUEST_BY_ID: '/support/requests/:requestId',
    ACCEPT_REQUEST: '/support/requests/:requestId/accept',
    REQUEST: '/support/request',
    MY_REQUESTS: '/support/my-requests',
  },

  // Small Tasks – same paths and behavior as web (src/config/api.ts SMALL_TASKS)
  SMALL_TASKS: {
    TYPES: '/small-tasks/types',
    CREATE_REQUEST: '/small-tasks/requests',
    MY_REQUESTS: '/small-tasks/requests/my-requests',
    REQUEST_DETAILS: '/small-tasks/requests/:id',
    REQUEST_BIDS: '/small-tasks/requests/:id/bids',
    ACCEPT_BID: '/small-tasks/requests/:requestId/bids/:bidId/accept',
    CANCEL_REQUEST: '/small-tasks/requests/:id/cancel',
    PAY: '/small-tasks/requests/:id/pay',
    AVAILABLE_REQUESTS: '/small-tasks/requests/available',
    MY_BIDS: '/small-tasks/bids/my-bids',
    CREATE_BID: '/small-tasks/requests/:id/bids',
    WITHDRAW_BID: '/small-tasks/bids/:id/withdraw',
    UPDATE_STATUS: '/small-tasks/requests/:id/status',
    REJECT_BID: '/small-tasks/bids/:bidId/reject',
    SPECIALIZATIONS: '/small-tasks/technician/specializations',
    SPECIALIZATIONS_ACTIVE: '/small-tasks/technician/specializations/active',
    SUBSCRIBE_TO_TYPE: '/small-tasks/technician/specializations/:taskTypeId',
    UNSUBSCRIBE_FROM_TYPE: '/small-tasks/technician/specializations/:taskTypeId',
    BULK_SUBSCRIBE: '/small-tasks/technician/specializations/bulk-subscribe',
    UNSUBSCRIBE_ALL: '/small-tasks/technician/specializations/all',
  },

  // Technician Services
  TECHNICIAN_SERVICES: {
    MY_SERVICES: '/technician/services/my-services',
    ADD_SERVICE: '/technician/services/add/:serviceId',
    ADD_SERVICES: '/technician/services/add',
    REMOVE_SERVICE: '/technician/services/remove/:serviceId',
    OFFERING: '/technician/services/offering/:serviceId',
  },

  // Service Suggestions
  SERVICE_SUGGESTIONS: {
    CREATE: '/suggestions/services',
    MY_REQUESTS: '/suggestions/services/my-requests',
  },

  // Task Type Requests
  TASK_TYPE_REQUESTS: {
    CREATE: '/small-tasks/request-type',
    MY_REQUESTS: '/small-tasks/request-type/my-requests',
  },

  // Payments (aligned with web – phase payments use create-checkout + redirect)
  PAYMENTS: {
    MY_TRANSACTIONS: '/payments/my-transactions',
    TRANSACTION: '/payments/transactions/:id',
    TRANSACTION_DETAIL: '/payments/transactions/:id',
    REFUND_REQUEST: '/payments/transactions/:id/refund-request',
    MY_REFUND_REQUESTS: '/payments/my-refund-requests',
    CREATE_CHECKOUT: '/payments/create-checkout',
    PREPARE_CHECKOUT: '/payments/prepare-checkout',
    STATUS: '/payments/status/:checkoutId',
    STATUS_PROD: '/payments/prod/status/:checkoutId',
  },

  // Admin - Payments
  ADMIN: {
    PAYMENTS: {
      REFUND_REQUESTS: '/admin/payments/refund-requests',
      REFUND_REQUEST: '/admin/payments/refund-requests/:id',
      APPROVE_REFUND: '/admin/payments/refund-requests/:id/approve',
      REJECT_REFUND: '/admin/payments/refund-requests/:id/reject',
      PROCESS_REFUND: '/admin/payments/refund-requests/:id/process',
    },
  },
};

// Export getApiUrl for convenience
export const getApiUrl = (): string => {
  return API_BASE_URL;
};

// Helper function to get server base URL (without /api)
export const getServerBaseUrl = (): string => {
  return API_BASE_URL.replace('/api', '');
};

// Build full asset/image URL from relative path (same as web)
export const buildAssetUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${getServerBaseUrl()}${path}`;
};

// Helper function to build full URL (always absolute base – same as web)
export const buildApiUrl = (endpoint: string): string => {
  const base = API_BASE_URL && API_BASE_URL.startsWith('http') ? API_BASE_URL : DEFAULT_BASE_URL;
  return `${base}${endpoint}`;
};

// Helper function to build URL with parameters
export const buildApiUrlWithParams = (endpoint: string, params: Record<string, string | number>): string => {
  const base = API_BASE_URL && API_BASE_URL.startsWith('http') ? API_BASE_URL : DEFAULT_BASE_URL;
  let url = `${base}${endpoint}`;
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, String(value));
  });
  return url;
};

// Helper function to get default headers (includes ngrok header)
export const getDefaultHeaders = (additionalHeaders?: Record<string, string>): Record<string, string> => {
  const defaultHeaders: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
  };

  if (additionalHeaders) {
    return { ...defaultHeaders, ...additionalHeaders };
  }

  return defaultHeaders;
};

// Wrapper function for fetch that automatically includes ngrok header
export const apiFetch = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  const headers = getDefaultHeaders(options?.headers as Record<string, string> | undefined);

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
  });
};

// Override global fetch to automatically include ngrok header for all API requests
// This ensures ALL fetch calls in the app include the ngrok header
const originalFetch = global.fetch;
global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // Only add ngrok header if the URL is for our API
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const serverBaseUrl = getServerBaseUrl();
  const isApiRequest = url.includes(API_BASE_URL) || url.includes(serverBaseUrl);

  if (isApiRequest) {
    const headers = getDefaultHeaders(init?.headers as Record<string, string> | undefined);

    return originalFetch(input, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers || {}),
      },
    });
  }

  // For non-API requests, use original fetch
  return originalFetch(input, init);
};
