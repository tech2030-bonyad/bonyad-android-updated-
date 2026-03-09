/**
 * Environment configuration (aligned with web).
 * Uses expo-constants extra when available; otherwise defaults.
 */

import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = 'https://bonyad-app-nyayeditqq-ww.a.run.app/api';

function getEnvVar(key: string, defaultValue: string): string {
  const extra = (Constants.expoConfig?.extra as Record<string, string> | undefined)
    ?? ((Constants.manifest as any)?.extra as Record<string, string> | undefined)
    ?? {};
  const value = extra[key] ?? (typeof process !== 'undefined' && process.env?.[key]);
  if (value && typeof value === 'string') return value;
  return defaultValue;
}

export const ENV = {
  API_BASE_URL: getEnvVar('apiBaseUrl', DEFAULT_API_BASE_URL),
} as const;
