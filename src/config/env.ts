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
  let value = extra[key] ?? (typeof process !== 'undefined' && process.env?.[key]);
  if (key === 'chatbotApiUrl' && !value) {
    value = process.env.EXPO_PUBLIC_CHATBOT_API_URL;
  }
  if (key === 'chatbotApiChatPath' && !value) {
    value = process.env.EXPO_PUBLIC_CHATBOT_API_CHAT_PATH || process.env.CHATBOT_API_CHAT_PATH;
  }
  if (value && typeof value === 'string') return value;
  return defaultValue;
}

/** Bonyad RAG chatbot (Python FastAPI / Gradio). Emulator: host machine via 10.0.2.2:7860 */
const DEFAULT_CHATBOT_URL_ANDROID = 'http://10.0.2.2:7860';
const DEFAULT_CHATBOT_URL_OTHER = 'http://localhost:7860';

export const ENV = {
  API_BASE_URL: getEnvVar('apiBaseUrl', DEFAULT_API_BASE_URL),
  // MQTT Broker - same as web for chat (WebSocket)
  MQTT_BROKER_HOST: getEnvVar('mqttBrokerHost', '34.18.166.66'),
  MQTT_BROKER_PORT_WS: getEnvVar('mqttBrokerPortWs', '8083'),
  MQTT_BROKER_PATH: getEnvVar('mqttBrokerPath', '/mqtt'),
  MQTT_WEB_BROKER_URL: getEnvVar('mqttWebBrokerUrl', 'wss://admin.bonyad-hub.com/mqtt'),

  /**
   * Base URL only (no /api/chat). Set in app.json `extra.chatbotApiUrl` or EXPO_PUBLIC_CHATBOT_API_URL.
   * Physical device: use your PC LAN IP, e.g. http://192.168.1.20:7860
   */
  CHATBOT_API_URL: (() => {
    const fallback =
      Platform.OS === 'android' ? DEFAULT_CHATBOT_URL_ANDROID : DEFAULT_CHATBOT_URL_OTHER;
    let configured = getEnvVar('chatbotApiUrl', fallback).trim().replace(/\/$/, '');
    if (Platform.OS === 'android' && configured.includes('localhost')) {
      configured = configured.replace(/localhost/g, '10.0.2.2');
    }
    if (__DEV__) {
      console.log('🤖 [ENV] CHATBOT_API_URL base:', configured);
    }
    return configured;
  })(),
  /** Optional path if proxy uses something other than /api/chat (e.g. /chat) */
  CHATBOT_API_CHAT_PATH: getEnvVar('chatbotApiChatPath', ''),
} as const;

/**
 * MQTT broker URL for chat – same URI and connection as web.
 * Web and Android both use: wss://admin.bonyad-hub.com/mqtt
 */
export function getMQTTBrokerUrl(platform: 'web' | 'android' | 'ios'): string {
  // Same URI as web for all platforms (single broker over WSS)
  return ENV.MQTT_WEB_BROKER_URL || `wss://${ENV.MQTT_BROKER_HOST}:${ENV.MQTT_BROKER_PORT_WS}${ENV.MQTT_BROKER_PATH}`;
}
