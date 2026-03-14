// MQTT Chat Service - Real-time messaging via MQTT over WebSocket (same as web)
import { Platform } from 'react-native';
import { ChatMessage } from '../types/chat';
import { storage } from '../utils/storage';
import { getMQTTBrokerUrl } from '../config/env';

let mqtt: any = null;
let mqttLoadPromise: Promise<any> | null = null;
let mqttPermanentlyUnavailable = false;

/**
 * Resolve the mqtt object with a `connect` function from a raw module.
 * mqtt.js v5 can export differently depending on the bundler:
 *   - CJS:  module.exports = { connect, ... }
 *   - ESM-wrapped: { default: { connect, ... } }
 *   - Metro/RN: may wrap in { default: ... }
 */
function resolveMqttConnect(mod: any): any | null {
  if (!mod) return null;
  if (typeof mod.connect === 'function') return mod;
  if (mod.default && typeof mod.default.connect === 'function') return mod.default;
  if (mod.default && typeof mod.default === 'function') return { connect: mod.default };
  return null;
}

const loadMqtt = async (): Promise<any> => {
  if (mqtt) return mqtt;
  if (mqttPermanentlyUnavailable) return null;
  if (mqttLoadPromise) return mqttLoadPromise;

  mqttLoadPromise = (async () => {
    try {
      let mqttModule: any;

      if (Platform.OS === 'web') {
        try {
          mqttModule = await import('mqtt');
        } catch {
          try {
            // @ts-ignore
            mqttModule = await import('mqtt/dist/mqtt');
          } catch (e2: any) {
            throw e2;
          }
        }
      } else {
        mqttModule = require('mqtt');
      }

      const resolved = resolveMqttConnect(mqttModule);
      if (resolved) {
        mqtt = resolved;
        console.log(`✅ [MQTT] Library loaded (${Platform.OS})`);
        return mqtt;
      }

      throw new Error('mqtt.connect not found in module exports');
    } catch (e: any) {
      console.warn(`⚠️ [MQTT] Library unavailable (${Platform.OS}):`, e?.message || e);
      mqtt = null;
      mqttLoadPromise = null;
      mqttPermanentlyUnavailable = true;
      return null;
    }
  })();

  return mqttLoadPromise;
};

// Eagerly load on native (non-blocking on failure)
if (Platform.OS !== 'web') {
  try {
    const mod = require('mqtt');
    const resolved = resolveMqttConnect(mod);
    if (resolved) {
      mqtt = resolved;
      console.log('✅ [MQTT] Library pre-loaded (native)');
    }
  } catch {
    // will attempt async load later
  }
}

interface MessageCallback {
  (message: ChatMessage): void | Promise<void>;
}

interface ReadReceiptCallback {
  (messageId: number, isRead: boolean): void;
}

class MqttChatService {
  private client: any = null;
  private userId: number | null = null;
  private token: string | null = null;
  private messageCallbacks: Map<string, MessageCallback> = new Map();
  private readReceiptCallbacks: Map<string, ReadReceiptCallback> = new Map();
  private typingCallbacks: Map<string, (data: any) => void> = new Map();
  private isConnected: boolean = false;
  private currentRoomId: string | null = null;

  // MQTT Configuration - Same as web: WebSocket for all platforms
  private readonly KEEP_ALIVE = 60;
  private readonly QOS_LEVEL = 1;

  private getBrokerUrl(): string {
    if (Platform.OS === 'web') {
      return getMQTTBrokerUrl('web');
    }
    return getMQTTBrokerUrl('android');
  }

  /**
   * Connect to MQTT broker
   */
  async connect(roomId: string): Promise<boolean> {
    if (!mqtt) {
      const loaded = await loadMqtt();
      if (!loaded || !mqtt) {
        return false;
      }
    }

    if (this.isConnected && this.currentRoomId === roomId) {
      console.log('✅ MQTT already connected to this room');
      return true;
    }

    try {
      // Get user ID and token
      this.userId = await storage.getUserId();
      this.token = await storage.getAuthToken();

      if (!this.userId || !this.token) {
        console.error('❌ No user ID or token found');
        return false;
      }

      this.currentRoomId = roomId;

      // MQTT Options - Matching the provided example
      const clientID = `react-native-${this.userId}-${Date.now()}`;
      const options: any = {
        username: this.token, // JWT token as username
        reconnectPeriod: 2000, // Auto reconnect after 2 seconds
        keepalive: this.KEEP_ALIVE, // KeepAlive: 60
        clean: true, // Clean session
        connectTimeout: 30000,
        clientId: clientID, // Client ID
      };
      
      // Get connection URL – same URI as web (wss://admin.bonyad-hub.com/mqtt)
      const connectionUrl = this.getBrokerUrl();
      
      // Same connection options as web: WSS + SSL verification
      options.protocol = 'wss';
      options.rejectUnauthorized = true;
      
      console.log(`🔌 [MQTT] Connecting to ${connectionUrl} (${Platform.OS})`);
      
      // Check if mqtt.connect exists
      if (!mqtt || typeof mqtt.connect !== 'function') {
        console.error('❌ [MQTT] mqtt.connect is not a function. mqtt object:', mqtt);
        console.error('❌ [MQTT] Available methods:', mqtt ? Object.keys(mqtt) : 'mqtt is null');
        throw new Error('MQTT library not properly loaded');
      }
      
      // Connect to MQTT broker
      // mqtt.js will handle the URL format (with or without trailing slash)
      this.client = mqtt.connect(connectionUrl, options);

      return new Promise((resolve) => {
        // Set up message handler before connecting
        this.client.on('message', (topic: string, message: Buffer) => {
          console.log('📨 [MQTT] Raw message received on topic:', topic);
          this.handleIncomingMessage(topic, message.toString());
        });

        this.client.on('connect', () => {
          console.log('✅ [MQTT] Connected successfully');
          this.isConnected = true;
          this.subscribeToUserTopics(this.userId!);
          // Subscribe to room - callbacks should already be set by subscribeToRoomWithCallbacks
          this.subscribeToRoom(roomId);
          resolve(true);
        });

        this.client.on('error', (error: any) => {
          console.error('❌ [MQTT] Connection error:', error);
          this.isConnected = false;
          resolve(false);
        });

        this.client.on('reconnect', () => {
          console.log('🔄 [MQTT] Reconnecting...');
        });

        this.client.on('close', () => {
          console.log('🔌 [MQTT] Connection closed');
          this.isConnected = false;
        });

        this.client.on('offline', () => {
          console.log('📴 [MQTT] Client offline');
          this.isConnected = false;
        });
      });
    } catch (error: any) {
      console.warn('⚠️ [MQTT] Connection failed:', error?.message || error);
      return false;
    }
  }

  /**
   * Subscribe to user-specific topics
   */
  private subscribeToUserTopics(userId: number) {
    if (!this.client?.connected) return;

    const userTopic = `chat/user/${userId}`;
    this.client.subscribe(userTopic, { qos: this.QOS_LEVEL }, (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to subscribe to ${userTopic}:`, err);
      } else {
        console.log(`✅ [MQTT] Subscribed to ${userTopic}`);
      }
    });
  }

  /**
   * Subscribe to room-specific topics
   */
  subscribeToRoom(roomId: string, callbacks?: {
    onMessage?: MessageCallback;
    onReadReceipt?: ReadReceiptCallback;
    onTyping?: (data: any) => void;
  }) {
    if (!this.client?.connected) {
      console.warn('⚠️ [MQTT] Client not connected. Cannot subscribe to room.');
      return;
    }

    const roomTopic = `chat/room/${roomId}`;
    const readTopic = `chat/room/${roomId}/read`;
    const typingTopic = `chat/room/${roomId}/typing`;

    // Subscribe to room messages
    this.client.subscribe(roomTopic, { qos: this.QOS_LEVEL }, (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to subscribe to ${roomTopic}:`, err);
      } else {
        console.log(`✅ [MQTT] Subscribed to ${roomTopic}`);
        // Set callback if provided, otherwise use existing callback if any
        if (callbacks?.onMessage) {
          this.messageCallbacks.set(roomTopic, callbacks.onMessage);
          console.log(`✅ [MQTT] Callback set for ${roomTopic}`);
        } else if (!this.messageCallbacks.has(roomTopic)) {
          console.warn(`⚠️ [MQTT] No callback set for ${roomTopic} - messages may not be handled`);
        }
      }
    });

    // Subscribe to read receipts
    this.client.subscribe(readTopic, { qos: this.QOS_LEVEL }, (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to subscribe to ${readTopic}:`, err);
      } else {
        console.log(`✅ [MQTT] Subscribed to ${readTopic}`);
        if (callbacks?.onReadReceipt) {
          this.readReceiptCallbacks.set(readTopic, callbacks.onReadReceipt);
          console.log(`✅ [MQTT] Callback set for ${readTopic}`);
        }
      }
    });

    // Subscribe to typing indicators
    this.client.subscribe(typingTopic, { qos: 0 }, (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to subscribe to ${typingTopic}:`, err);
      } else {
        console.log(`✅ [MQTT] Subscribed to ${typingTopic}`);
        if (callbacks?.onTyping) {
          this.typingCallbacks.set(typingTopic, callbacks.onTyping);
          console.log(`✅ [MQTT] Callback set for ${typingTopic}`);
        }
      }
    });
  }

  /**
   * Subscribe to room with callbacks (convenience method)
   */
  async subscribeToRoomWithCallbacks(roomId: string, callbacks: {
    onMessage?: MessageCallback;
    onReadReceipt?: ReadReceiptCallback;
    onTyping?: (data: any) => void;
  }): Promise<boolean> {
    // Set callbacks FIRST before connecting/subscribing
    // This ensures callbacks are available when messages arrive
    const roomTopic = `chat/room/${roomId}`;
    const readTopic = `chat/room/${roomId}/read`;
    const typingTopic = `chat/room/${roomId}/typing`;

    if (callbacks.onMessage) {
      this.messageCallbacks.set(roomTopic, callbacks.onMessage);
      console.log(`✅ [MQTT] Callback set for ${roomTopic}`);
    }
    if (callbacks.onReadReceipt) {
      this.readReceiptCallbacks.set(readTopic, callbacks.onReadReceipt);
      console.log(`✅ [MQTT] Callback set for ${readTopic}`);
    }
    if (callbacks.onTyping) {
      this.typingCallbacks.set(typingTopic, callbacks.onTyping);
      console.log(`✅ [MQTT] Callback set for ${typingTopic}`);
    }

    if (!this.isConnected || this.currentRoomId !== roomId) {
      this.currentRoomId = roomId;
      const connected = await this.connect(roomId);
      if (!connected) {
        console.warn('⚠️ [MQTT] Not connected - chat will use polling');
        return false;
      }
    } else {
      // Already connected to this room, just ensure subscription
      console.log('✅ [MQTT] Already connected, ensuring subscription');
      this.subscribeToRoom(roomId, callbacks);
    }

    return true;
  }

  /**
   * Unsubscribe from room topics
   */
  unsubscribeFromRoom(roomId: string) {
    if (!this.client?.connected) return;

    const roomTopic = `chat/room/${roomId}`;
    const readTopic = `chat/room/${roomId}/read`;
    const typingTopic = `chat/room/${roomId}/typing`;

    this.client.unsubscribe([roomTopic, readTopic, typingTopic], (err: any) => {
      if (err) {
        console.error(`❌ [MQTT] Failed to unsubscribe from room ${roomId}:`, err);
      } else {
        console.log(`✅ [MQTT] Unsubscribed from room ${roomId}`);
        this.messageCallbacks.delete(roomTopic);
        this.readReceiptCallbacks.delete(readTopic);
        this.typingCallbacks.delete(typingTopic);
      }
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private handleIncomingMessage(topic: string, payload: string) {
    try {
      console.log('📨 [MQTT] Handling message on topic:', topic);
      const data = JSON.parse(payload);
      console.log('📨 [MQTT] Parsed data:', data);

      // Check if it's a message
      if (topic.startsWith('chat/user/') || topic.startsWith('chat/room/')) {
        if (topic.includes('/read')) {
          // Read receipt
          const callback = this.readReceiptCallbacks.get(topic);
          console.log('✓✓ [MQTT] Read receipt callback:', callback ? 'found' : 'not found');
          if (callback) {
            callback(data.messageId, data.isRead);
          }
        } else if (topic.includes('/typing')) {
          // Typing indicator
          const callback = this.typingCallbacks.get(topic);
          if (callback) {
            callback(data);
          }
        } else {
          // Chat message
          const callback = this.messageCallbacks.get(topic);
          console.log('📨 [MQTT] Message callback for', topic, ':', callback ? 'found' : 'NOT FOUND');
          console.log('📨 [MQTT] Available callbacks:', Array.from(this.messageCallbacks.keys()));
          if (callback) {
            callback(data as ChatMessage);
          } else {
            console.warn('⚠️ [MQTT] No callback registered for topic:', topic);
          }
        }
      }
    } catch (error) {
      console.error('❌ [MQTT] Failed to parse message:', error);
      console.error('❌ [MQTT] Payload:', payload);
    }
  }

  /**
   * Publish typing indicator
   */
  publishTyping(roomId: string, userId: number, userName: string, isTyping: boolean) {
    if (!this.client?.connected) return;

    const topic = `chat/room/${roomId}/typing`;
    const payload = JSON.stringify({
      userId,
      userName,
      isTyping,
    });

    this.client.publish(topic, payload, { qos: 0 }, (err: any) => {
      if (err) {
        console.error('❌ [MQTT] Failed to publish typing indicator:', err);
      }
    });
  }

  /**
   * Set callbacks for room messages
   */
  setCallbacks(callbacks: {
    onMessage?: MessageCallback;
    onReadReceipt?: ReadReceiptCallback;
    onTyping?: (data: any) => void;
  }) {
    if (callbacks.onMessage) {
      // Store callback for current room
      if (this.currentRoomId) {
        const roomTopic = `chat/room/${this.currentRoomId}`;
        this.messageCallbacks.set(roomTopic, callbacks.onMessage);
      }
    }
    if (callbacks.onReadReceipt) {
      if (this.currentRoomId) {
        const readTopic = `chat/room/${this.currentRoomId}/read`;
        this.readReceiptCallbacks.set(readTopic, callbacks.onReadReceipt);
      }
    }
    if (callbacks.onTyping) {
      if (this.currentRoomId) {
        const typingTopic = `chat/room/${this.currentRoomId}/typing`;
        this.typingCallbacks.set(typingTopic, callbacks.onTyping);
      }
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect() {
    if (this.client?.connected) {
      this.client.end();
      console.log('🔌 [MQTT] Disconnected');
    }
    this.client = null;
    this.isConnected = false;
    this.currentRoomId = null;
    this.messageCallbacks.clear();
    this.readReceiptCallbacks.clear();
    this.typingCallbacks.clear();
  }

  /**
   * Check if connected
   */
  isCurrentlyConnected(): boolean {
    return this.isConnected && this.client?.connected;
  }
}

export default new MqttChatService();

