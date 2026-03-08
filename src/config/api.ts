// API Configuration
// Production API endpoint

import { Platform } from 'react-native';

// Main Production API - Used for all APIs except Chatbot
export const API_BASE_URL = 'https://bonyad-app-nyayeditqq-ww.a.run.app/api';

// Chatbot API - Ngrok endpoint (only for AI chat)
export const CHATBOT_BASE_URL = 'https://glynda-unvexatious-felisa.ngrok-free.dev';

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
    CHANGE_PHONE_REQUEST: '/users/:userId/change-phone-request',
    CHANGE_PHONE_VERIFY: '/users/:userId/change-phone-verify',
    CHANGE_PASSWORD: '/users/:userId/change-password',
    USER_DETAILS: '/user-details',
    COMPLETE_PROFILE: '/users/complete-profile',
    TECHNICIAN_STATUS: '/users/technician-status',
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

  // Visit Requests
  VISIT_REQUESTS: {
    CREATE: '/visit-requests',
    LIST: '/visit-requests/project/:projectId',
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

  // Phases
  PHASES: {
    LIST: '/phases/project/:projectId',
    CREATE: '/phases',
    UPDATE: '/phases/:phaseId',
    DELETE: '/phases/:phaseId',
    APPROVE_ALL: '/phases/project/:projectId/approve-all',
    COMPLETE: '/phases/:phaseId/complete',
    PAY: '/phases/:phaseId/pay',
  },

  // Feedbacks
  FEEDBACKS: {
    CREATE: '/feedbacks',
    LIST: '/feedbacks/project/:projectId',
    PENDING: '/feedbacks/project/:projectId/pending',
    RESOLVE: '/feedbacks/:feedbackId/resolve',
  },

  // Contracts/Signatures
  CONTRACTS: {
    CREATE: '/signatures',
    STATUS: '/signatures/:projectId/status',
    VIEW: '/contracts/:projectId',
    GENERATE_PDF: '/contracts/test/generate-pdf',
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

  // Live Agent Support
  SUPPORT: {
    REQUESTS: '/support/requests',
    REQUEST_DETAILS: '/support/requests/:id',
    MY_REQUESTS: '/support/requests/my',
    CANCEL_REQUEST: '/support/requests/:id/cancel',
    CATEGORIES: '/api/support/categories',
  },

  // Small Tasks (see Small Tasks Implementation README)
  SMALL_TASKS: {
    TYPES: '/small-tasks/types',
    CREATE_REQUEST: '/small-tasks/requests',
    REQUESTS_AVAILABLE: '/small-tasks/requests/available',
    MY_REQUESTS: '/small-tasks/requests/my-requests',
    REQUEST_DETAILS: '/small-tasks/requests/:id',
    REQUEST_BID: '/small-tasks/requests/:id/bids',
    MY_BIDS: '/small-tasks/bids/my-bids',
    WITHDRAW_BID: '/small-tasks/bids/:id/withdraw',
    UPDATE_STATUS: '/small-tasks/requests/:id/status',
    PAY: '/small-tasks/requests/:requestId/pay',
    ACCEPT_BID: '/small-tasks/requests/:requestId/bids/:bidId/accept',
    REJECT_BID: '/small-tasks/bids/:bidId/reject',
    CANCEL: '/small-tasks/requests/:id/cancel',
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

  // Payments
  PAYMENTS: {
    MY_TRANSACTIONS: '/payments/my-transactions',
    TRANSACTION: '/payments/transactions/:id',
    REFUND_REQUEST: '/payments/transactions/:transactionId/refund-request',
    MY_REFUND_REQUESTS: '/payments/my-refund-requests',
    CREATE_CHECKOUT: '/payments/create-checkout',
    PREPARE_CHECKOUT: '/payments/prepare-checkout',
    STATUS: '/payments/status/:checkoutId',
    STATUS_PROD: '/payments/prod/status/:checkoutId', // Production small-task payment status per README
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

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to build URL with parameters
export const buildApiUrlWithParams = (endpoint: string, params: Record<string, string | number>): string => {
  let url = `${API_BASE_URL}${endpoint}`;

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
