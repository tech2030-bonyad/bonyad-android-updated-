import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Linking, TouchableOpacity, Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio as ExpoAudio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { ChatMessage } from '../types/chat';
import { formatMessageTime } from '../utils/chatUtils';
import { API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import ReadReceipt from './ReadReceipt';
import { useTranslation } from 'react-i18next';

function voiceCacheFileName(remoteUri: string): string {
  let h = 0;
  for (let i = 0; i < remoteUri.length; i++) {
    h = (Math.imul(31, h) + remoteUri.charCodeAt(i)) | 0;
  }
  const extMatch = remoteUri.match(/\.([a-z0-9]+)(?:\?|$)/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'm4a';
  return `voice_${Math.abs(h)}.${ext}`;
}

const ATTACHMENT_PLACEHOLDER = '[Attachment]';

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const { t } = useTranslation();
  const normalizedFileType = message.fileType?.toLowerCase?.() ?? '';
  const hasFile = Boolean(message.fileUrl);
  const fullFileUrl = message.fileUrl?.startsWith('http')
    ? message.fileUrl
    : message.fileUrl
      ? `${API_BASE_URL.replace('/api', '')}${message.fileUrl}`
      : null;
  const derivedFileName = fullFileUrl
    ? decodeURIComponent(fullFileUrl.split('/').pop() || '').split('?')[0]
    : undefined;
  const displayFileName = message.fileName || derivedFileName || 'Attachment';
  const shouldShowText =
    Boolean(message.content && message.content.trim().length > 0) &&
    message.content !== ATTACHMENT_PLACEHOLDER;
  
  const isVoiceNote = normalizedFileType.includes('audio') || 
                      normalizedFileType.includes('m4a') || 
                      normalizedFileType.includes('mp3') ||
                      normalizedFileType.includes('webm') ||
                      normalizedFileType.includes('voice');

  return (
    <View
      style={[
        styles.container,
        isMine ? styles.myMessage : styles.theirMessage,
      ]}
    >
      {/* File Attachment */}
      {hasFile && fullFileUrl && (
        <View style={styles.attachment}>
          {isVoiceNote ? (
            <VoiceNotePlayer 
              uri={fullFileUrl} 
              duration={message.duration || 0}
              isMine={isMine}
            />
          ) : normalizedFileType.startsWith('image') ? (
            <Image source={{ uri: fullFileUrl }} style={styles.imageAttachment} resizeMode="cover" />
          ) : normalizedFileType.includes('pdf') ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(fullFileUrl)}
              style={styles.pdfAttachment}
            >
              <Ionicons name="document-attach" size={24} color="#FF0000" />
              <Text style={styles.pdfText}>{displayFileName}</Text>
              <Text style={styles.tapText}>{t('Tap to view')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => Linking.openURL(fullFileUrl)}
              style={styles.genericAttachment}
            >
              <Ionicons name="document-text-outline" size={22} color="#555" />
              <Text style={styles.genericFileName}>
                {displayFileName}
              </Text>
              <Text style={styles.tapText}>{t('Tap to open')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Text Content */}
      {shouldShowText && (
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
            {message.content}
          </Text>
        </View>
      )}

      {/* Timestamp and Read Receipt */}
      <View style={styles.footer}>
        <Text style={styles.timestamp}>{formatMessageTime(message.createdAt)}</Text>
        {isMine && <ReadReceipt isRead={message.isRead || false} />}
      </View>
    </View>
  );
}

// Voice Note Player Component
function VoiceNotePlayer({
  uri,
  duration,
  isMine,
}: {
  uri: string;
  duration: number;
  isMine: boolean;
}) {
  const { t } = useTranslation();
  const [sound, setSound] = useState<ExpoAudio.Sound | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const soundRef = useRef<ExpoAudio.Sound | null>(null);
  const webObjectUrlRef = useRef<string | null>(null);

  const unloadSound = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
      setSound(null);
      setIsPlaying(false);
    }
  }, []);

  // Unload ExoPlayer when app goes to background to prevent the
  // "Player is accessed on the wrong thread" crash in AVManager.onHostDestroy
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        unloadSound();
      }
    });
    return () => sub.remove();
  }, [unloadSound]);

  // Initialize audio on mount (authenticated download on native — ExoPlayer cannot send Bearer headers to remote URL)
  useEffect(() => {
    let cancelled = false;

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return () => {};

      (async () => {
        try {
          setLoadError(false);
          const token = await storage.getAuthToken();
          const res = await fetch(uri, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          webObjectUrlRef.current = objectUrl;
          const audio = new Audio(objectUrl);
          audio.preload = 'auto';

          audio.onended = () => {
            setIsPlaying(false);
            setPosition(0);
          };

          audio.ontimeupdate = () => {
            setPosition(audio.currentTime);
          };

          audio.onerror = () => {
            setIsPlaying(false);
            setLoadError(true);
          };

          setAudioElement(audio);
        } catch (e) {
          if (__DEV__) {
            console.warn('[Web] Voice note load failed:', e);
          }
          if (!cancelled) setLoadError(true);
        }
      })();

      return () => {
        cancelled = true;
        if (webObjectUrlRef.current) {
          URL.revokeObjectURL(webObjectUrlRef.current);
          webObjectUrlRef.current = null;
        }
        setAudioElement(null);
      };
    }

    let isMounted = true;
    setLoadError(false);

    if (!ExpoAudio?.Sound) {
      return () => {
        isMounted = false;
        unloadSound();
      };
    }

    (async () => {
      try {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
          throw new Error('No cache directory');
        }
        const token = await storage.getAuthToken();
        const localPath = `${cacheDir}${voiceCacheFileName(uri)}`;
        const download = await FileSystem.downloadAsync(uri, localPath, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        } as FileSystem.DownloadOptions);

        if (!isMounted) {
          await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
          return;
        }

        if (download.status < 200 || download.status >= 300) {
          await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
          throw new Error(`HTTP ${download.status}`);
        }

        const { sound: newSound } = await ExpoAudio.Sound.createAsync(
          { uri: download.uri },
          { shouldPlay: false },
        );

        if (!isMounted) {
          await newSound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = newSound;
        setSound(newSound);

        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setPosition(status.positionMillis / 1000);
            if (status.didJustFinish) {
              setPosition(0);
              setIsPlaying(false);
            }
          }
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('[Native] Voice note load failed:', error);
        }
        if (isMounted) setLoadError(true);
      }
    })();

    return () => {
      isMounted = false;
      unloadSound();
    };
  }, [uri, unloadSound]);

  const playPause = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use persisted HTML5 Audio element
        if (!audioElement) {
          console.error('❌ [Web] Audio element not initialized');
          return;
        }
        
        if (isPlaying) {
          audioElement.pause();
          setIsPlaying(false);
        } else {
          try {
            await audioElement.play();
            setIsPlaying(true);
          } catch (error: any) {
            console.error('❌ [Web] Error playing audio:', error);
            setIsPlaying(false);
            // Try to reload and play
            audioElement.load();
            try {
              await audioElement.play();
              setIsPlaying(true);
            } catch (retryError) {
              console.error('❌ [Web] Retry failed:', retryError);
            }
          }
        }
      } else {
        // Native: Use Expo AV
        if (!sound) {
          console.error('❌ [Native] Sound not loaded');
          return;
        }
        
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await sound.pauseAsync();
              setIsPlaying(false);
            } else {
              await sound.playAsync();
              setIsPlaying(true);
            }
          }
        } catch (error: any) {
          console.error('❌ [Native] Error playing/pausing:', error);
          setIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('❌ Error playing voice note:', error);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  if (loadError) {
    return (
      <View
        style={[
          styles.voiceNoteContainer,
          isMine ? styles.myVoiceNote : styles.theirVoiceNote,
          styles.voiceNoteErrorBox,
        ]}
      >
        <Ionicons name="alert-circle-outline" size={20} color={isMine ? '#FFFFFF' : '#666'} />
        <Text style={[styles.voiceNoteErrorText, isMine && styles.myVoiceNoteText]} numberOfLines={2}>
          {t('Voice message unavailable')}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={playPause}
      style={[
        styles.voiceNoteContainer,
        isMine ? styles.myVoiceNote : styles.theirVoiceNote,
      ]}
    >
      <View style={styles.voiceNoteContent}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={isMine ? '#FFFFFF' : '#2196F3'}
        />
        <View style={styles.voiceNoteInfo}>
          <View style={styles.voiceNoteProgressBar}>
            <View
              style={[
                styles.voiceNoteProgress,
                {
                  width: `${progress}%`,
                  backgroundColor: isMine ? '#FFFFFF' : '#2196F3',
                },
              ]}
            />
          </View>
          <Text style={[styles.voiceNoteDuration, isMine && styles.myVoiceNoteText]}>
            {formatTime(position || duration)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '75%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  attachment: {
    marginBottom: 8,
  },
  imageAttachment: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  pdfAttachment: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    minWidth: 150,
  },
  genericAttachment: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
    minWidth: 150,
  },
  pdfText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  genericFileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  tapText: {
    fontSize: 10,
    color: '#666',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#2196F3',
  },
  theirBubble: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#FFFFFF',
  },
  theirText: {
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
  voiceNoteContainer: {
    padding: 12,
    borderRadius: 16,
    minWidth: 200,
    maxWidth: 250,
  },
  myVoiceNote: {
    backgroundColor: '#2196F3',
  },
  theirVoiceNote: {
    backgroundColor: '#E5E5EA',
  },
  voiceNoteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceNoteInfo: {
    flex: 1,
    gap: 4,
  },
  voiceNoteProgressBar: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  voiceNoteProgress: {
    height: '100%',
    borderRadius: 2,
  },
  voiceNoteDuration: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  myVoiceNoteText: {
    color: '#FFFFFF',
  },
  voiceNoteErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceNoteErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});

