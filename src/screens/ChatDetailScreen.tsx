import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrlWithParams, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { ChatMessage } from '../types/chat';
import { formatMessageTime } from '../utils/chatUtils';
import MqttChatService from '../services/MqttChatService';
import MessageBubble from '../components/MessageBubble';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VoiceNoteService from '../services/VoiceNoteService';
import * as FileSystem from 'expo-file-system';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';
import { getGlassTabBarOverlayHeight } from '../components/GlassTabBar';

const ATTACHMENT_PLACEHOLDER = '[Attachment]';

/** RN multipart: iOS often expects path without `file://`; Android keeps full URI (incl. file://). */
function normalizeMultipartFileUri(uri: string): string {
  if (Platform.OS === 'ios' && uri.startsWith('file://')) {
    return uri.replace(/^file:\/\//, '');
  }
  return uri;
}
const getDraftStorageKey = (roomId: string, receiverId: number) =>
  `@bonyad_chat_draft_${roomId}_${receiverId}`;

/** Figma node 61:2158 — CONVERSATION VIEW (screen body only; shell nav is outside) */
const FIGMA = {
  screenBg: '#EEF0F5',
  white: '#FFFFFF',
  border: '#E8EAF0',
  azure18: '#1A2744',
  muted: '#8892A4',
  green: '#22C55E',
  iconBg: '#F0F2F7',
  inputBg: '#F5F6FA',
} as const;

const HEADER_AVATAR_GRADIENT: [string, string] = ['#64748B', '#475569'];

function calendarDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Stable ordering + one row per id (fixes duplicate keys when API/MQTT overlap). */
function dedupeChatMessages(messages: ChatMessage[]): ChatMessage[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const seen = new Set<number>();
  const out: ChatMessage[] = [];
  for (const m of sorted) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

function datePillLabel(iso: string, t: (k: string) => string): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diffDays === 0) return t('Today');
  if (diffDays === 1) return t('Yesterday');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

type ChatListRow =
  | { type: 'date'; id: string; label: string }
  | { type: 'msg'; msg: ChatMessage };

interface ChatDetailScreenProps {
  roomId: string;
  receiverId: number;
  receiverName: string;
  onBack?: () => void;
  projectId?: number | null;
  /** Technician layout: chat stacks above `GlassTabBar` in App.tsx — extra bottom inset clears the pill. */
  hasBottomTabBar?: boolean;
}

export default function ChatDetailScreen({
  roomId,
  receiverId,
  receiverName,
  projectId,
  onBack,
  hasBottomTabBar = false,
}: ChatDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily } = useFontFamily();
  const headerDirectionStyle = { direction: 'ltr' as const };
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);
  const draftLoadedRef = useRef(false);

  const loadDraft = useCallback(async () => {
    const key = getDraftStorageKey(roomId, receiverId);
    try {
      const draft = await AsyncStorage.getItem(key);
      draftLoadedRef.current = true;
      if (draft && draft.length > 0) {
        setMessage(draft);
      }
    } catch (error) {
      draftLoadedRef.current = true;
      console.error('❌ Error loading chat draft:', error);
    }
  }, [roomId, receiverId]);

  // Responsive state - updates on window resize
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  // Update screen width on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Calculate responsive breakpoints
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  // On large web screens, don't show back button when embedded in tabs
  const shouldShowBackButton = !!onBack && !IS_LARGE_WEB;

  const tabBarChrome = hasBottomTabBar && !IS_LARGE_WEB;
  const bottomLayout = useMemo(() => {
    if (IS_LARGE_WEB) {
      return { kavPad: 0, listPad: 0, inputPad: 0, loadingPad: 0 };
    }
    const inset = Math.max(insets.bottom, 0);
    if (tabBarChrome) {
      // `GlassTabBar` is `position: absolute` at the bottom of the home shell — it overlays content.
      // Reserve the same vertical space so the composer sits above the pill + safe area.
      const overlay = getGlassTabBarOverlayHeight(inset);
      return {
        kavPad: overlay,
        listPad: 12,
        inputPad: 10,
        loadingPad: overlay,
      };
    }
    return {
      kavPad: 0,
      listPad: Math.max(inset + 8, 16),
      inputPad: Math.max(inset, 12),
      loadingPad: Math.max(inset + 16, 32),
    };
  }, [IS_LARGE_WEB, tabBarChrome, insets.bottom]);

  const messagesDeduped = useMemo(() => dedupeChatMessages(messages), [messages]);

  const listRows: ChatListRow[] = useMemo(() => {
    const rows: ChatListRow[] = [];
    let lastKey: string | null = null;
    messagesDeduped.forEach((m) => {
      const k = calendarDayKey(m.createdAt);
      if (k !== lastKey) {
        lastKey = k;
        rows.push({ type: 'date', id: `d-${k}`, label: datePillLabel(m.createdAt, t) });
      }
      rows.push({ type: 'msg', msg: m });
    });
    return rows;
  }, [messagesDeduped, t]);

  useEffect(() => {
    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && webFileInputRef.current) {
        if (webFileInputRef.current.parentNode) {
          webFileInputRef.current.parentNode.removeChild(webFileInputRef.current);
        }
        webFileInputRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    draftLoadedRef.current = false;
    setMessage('');
    loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoadedRef.current) {
      return;
    }

    const key = getDraftStorageKey(roomId, receiverId);

    const saveDraft = async () => {
      try {
        if (message && message.length > 0) {
          await AsyncStorage.setItem(key, message);
        } else {
          await AsyncStorage.removeItem(key);
        }
      } catch (error) {
        console.error('❌ Error saving chat draft:', error);
      }
    };

    saveDraft();
  }, [message, roomId, receiverId]);

  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      setMessages([]);
      await loadMessages(false).catch((error) => {
        console.error('❌ Failed to load messages:', error);
        setIsLoading(false);
      });
      // Setup MQTT for real-time messages (same as web) - non-blocking
      setupMqtt().catch((err) => {
        console.warn('⚠️ [MQTT] Setup failed (non-critical), using polling:', err?.message || err);
      });
      // Poll for new messages every 5s as fallback (same as web)
      pollInterval = setInterval(() => {
        loadMessages(true).catch((e) => console.error('❌ Poll load messages:', e));
      }, 5000);
    };

    init();
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      try {
        MqttChatService.disconnect();
      } catch (e) {
        console.warn('⚠️ [MQTT] Disconnect error:', e);
      }
    };
  }, [roomId, receiverId]);

  const setupMqtt = async () => {
    try {
      const connected = await MqttChatService.subscribeToRoomWithCallbacks(roomId, {
        onMessage: async (newMessage: ChatMessage) => {
          try {
            const currentUserId = await storage.getUserId();
            const isMine = newMessage.senderId === currentUserId;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, { ...newMessage, isMine }];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            if (!isMine) {
              markMessageAsRead(newMessage.id).catch(() => {});
            }
          } catch (e) {
            console.error('❌ [MQTT] Handle message error:', e);
          }
        },
        onReadReceipt: (messageId: number, isRead: boolean) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === messageId ? { ...msg, isRead } : msg))
          );
        },
      });
      if (!connected) {
        console.warn('⚠️ [MQTT] Not connected - chat will use polling');
      }
    } catch (e: any) {
      console.warn('⚠️ [MQTT] Setup failed:', e?.message || e);
    }
  };

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        Alert.alert(t('Error'), t('Please login to view messages'));
        setIsLoading(false);
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.CHAT.MESSAGES, {
        roomId,
      }) + '?limit=100';

      if (!silent) console.log('🔍 Fetching messages from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!silent) console.log('📥 Messages API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const currentUserId = await storage.getUserId();

        // Filter messages to ensure only messages from this room between sender and receiver (same as web)
        const filteredMessages = (Array.isArray(data) ? data : []).filter((msg: ChatMessage) => {
          if (msg.roomId && msg.roomId !== roomId) return false;
          const isValid =
            (msg.senderId === currentUserId && msg.receiverId === receiverId) ||
            (msg.senderId === receiverId && msg.receiverId === currentUserId);
          return isValid;
        });

        // Add isMine and normalize content (API may send body/message/text) — same as web
        const messagesWithOwnership = filteredMessages.map((msg: ChatMessage) => {
          const content = msg.content ?? (msg as any).body ?? (msg as any).message ?? (msg as any).text ?? '';
          return {
            ...msg,
            content: typeof content === 'string' ? content : String(content || ''),
            isMine: msg.senderId === currentUserId,
          };
        });

        setMessages(dedupeChatMessages(messagesWithOwnership));
        if (!silent) console.log('✅ Loaded messages:', messagesWithOwnership.length);

        if (!silent) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 300);
        }

        markAllMessagesAsRead().catch((err) => {
          console.error('❌ Failed to mark messages as read:', err);
        });
      } else if (response.status === 400) {
        // Room doesn't exist yet — treat as a fresh conversation (0 messages).
        // The server creates the room automatically when the first message is sent.
        const body = await response.text();
        if (body.includes('not found') || body.includes('Chat room')) {
          setMessages([]);
          if (!silent) console.log('💬 New conversation — no messages yet');
        } else if (!silent) {
          console.error('❌ Failed to load messages - Status:', response.status, body);
          Alert.alert(t('Error'), t('Failed to load messages'));
        }
      } else {
        if (!silent) {
          const errorText = await response.text();
          console.error('❌ Failed to load messages - Status:', response.status, errorText);
          Alert.alert(t('Error'), t('Failed to load messages'));
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading messages:', error);
      if (!silent) Alert.alert(t('Error'), error?.message || t('Failed to load messages'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const messageText = message;
    setMessage('');
    setIsSending(true);

    let optimisticMessage: ChatMessage;
    try {
      const currentUserId = await storage.getUserId();
      if (!currentUserId) throw new Error('No user ID found');
      optimisticMessage = {
        id: -Math.abs(Date.now()),
        roomId,
        senderId: currentUserId,
        receiverId: receiverId,
        content: messageText,
        messageType: 'text',
        createdAt: new Date().toISOString(),
        isRead: false,
        isMine: true,
      };
      LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessage(messageText);
      setIsSending(false);
      return;
    }

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = buildApiUrl(API_ENDPOINTS.CHAT.SEND);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          receiverId: receiverId,
          content: messageText,
          projectId: projectId ?? undefined,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        LayoutAnimation.configureNext(LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
        setMessages((prev) =>
          dedupeChatMessages(
            prev.map((msg) =>
              msg.id === optimisticMessage.id ? { ...newMessage, isMine: true } : msg
            )
          )
        );
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      Alert.alert(t('Error'), error.message || t('Failed to send message'));
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      setMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const markMessageAsRead = async (messageId: number) => {
    try {
      const token = await storage.getAuthToken();
      if (!token) return;

      const url = buildApiUrlWithParams(API_ENDPOINTS.CHAT.MARK_READ, {
        messageId,
      });

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Message marked as read:', messageId);
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
    }
  };

  const markAllMessagesAsRead = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) return;

      const url = buildApiUrlWithParams(API_ENDPOINTS.CHAT.MARK_ALL_READ, {
        roomId,
      });

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ All messages marked as read');
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
    }
  };

  const uploadAttachment = async (payload: { file?: File; uri?: string; name: string; type: string; duration?: number }) => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        throw new Error(i18n.language === 'en' ? 'You must be logged in to send attachments' : 'يجب تسجيل الدخول لإرسال المرفقات');
      }

      setIsUploadingAttachment(true);
      const formData = new FormData();

      const trimmedMessage = message.trim();
      const contentToSend = trimmedMessage.length > 0 ? trimmedMessage : ATTACHMENT_PLACEHOLDER;
      formData.append('receiverId', String(receiverId));
      formData.append('content', contentToSend);
      if (projectId) {
        formData.append('projectId', String(projectId));
      }
      // Add duration for voice notes if available
      if (payload.duration !== undefined && payload.duration !== null) {
        formData.append('duration', String(payload.duration));
      }

      console.log('📤 [ChatDetailScreen] Uploading attachment', {
        roomId,
        receiverId,
        hasCaption: Boolean(trimmedMessage),
        projectId: projectId ?? null,
        name: payload.name,
        type: payload.type,
        isVoiceNote: payload.type === 'audio/m4a',
        duration: payload.duration,
      });

      if (payload.file) {
        formData.append('file', payload.file, payload.name);
      } else if (payload.uri) {
        const uriForUpload = normalizeMultipartFileUri(payload.uri);
        const fileName = payload.name || `attachment-${Date.now()}`;

        // Voice / file: ensure file is readable and non-empty (common VN failure mode on native).
        if (payload.type === 'audio/m4a' && Platform.OS !== 'web') {
          const statUri =
            uriForUpload.startsWith('file://') || uriForUpload.startsWith('content://')
              ? uriForUpload
              : `file://${uriForUpload}`;
          try {
            const info = await FileSystem.getInfoAsync(statUri);
            if (!info.exists) {
              throw new Error(
                i18n.language === 'en' ? 'Recording file was not found' : 'لم يُعثر على ملف التسجيل'
              );
            }
            const size = (info as { size?: number }).size ?? 0;
            if (size === 0) {
              throw new Error(
                i18n.language === 'en'
                  ? 'Recording is empty — hold to record a bit longer'
                  : 'التسجيل فارغ — أبقِ الضغط لمدة أطول'
              );
            }
          } catch (e: any) {
            const msg = String(e?.message ?? e ?? '');
            const isOurValidation =
              msg.includes('Recording file') ||
              msg.includes('Recording is empty') ||
              msg.includes('لم يُعثر') ||
              msg.includes('فارغ');
            if (isOurValidation) {
              throw e;
            }
            console.warn('⚠️ [ChatDetailScreen] Could not stat voice file before upload:', e);
          }
          // Let native FS flush the file before multipart read (OkHttp).
          await new Promise<void>((r) => setTimeout(r, 200));
        }

        const filePart: {
          uri: string;
          type: string;
          name: string;
          filename?: string;
        } = {
          uri: uriForUpload,
          type: payload.type || 'application/octet-stream',
          name: fileName,
        };
        if (Platform.OS === 'android') {
          filePart.filename = fileName;
        }
        formData.append('file', filePart as any);
      } else {
        throw new Error('Invalid attachment payload');
      }

      const response = await fetch(buildApiUrl(API_ENDPOINTS.CHAT.SEND_WITH_FILE), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('📥 [ChatDetailScreen] Attachment upload status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ChatDetailScreen] Attachment upload failed response:', errorText);
        throw new Error(errorText || 'Failed to send attachment');
      }

      // Reload messages so the new attachment appears (REST-only, no MQTT)
      if (payload.type === 'audio/m4a' && payload.duration) {
        setTimeout(() => loadMessages(true).catch(console.error), 500);
      } else {
        loadMessages(true).catch(console.error);
      }

      if (trimmedMessage) {
        setMessage('');
      }
    } catch (error: any) {
      console.error('❌ Attachment upload failed:', error);
      Alert.alert(
        t('Error'),
        error?.message || (i18n.language === 'en' ? 'Failed to upload attachment' : 'فشل رفع المرفق')
      );
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleAttachmentPress = async () => {
    if (isUploadingAttachment || isRecording) {
      return;
    }

    try {
      if (Platform.OS === 'web') {
        if (typeof document === 'undefined') {
          return;
        }
        if (!webFileInputRef.current) {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '*/*';
          input.style.display = 'none';
          input.onchange = async (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
              await uploadAttachment({
                file,
                name: file.name || `attachment-${Date.now()}`,
                type: file.type || 'application/octet-stream',
              });
            }
            target.value = '';
          };
          document.body.appendChild(input);
          webFileInputRef.current = input;
        }

        webFileInputRef.current.click();
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      // Expo DocumentPicker v11 returns {assets, canceled}
      const asset = (result as any)?.assets?.[0];

      if ((result as any)?.canceled || (result as any)?.type === 'cancel') {
        return;
      }

      const uri = asset?.uri ?? (result as any)?.uri;
      const name = asset?.name ?? (result as any)?.name ?? `attachment-${Date.now()}`;
      const mimeType = asset?.mimeType ?? (result as any)?.mimeType ?? 'application/octet-stream';

      if (!uri) {
        throw new Error(i18n.language === 'en' ? 'Unable to access selected file' : 'تعذر الوصول إلى الملف المحدد');
      }

      await uploadAttachment({
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name,
        type: mimeType,
      });
    } catch (error) {
      if ((error as any)?.code === 'DOCUMENT_PICKER_CANCELED') {
        return;
      }
      console.error('❌ Attachment picker error:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to choose attachment' : 'فشل اختيار المرفق'
      );
    }
  };

  const handleStartRecording = async () => {
    if (isRecording || isUploadingAttachment) {
      return;
    }

    try {
      setRecordingDuration(0);
      const started = await VoiceNoteService.startRecording((duration) => {
        setRecordingDuration(duration);
      });

      if (started) {
        setIsRecording(true);
      }
    } catch (error: any) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to start recording' : 'فشل بدء التسجيل'
      );
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) {
      return;
    }

    try {
      const result = await VoiceNoteService.stopRecording();
      setIsRecording(false);
      setRecordingDuration(0);

      if (!result) {
        Alert.alert(
          t('Error'),
          i18n.language === 'en' ? 'Failed to stop recording' : 'فشل إيقاف التسجيل'
        );
        return;
      }

      // Send the voice note - ALWAYS as m4a format
      const fileName = `voice_${Date.now()}.m4a`;
      const mimeType = 'audio/m4a'; // Always use m4a mimeType

      if (Platform.OS === 'web') {
        // Web: Convert blob URL to File with m4a format
        try {
          const response = await fetch(result.uri);
          if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.status}`);
          }
          
          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('Blob is empty');
          }

          const file = new File([blob], fileName, {
            type: mimeType, // Always audio/m4a
          });

          console.log('📤 [ChatDetailScreen] Sending voice note as m4a:', {
            fileName,
            mimeType,
            blobSize: blob.size,
            fileSize: file.size,
            duration: result.duration
          });

          await uploadAttachment({
            file,
            name: fileName,
            type: mimeType,
            duration: result.duration,
          });
        } catch (error: any) {
          console.error('❌ [ChatDetailScreen] Error preparing voice note file:', error);
          throw error;
        }
      } else {
        // Native: Use URI directly with m4a format
        console.log('📤 [ChatDetailScreen] Sending voice note as m4a:', {
          fileName,
          mimeType,
          uri: result.uri,
          duration: result.duration
        });

        await uploadAttachment({
          uri: result.uri,
          name: fileName,
          type: mimeType,
          duration: result.duration,
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to stop recording:', error);
      setIsRecording(false);
      setRecordingDuration(0);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to send voice note' : 'فشل إرسال الرسالة الصوتية'
      );
    }
  };

  const handleCancelRecording = async () => {
    if (!isRecording) {
      return;
    }

    try {
      await VoiceNoteService.cancelRecording();
      setIsRecording(false);
      setRecordingDuration(0);
    } catch (error: any) {
      console.error('❌ Failed to cancel recording:', error);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const renderListItem = useCallback(
    ({ item }: { item: ChatListRow }) => {
      if (item.type === 'date') {
        return (
          <View style={styles.datePillWrap}>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{item.label}</Text>
            </View>
          </View>
        );
      }
      return (
        <MessageBubble
          message={item.msg}
          isMine={item.msg.isMine || false}
          variant="bonyad"
          peerInitial={receiverName.charAt(0) || '?'}
        />
      );
    },
    [receiverName]
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: FIGMA.screenBg }]}>
        <AnimatedLoadingScreen message={t('Loading messages...')} />
      </View>
    );
  }

  const peerInitial = (receiverName || '?').charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor: FIGMA.screenBg,
          paddingBottom: bottomLayout.kavPad,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.chatScreenInner}>
      {/* Figma chat header — not the app shell top nav */}
      <View style={[styles.chatHeader, { borderBottomColor: FIGMA.border }, headerDirectionStyle]}>
        {shouldShowBackButton ? (
          <TouchableOpacity
            onPress={onBack}
            accessibilityRole="button"
            style={styles.headerIconBox}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={FIGMA.azure18} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIconBox} />
        )}
        <LinearGradient
          colors={HEADER_AVATAR_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerAvatar}
        >
          <Text style={styles.headerAvatarLetter}>{peerInitial}</Text>
        </LinearGradient>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerName, { fontFamily }]} numberOfLines={1}>
            {receiverName}
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        style={styles.messagesListFlex}
        data={listRows}
        renderItem={renderListItem}
        keyExtractor={(item) =>
          item.type === 'date' ? item.id : `m-${item.msg.id}-${item.msg.createdAt}`
        }
        contentContainerStyle={[
          styles.messagesList,
          {
            paddingBottom: bottomLayout.listPad,
            flexGrow: 1,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
      />

      {isRecording && (
        <View
          style={[
            styles.recordingContainer,
            {
              backgroundColor: FIGMA.white,
              borderTopColor: FIGMA.border,
            },
          ]}
        >
          <View style={styles.recordingInfo}>
            <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.recordingText, { color: FIGMA.azure18 }]}>
              {t('Recording')}... {formatDuration(recordingDuration)}
            </Text>
          </View>
          <View style={styles.recordingActions}>
            <TouchableOpacity
              onPress={handleCancelRecording}
              style={[styles.cancelButton, { backgroundColor: colors.error }]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.white }]}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStopRecording}
              style={[styles.stopButton, { backgroundColor: FIGMA.azure18 }]}
            >
              <Ionicons name="stop" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: FIGMA.white,
            borderTopColor: FIGMA.border,
            paddingBottom: IS_LARGE_WEB ? 12 : bottomLayout.inputPad,
          },
        ]}
      >
        {!isRecording ? (
          <>
            <TouchableOpacity
              style={styles.composerEmojiBtn}
              onLongPress={handleAttachmentPress}
              disabled={isUploadingAttachment}
              hitSlop={6}
            >
              {isUploadingAttachment ? (
                <ActivityIndicator size="small" color={FIGMA.azure18} />
              ) : (
                <Ionicons name="happy-outline" size={18} color={FIGMA.muted} />
              )}
            </TouchableOpacity>

            <TextInput
              style={[styles.composerInput, { color: FIGMA.azure18, fontFamily }]}
              placeholder={t('Type a message...')}
              placeholderTextColor={FIGMA.muted}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              onKeyPress={(event) => {
                if (Platform.OS === 'web') {
                  const nativeEvent = event.nativeEvent as any;
                  if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }
              }}
            />

            {message.trim() ? (
              <TouchableOpacity
                onPress={sendMessage}
                disabled={isSending}
                style={styles.composerSendBtn}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.composerTrailingActions}>
                <TouchableOpacity
                  onPress={handleAttachmentPress}
                  style={styles.composerAttachBtn}
                  disabled={isUploadingAttachment}
                  accessibilityLabel={t('Attach file')}
                  hitSlop={4}
                >
                  {isUploadingAttachment ? (
                    <ActivityIndicator size="small" color={FIGMA.azure18} />
                  ) : (
                    <Ionicons name="attach" size={20} color={FIGMA.azure18} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleStartRecording}
                  style={styles.composerMicBtn}
                  disabled={isUploadingAttachment}
                  accessibilityLabel={t('Voice message')}
                  hitSlop={4}
                >
                  <Ionicons name="mic" size={15} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.recordingInputPlaceholder}>
            <Text style={[styles.recordingPlaceholderText, { color: FIGMA.muted }]}>
              {t('Recording voice note...')}
            </Text>
          </View>
        )}
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatScreenInner: {
    flex: 1,
  },
  loadingRoot: {
    flex: 1,
  },
  /** Figma 61:2159 chat header */
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 12,
    backgroundColor: FIGMA.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  headerIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: FIGMA.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '700',
    color: FIGMA.azure18,
    lineHeight: 16.8,
  },
  datePillWrap: {
    alignItems: 'center',
    paddingVertical: 2,
    marginBottom: 8,
  },
  datePill: {
    backgroundColor: 'rgba(26, 39, 68, 0.07)',
    paddingHorizontal: 13,
    paddingVertical: 3,
    borderRadius: 20,
  },
  datePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: FIGMA.muted,
    letterSpacing: 0.5,
  },
  messagesList: {
    paddingHorizontal: 13,
    paddingTop: 14,
    paddingBottom: 14,
  },
  messagesListFlex: {
    flex: 1,
    minHeight: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  composerEmojiBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: FIGMA.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FIGMA.border,
    backgroundColor: FIGMA.inputBg,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
  },
  composerTrailingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  composerAttachBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: FIGMA.iconBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIGMA.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerMicBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: FIGMA.azure18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: FIGMA.azure18,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  composerSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: FIGMA.azure18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInputPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  recordingPlaceholderText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

// Helper function to format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

