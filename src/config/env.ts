/**
 * Environment configuration (aligned with web).
 * Uses expo-constants extra when available; otherwise defaults.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
  // MQTT Broker - same as web for chat (WebSocket)
  MQTT_BROKER_HOST: getEnvVar('mqttBrokerHost', '34.18.166.66'),
  MQTT_BROKER_PORT_WS: getEnvVar('mqttBrokerPortWs', '8083'),
  MQTT_BROKER_PATH: getEnvVar('mqttBrokerPath', '/mqtt'),
  MQTT_WEB_BROKER_URL: getEnvVar('mqttWebBrokerUrl', 'wss://admin.bonyad-hub.com/mqtt'),
} as const;

/**
 * MQTT broker URL for chat – same URI and connection as web.
 * Web and Android both use: wss://admin.bonyad-hub.com/mqtt
 */
export function getMQTTBrokerUrl(platform: 'web' | 'android' | 'ios'): string {
  // Same URI as web for all platforms (single broker over WSS)
  return ENV.MQTT_WEB_BROKER_URL || `wss://${ENV.MQTT_BROKER_HOST}:${ENV.MQTT_BROKER_PORT_WS}${ENV.MQTT_BROKER_PATH}`;
}
