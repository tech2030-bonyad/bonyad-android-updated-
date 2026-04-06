import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Linking,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio as ExpoAudio } from 'expo-av';
import { ChatMessage } from '../types/chat';
import { formatMessageTime } from '../utils/chatUtils';
import { API_BASE_URL } from '../config/api';
import ReadReceipt from './ReadReceipt';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

/** Web: HTML5 Audio; native: Expo AV (same as web `MessageBubble`). */
const WebAudio =
  Platform.OS === 'web' && typeof window !== 'undefined' ? (window as unknown as { Audio: new (src?: string) => HTMLAudioElement }).Audio : null;

/** Figma node 61:2158+ — conversation bubbles */
const FIGMA = {
  azure18: '#1A2744',
  muted: '#8892A4',
  green: '#22C55E',
  bubbleTheir: '#EEF0F5',
  bubbleMine: '#1A2744',
};

const AVATAR_GRADIENTS: [string, string][] = [
  ['#64748B', '#475569'],
  ['#8B5CF6', '#6D28D9'],
  ['#F97316', '#EA580C'],
];

const ATTACHMENT_PLACEHOLDER = '[Attachment]';

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  /** Figma Bonyad chat (node 61:2127) — conversation row + bubbles */
  variant?: 'default' | 'bonyad';
  /** First letter of peer name (incoming avatar) */
  peerInitial?: string;
}

export default function MessageBubble({
  message,
  isMine,
  variant = 'default',
  peerInitial = '?',
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const normalizedFileType = message.fileType?.toLowerCase?.() ?? '';
  const hasFile = Boolean(message.fileUrl);
  /** Same as web `src/components/others/MessageBubble/MessageBubble.tsx` */
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
    message.content !== ATTACHMENT_PLACEHOLDER &&
    !(
      normalizedFileType.includes('audio') ||
      normalizedFileType.includes('m4a') ||
      normalizedFileType.includes('mp3') ||
      normalizedFileType.includes('webm') ||
      normalizedFileType.includes('voice')
    );

  const isVoiceNote =
    normalizedFileType.includes('audio') ||
    normalizedFileType.includes('m4a') ||
    normalizedFileType.includes('mp3') ||
    normalizedFileType.includes('webm') ||
    normalizedFileType.includes('voice');

  if (variant === 'bonyad') {
    return (
      <BonyadMessageBubble
        message={message}
        isMine={isMine}
        peerInitial={peerInitial}
        hasFile={hasFile}
        fullFileUrl={fullFileUrl}
        displayFileName={displayFileName}
        normalizedFileType={normalizedFileType}
        shouldShowText={shouldShowText}
        isVoiceNote={isVoiceNote}
      />
    );
  }

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
              style={[styles.pdfAttachment, isDark && { backgroundColor: colors.gray200 }]}
            >
              <Ionicons name="document-attach" size={24} color={colors.error} />
              <Text style={[styles.pdfText, { color: colors.text }]}>{displayFileName}</Text>
              <Text style={[styles.tapText, { color: colors.textSecondary }]}>{t('Tap to view')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => Linking.openURL(fullFileUrl)}
              style={[styles.genericAttachment, isDark && { backgroundColor: colors.gray200 }]}
            >
              <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.genericFileName, { color: colors.text }]}>
                {displayFileName}
              </Text>
              <Text style={[styles.tapText, { color: colors.textSecondary }]}>{t('Tap to open')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Text Content */}
      {shouldShowText && (
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble, !isMine && isDark && { backgroundColor: colors.gray300 }]}>
          <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText, !isMine && { color: colors.text }]}>
            {message.content}
          </Text>
        </View>
      )}

      {/* Timestamp and Read Receipt */}
      <View style={styles.footer}>
        <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{formatMessageTime(message.createdAt)}</Text>
        {isMine && <ReadReceipt isRead={message.isRead || false} />}
      </View>
    </View>
  );
}

function BonyadMessageBubble({
  message,
  isMine,
  peerInitial,
  hasFile,
  fullFileUrl,
  displayFileName,
  normalizedFileType,
  shouldShowText,
  isVoiceNote,
}: {
  message: ChatMessage;
  isMine: boolean;
  peerInitial: string;
  hasFile: boolean;
  fullFileUrl: string | null;
  displayFileName: string;
  normalizedFileType: string;
  shouldShowText: boolean;
  isVoiceNote: boolean;
}) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const [g0, g1] = AVATAR_GRADIENTS[Math.abs(message.senderId || 0) % AVATAR_GRADIENTS.length];
  const letter = peerInitial.charAt(0).toUpperCase();
  const timeLabel = formatMessageTime(message.createdAt);

  // Dynamic dark-mode colors for "their" (incoming) elements
  const theirBubbleBg = isDark ? colors.cardBackground : FIGMA.bubbleTheir;
  const theirTextColor = isDark ? colors.text : FIGMA.azure18;
  const metaTimeColor = isDark ? colors.textTertiary : FIGMA.muted;

  const renderAttachment = () => {
    if (!hasFile || !fullFileUrl) return null;
    if (isVoiceNote) {
      return <VoiceNotePlayer uri={fullFileUrl} duration={message.duration || 0} isMine={isMine} bonyad />;
    }
    if (normalizedFileType.startsWith('image')) {
      return <Image source={{ uri: fullFileUrl }} style={styles.bonyadImageAttachment} resizeMode="cover" />;
    }
    if (normalizedFileType.includes('pdf')) {
      return (
        <TouchableOpacity onPress={() => Linking.openURL(fullFileUrl)} style={[styles.bonyadFileCard, !isMine && { backgroundColor: theirBubbleBg }]}>
          <Ionicons name="document-attach" size={22} color={theirTextColor} />
          <Text style={[styles.bonyadFileName, { color: theirTextColor }]}>{displayFileName}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={() => Linking.openURL(fullFileUrl)} style={[styles.bonyadFileCard, !isMine && { backgroundColor: theirBubbleBg }]}>
        <Ionicons name="document-text-outline" size={22} color={theirTextColor} />
        <Text style={[styles.bonyadFileName, { color: theirTextColor }]}>{displayFileName}</Text>
      </TouchableOpacity>
    );
  };

  const textBubble = shouldShowText ? (
    <View style={[styles.bonyadBubble, isMine ? styles.bonyadBubbleMine : [styles.bonyadBubbleTheir, { backgroundColor: theirBubbleBg }]]}>
      <Text style={[styles.bonyadBubbleText, isMine ? styles.bonyadBubbleTextMine : [styles.bonyadBubbleTextTheir, { color: theirTextColor }]]}>
        {message.content}
      </Text>
    </View>
  ) : null;

  const metaOutgoing = (
    <View style={styles.bonyadMetaRow}>
      <Text style={styles.bonyadMetaTime}>{timeLabel}</Text>
      <Text style={[styles.bonyadMetaChecks, { color: message.isRead ? FIGMA.green : FIGMA.muted }]}> ✓✓</Text>
    </View>
  );

  const metaIncoming = (
    <Text style={styles.bonyadMetaTime}>{timeLabel}</Text>
  );

  if (isMine) {
    return (
      <View style={styles.bonyadOutgoingColumn}>
        {hasFile && renderAttachment()}
        {textBubble}
        {metaOutgoing}
      </View>
    );
  }

  return (
    <View style={styles.bonyadIncomingRow}>
      <LinearGradient colors={[g0, g1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bonyadSmallAvatar}>
        <Text style={styles.bonyadSmallAvatarText}>{letter}</Text>
      </LinearGradient>
      <View style={styles.bonyadIncomingCol}>
        {hasFile && renderAttachment()}
        {textBubble}
        {metaIncoming}
      </View>
    </View>
  );
}


const WAVEFORM_BAR_COUNT = 36;
const WAVEFORM_BAR_WIDTH = 2;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_MAX_HEIGHT = 24;
const WAVEFORM_MIN_HEIGHT = 4;

function getPlaceholderWaveform(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const heights: number[] = [];
  for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
    const r = Math.abs(((h + i * 31) % 100) / 100);
    heights.push(WAVEFORM_MIN_HEIGHT + r * (WAVEFORM_MAX_HEIGHT - WAVEFORM_MIN_HEIGHT));
  }
  return heights;
}

async function decodeWaveformFromAudio(uri: string): Promise<number[] | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const AudioContextClass = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    const response = await fetch(uri, { mode: 'cors' });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const ctx = new AudioContextClass();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    await ctx.close();
    const channel = buffer.getChannelData(0);
    const length = channel.length;
    if (length === 0) return null;
    const blockSize = Math.floor(length / WAVEFORM_BAR_COUNT);
    const rawHeights: number[] = [];
    for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, length);
      let peak = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channel[j]);
        if (abs > peak) peak = abs;
      }
      rawHeights.push(peak);
    }
    const maxPeak = Math.max(...rawHeights, 1e-6);
    const heights = rawHeights.map((p) => {
      const normalized = p / maxPeak;
      return WAVEFORM_MIN_HEIGHT + normalized * (WAVEFORM_MAX_HEIGHT - WAVEFORM_MIN_HEIGHT);
    });
    return heights;
  } catch {
    return null;
  }
}

function VoiceNotePlayer({
  uri,
  duration,
  isMine,
  bonyad = false,
}: {
  uri: string;
  duration: number;
  isMine: boolean;
  bonyad?: boolean;
}) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const [sound, setSound] = useState<ExpoAudio.Sound | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [actualDuration, setActualDuration] = useState<number>(duration);
  const [waveformHeights, setWaveformHeights] = useState<number[]>(() => getPlaceholderWaveform(uri));
  const progressAnimated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    decodeWaveformFromAudio(uri)
      .then((heights) => {
        if (!cancelled && heights && heights.length === WAVEFORM_BAR_COUNT) {
          setWaveformHeights(heights);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uri]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (!WebAudio) {
        console.error('❌ [Web] Browser Audio API not available');
        return;
      }
      const audio = new WebAudio(uri);
      audio.preload = 'auto';

      audio.onended = () => {
        setIsPlaying(false);
        const d = audio.duration && !isNaN(audio.duration) ? audio.duration : duration;
        setActualDuration(d);
        setPosition(d);
        setTimeout(() => {
          setPosition(0);
          audio.currentTime = 0;
        }, 100);
      };

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setActualDuration(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        setPosition(audio.currentTime);
      };

      audio.onerror = () => {
        console.error('❌ [Web] Audio error');
        setIsPlaying(false);
      };

      setAudioElement(audio);

      return () => {
        audio.pause();
        audio.src = '';
        setAudioElement(null);
      };
    }

      // Native: Load audio directly from URL (same as web)
    let isMounted = true;
    let soundInstance: ExpoAudio.Sound | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    if (!ExpoAudio?.Sound) {
      console.error('❌ [Native] ExpoAudio.Sound is not available');
      return () => {};
    }

    const loadSoundWithRetry = async (attempt = 0): Promise<void> => {
      try {
        const { sound: newSound } = await ExpoAudio.Sound.createAsync(
          { uri },
          { shouldPlay: false }
        );

        if (isMounted) {
          soundInstance = newSound;
          setSound(newSound);

          newSound.setOnPlaybackStatusUpdate((status: unknown) => {
            const s = status as {
              isLoaded?: boolean;
              isPlaying?: boolean;
              positionMillis?: number;
              durationMillis?: number | null;
              didJustFinish?: boolean;
            };
            if (s.isLoaded) {
              const isCurrentlyPlaying = !!s.isPlaying;
              setIsPlaying(isCurrentlyPlaying);
              const pos = (s.positionMillis ?? 0) / 1000;
              const dur = s.durationMillis != null ? s.durationMillis / 1000 : duration;
              setPosition(pos);
              if (s.durationMillis != null) {
                setActualDuration(s.durationMillis / 1000);
              }
              if (s.didJustFinish && dur > 0) {
                setPosition(dur);
                setIsPlaying(false);
                setTimeout(() => {
                  setPosition(0);
                  sound?.setPositionAsync(0).catch(() => {});
                }, 100);
              }
            }
          });
        } else {
          newSound.unloadAsync().catch(() => {});
        }
      } catch (error: unknown) {
        const err = error as Error;
        const isServerError = err?.message?.includes('500') || err?.message?.includes('InvalidResponseCodeException');

        if (isServerError && attempt < MAX_RETRIES && isMounted) {
          retryCount = attempt + 1;
          console.log(`⚠️ [Native] Server error on audio load, retry ${retryCount}/${MAX_RETRIES}...`);
          setTimeout(() => {
            if (isMounted) {
              loadSoundWithRetry(retryCount).catch(() => {});
            }
          }, 1000 * retryCount);
        } else if (isMounted) {
          if (!isServerError) {
            console.error('❌ [Native] Error loading audio:', error);
          } else {
            console.warn('⚠️ [Native] Server error after retries, audio may still work');
          }
        }
      }
    };

    loadSoundWithRetry(0).catch(() => {});

    return () => {
      isMounted = false;
      if (soundInstance) {
        soundInstance.unloadAsync().catch(() => {});
      }
    };
  }, [uri, duration]);

  const playPause = async () => {
    try {
      if (Platform.OS === 'web') {
        if (!audioElement) {
          console.error('❌ [Web] Audio element not initialized');
          return;
        }

        if (isPlaying) {
          audioElement.pause();
          setIsPlaying(false);
        } else {
          try {
            if (audioElement.ended || position >= actualDuration - 0.1) {
              audioElement.currentTime = 0;
            }
            await audioElement.play();
            setIsPlaying(true);
          } catch (error: unknown) {
            console.error('❌ [Web] Error playing audio:', error);
            setIsPlaying(false);
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
              if (status.didJustFinish || status.positionMillis >= (status.durationMillis || 0) - 100) {
                await sound.setPositionAsync(0);
              }
              await sound.playAsync();
              setIsPlaying(true);
            }
          }
        } catch (error: unknown) {
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

  const safeDuration = Math.max(0.01, actualDuration || duration);
  const progress = position >= safeDuration - 0.02 ? 1 : Math.min(1, position / safeDuration);
  const displayTime = isPlaying ? position : position > 0 ? position : safeDuration;

  useEffect(() => {
    if (!isPlaying && position > 0 && position >= safeDuration - 0.02) {
      progressAnimated.setValue(1);
    }
  }, [isPlaying, position, safeDuration, progressAnimated]);

  useEffect(() => {
    Animated.timing(progressAnimated, {
      toValue: progress,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnimated]);

  const progressInterpolate = progressAnimated.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const theirBubbleBg = isDark ? colors.cardBackground : FIGMA.bubbleTheir;
  const theirAccentColor = isDark ? colors.text : FIGMA.azure18;
  const accent = bonyad ? theirAccentColor : '#2196F3';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={playPause}
      style={[
        styles.voiceNoteContainer,
        isMine ? styles.myVoiceNote : styles.theirVoiceNote,
        bonyad && isMine && { backgroundColor: FIGMA.bubbleMine },
        bonyad && !isMine && { backgroundColor: theirBubbleBg },
        bonyad && { borderRadius: 14, minWidth: 200, maxWidth: 260 },
      ]}
    >
      <View style={styles.voiceNoteRow}>
        <View style={[styles.voiceNotePlayWrap, isMine && styles.voiceNotePlayWrapMine]}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color={isMine ? '#FFFFFF' : accent}
          />
        </View>
        <View style={styles.voiceNoteWaveformWrap}>
          <View style={styles.voiceNoteWaveform}>
            <View style={[StyleSheet.absoluteFill, styles.voiceNoteWaveformRow]}>
              {waveformHeights.map((h, i) => (
                <View
                  key={`bg-${i}`}
                  style={[
                    styles.voiceNoteBar,
                    { height: h },
                    isMine
                      ? styles.voiceNoteBarUnfilledMine
                      : bonyad
                        ? styles.voiceNoteBarUnfilledBonyadTheirs
                        : styles.voiceNoteBarUnfilledTheirs,
                  ]}
                />
              ))}
            </View>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.voiceNoteWaveformRow,
                { width: progressInterpolate, overflow: 'hidden' },
              ]}
            >
              {waveformHeights.map((h, i) => (
                <View
                  key={`fg-${i}`}
                  style={[
                    styles.voiceNoteBar,
                    { height: h },
                    isMine
                      ? styles.voiceNoteBarFilledMine
                      : bonyad
                        ? styles.voiceNoteBarFilledBonyadTheirs
                        : styles.voiceNoteBarFilledTheirs,
                  ]}
                />
              ))}
            </Animated.View>
          </View>
        </View>
        <Text
          style={[
            styles.voiceNoteDuration,
            isMine && styles.myVoiceNoteText,
            !isMine && bonyad && { color: theirAccentColor },
          ]}
        >
          {formatTime(displayTime)}
        </Text>
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 140,
    maxWidth: 240,
  },
  myVoiceNote: {
    backgroundColor: '#2196F3',
  },
  theirVoiceNote: {
    backgroundColor: '#E5E5EA',
  },
  voiceNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  voiceNotePlayWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceNotePlayWrapMine: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  voiceNoteWaveformWrap: {
    flex: 1,
    minWidth: 0,
    height: 36,
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 8,
  },
  voiceNoteWaveform: {
    height: WAVEFORM_MAX_HEIGHT,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  voiceNoteWaveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: WAVEFORM_BAR_GAP,
    flexWrap: 'nowrap',
  },
  voiceNoteBar: {
    width: WAVEFORM_BAR_WIDTH,
    borderRadius: 1,
  },
  voiceNoteBarUnfilledTheirs: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  voiceNoteBarFilledTheirs: {
    backgroundColor: '#2196F3',
  },
  voiceNoteBarUnfilledBonyadTheirs: {
    backgroundColor: 'rgba(26,39,68,0.15)',
  },
  voiceNoteBarFilledBonyadTheirs: {
    backgroundColor: FIGMA.azure18,
  },
  voiceNoteBarUnfilledMine: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  voiceNoteBarFilledMine: {
    backgroundColor: '#FFFFFF',
  },
  voiceNoteDuration: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    minWidth: 36,
    marginLeft: 4,
    alignSelf: 'center',
  },
  myVoiceNoteText: {
    color: '#FFFFFF',
  },
  /** Figma conversation bubbles */
  bonyadOutgoingColumn: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  bonyadIncomingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    width: '100%',
    marginBottom: 8,
  },
  bonyadIncomingCol: {
    alignItems: 'flex-start',
    maxWidth: '78%',
  },
  bonyadSmallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonyadSmallAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bonyadBubble: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    maxWidth: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  bonyadBubbleTheir: {
    backgroundColor: FIGMA.bubbleTheir,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 3,
  },
  bonyadBubbleMine: {
    backgroundColor: FIGMA.bubbleMine,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 3,
    ...Platform.select({
      ios: {
        shadowColor: FIGMA.azure18,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  bonyadBubbleText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19.5,
  },
  bonyadBubbleTextTheir: {
    color: FIGMA.azure18,
  },
  bonyadBubbleTextMine: {
    color: '#FFFFFF',
    fontSize: 12.9,
  },
  bonyadMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 3,
    paddingHorizontal: 3,
    alignSelf: 'flex-end',
  },
  bonyadMetaTime: {
    fontSize: 9.5,
    color: FIGMA.muted,
    paddingTop: 3,
    paddingHorizontal: 3,
  },
  bonyadMetaChecks: {
    fontSize: 9.5,
    fontWeight: '400',
  },
  bonyadImageAttachment: {
    width: 200,
    height: 200,
    borderRadius: 14,
    marginBottom: 4,
  },
  bonyadFileCard: {
    backgroundColor: FIGMA.bubbleTheir,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
    minWidth: 160,
    marginBottom: 4,
  },
  bonyadFileName: {
    fontSize: 12,
    fontWeight: '600',
    color: FIGMA.azure18,
    textAlign: 'center',
  },
});

