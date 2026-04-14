import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  AppState,
  Platform,
  Dimensions,
  TextInput,
  ListRenderItem,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl, API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import { getAppTopBarPaddingTop } from '../utils/statusBarHelper';
import { ChatRoom } from '../types/chat';
import { formatRelativeTime } from '../utils/chatUtils';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';

/** Figma node 61:2060 — CHAT LIST VIEW (Bonyad file) */
const FIGMA = {
  contentBg: '#EEF0F5',
  white: '#FFFFFF',
  border: '#E8EAF0',
  titleText: '#1A2744',
  searchBg: '#F5F6FA',
  placeholder: '#757575',
  muted: '#8892A4',
  chipActiveBg: '#1A2744',
  chipInactiveBorder: '#E8EAF0',
  badgeBlue: '#2D5BE3',
  onlineGreen: '#22C55E',
} as const;

const AVATAR_GRADIENTS: readonly [readonly [string, string], readonly [string, string], readonly [string, string]] = [
  ['#64748B', '#475569'],
  ['#8B5CF6', '#6D28D9'],
  ['#F97316', '#EA580C'],
];

const ROW_SPRING = { damping: 16, stiffness: 380, mass: 0.35 };
const FILTER_OUT_MS = 100;
const FILTER_IN_MS = 200;

function avatarGradientForUser(id: number): readonly [string, string] {
  const idx = Math.abs(id) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

type FilterChip = 'all' | 'unread' | 'read';

interface ChatRoomsListScreenProps {
  onBack?: () => void;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  /** When true, AppTopBar is already above this screen — skip extra header top inset. */
  stackedUnderAppTopBar?: boolean;
}

type ChatRowProps = {
  item: ChatRoom;
  fontStyle: { fontFamily?: string };
  onOpenRow: (room: ChatRoom) => void;
  t: (k: string) => string;
};

const ChatRow = memo(function ChatRow({ item, fontStyle, onOpenRow, t }: ChatRowProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const profileImageUrl = item.otherUserProfileImage?.startsWith('http')
    ? item.otherUserProfileImage
    : item.otherUserProfileImage
      ? `${API_BASE_URL.replace('/api', '')}${item.otherUserProfileImage}`
      : null;

  const [g0, g1] = avatarGradientForUser(item.otherUserId);
  const initial = (item.otherUserName || '?').charAt(0).toUpperCase();
  const unread = item.unreadCount > 0;

  const onPressIn = () => {
    scale.value = withSpring(0.98, ROW_SPRING);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, ROW_SPRING);
  };

  const onPress = () => {
    onOpenRow(item);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        activeOpacity={1}
        accessibilityRole="button"
      >
        <View style={styles.avatarWrap}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={[g0, g1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarImage}>
              <Text style={[styles.avatarLetter, fontStyle]}>{initial}</Text>
            </LinearGradient>
          )}
          <View style={[styles.onlineDot, styles.onlineDotLTR, { borderColor: colors.cardBackground }]} />
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.nameText, { color: colors.text }, fontStyle]} numberOfLines={1}>
              {item.otherUserName}
            </Text>
            <Text style={[styles.timeText, { color: colors.textTertiary }, fontStyle]} numberOfLines={1}>
              {formatRelativeTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.previewText, { color: colors.textTertiary }, fontStyle]} numberOfLines={1}>
              {item.lastMessage || t('No messages yet')}
            </Text>
            {unread ? (
              <View style={styles.unreadBadge}>
                <Text style={[styles.unreadBadgeText, fontStyle]} numberOfLines={1}>
                  {item.unreadCount > 99 ? '99+' : String(item.unreadCount)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function ChatRoomsListScreen({
  onBack,
  onOpenChat,
  stackedUnderAppTopBar = false,
}: ChatRoomsListScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, boldFontFamily } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChip, setFilterChip] = useState<FilterChip>('all');
  const appState = useRef(AppState.currentState);
  const flatListRef = useRef<FlatList<ChatRoom>>(null);

  const listOpacity = useSharedValue(1);
  const listTranslateY = useSharedValue(0);
  const hasMountedRef = useRef(false);

  const listAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
    transform: [{ translateY: listTranslateY.value }],
  }));

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const shouldShowBackButton = onBack && !IS_LARGE_WEB;
  const headerTopPadding = stackedUnderAppTopBar ? 0 : getAppTopBarPaddingTop(insets);

  const fontStyle = useMemo(() => ({ fontFamily }), [fontFamily]);
  const bottomPad = Math.max(insets.bottom + 96, 140);

  const filteredRooms = useMemo(() => {
    let list = chatRooms;
    if (filterChip === 'unread') list = list.filter((r) => r.unreadCount > 0);
    if (filterChip === 'read') list = list.filter((r) => r.unreadCount === 0);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.otherUserName || '').toLowerCase().includes(q) ||
          (r.lastMessage || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [chatRooms, filterChip, searchQuery]);

  const commitFilter = useCallback((chip: FilterChip) => {
    setFilterChip(chip);
  }, []);

  const onChipPress = useCallback(
    (chip: FilterChip) => {
      if (chip === filterChip) return;
      listTranslateY.value = withTiming(6, {
        duration: FILTER_OUT_MS,
        easing: Easing.in(Easing.cubic),
      });
      listOpacity.value = withTiming(0, {
        duration: FILTER_OUT_MS,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        if (finished) runOnJS(commitFilter)(chip);
      });
    },
    [commitFilter, filterChip, listOpacity, listTranslateY]
  );

  /** Fade list back in on the same frame as the new filter data (avoids flash vs useEffect). */
  useLayoutEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    listOpacity.value = withTiming(1, {
      duration: FILTER_IN_MS,
      easing: Easing.out(Easing.cubic),
    });
    listTranslateY.value = withTiming(0, {
      duration: FILTER_IN_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [filterChip]);

  useEffect(() => {
    loadChatRooms().catch((error) => {
      setIsLoading(false);
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        loadChatRooms().catch(() => {
          // silently handle
        });
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const loadChatRooms = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        Alert.alert(t('Error'), t('Please login to view chats'));
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.CHAT.MY_CHATS);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format: expected JSON');
        }

        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          setChatRooms([]);
          return;
        }

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error('Invalid JSON response from server');
        }

        let chatRoomsData: ChatRoom[] = [];

        if (Array.isArray(responseData)) {
          chatRoomsData = responseData;
        } else if (responseData && Array.isArray(responseData.data)) {
          chatRoomsData = responseData.data;
        } else if (responseData && Array.isArray(responseData.rooms)) {
          chatRoomsData = responseData.rooms;
        } else if (responseData && Array.isArray(responseData.chatRooms)) {
          chatRoomsData = responseData.chatRooms;
        } else if (responseData === null || responseData === undefined) {
          chatRoomsData = [];
        } else {
          throw new Error('Invalid response format: expected array or object with array property');
        }

        setChatRooms(chatRoomsData);
      } else {
        const errorText = await response.text();
        Alert.alert(t('Error'), t('Failed to load chats'));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('Failed to load chats');
      Alert.alert(t('Error'), message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChatRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChatRoomPress = useCallback(
    (room: ChatRoom) => {
      if (onOpenChat) {
        onOpenChat(room.roomId, room.otherUserId, room.otherUserName, room.projectId);
      }
    },
    [onOpenChat]
  );

  const renderChatRow: ListRenderItem<ChatRoom> = useCallback(
    ({ item, index }) => {
      return (
        <ChatRow
          item={item}
          fontStyle={fontStyle}
          onOpenRow={handleChatRoomPress}
          t={t}
        />
      );
    },
    [fontStyle, handleChatRoomPress, t]
  );

  /**
   * Keep search / filters OUTSIDE FlatList. measureInWindow for tour refs inside
   * VirtualizedList headers is unreliable on Android (often 0×0).
   */
  const chatListHeader = useMemo(
    () => (
      <View style={[styles.listHeaderBlock, { borderBottomColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.chatsTitleRow}>
          <View style={styles.titleLeft}>
            {shouldShowBackButton ? (
              <TouchableOpacity onPress={onBack} accessibilityRole="button" style={styles.backBtn}>
                <BackArrowIonicons variant="arrow" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.chatsHeading, { color: colors.text }, fontStyle]}>{t('Chats')}</Text>
          </View>
        </View>

        {/* Search and filters */}
        <View style={styles.searchFiltersTourWrap}>
          <View style={[styles.searchBox, { backgroundColor: colors.gray100, borderColor: colors.border }]}>
            <Ionicons name="search" size={13} color={colors.textTertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('Search chats...')}
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.text }, fontStyle]}
              returnKeyType="search"
              {...(Platform.OS === 'ios' ? { clearButtonMode: 'while-editing' as const } : {})}
            />
          </View>

          <View style={styles.chipRow}>
            {(['all', 'unread', 'read'] as FilterChip[]).map((chip) => {
              const isActive = filterChip === chip;
              const label =
                chip === 'all' ? `${t('All')} (${chatRooms.length})` : chip === 'unread' ? t('Unread') : t('Read');
              return (
                <TouchableOpacity
                  key={chip}
                  onPress={() => onChipPress(chip)}
                  style={[
                    styles.chip,
                    isActive
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipLabel, { color: isActive ? '#FFFFFF' : colors.textTertiary }, fontStyle]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    ),
    [
      chatRooms.length,
      colors.border,
      colors.cardBackground,
      colors.gray100,
      colors.primary,
      colors.text,
      colors.textTertiary,
      filterChip,
      fontStyle,
      onBack,
      onChipPress,
      searchQuery,
      shouldShowBackButton,
      t,
    ]
  );

  if (isLoading) {
    return (
      <View style={[styles.screenRoot, { backgroundColor: colors.background, paddingTop: headerTopPadding }]}>
        <AnimatedLoadingScreen message={t('Loading chats...')} />
      </View>
    );
  }

  const emptyTitle =
    chatRooms.length === 0
      ? t('No chats yet')
      : t('No matching chats');
  const emptySubtitle =
    chatRooms.length === 0
      ? t('Start a conversation to begin chatting')
      : t('Try a different search or filter');

  const emptyComponent = (
    <View style={styles.emptyWrap}>
      <Ionicons name="chatbubbles-outline" size={80} color={colors.gray300} />
      <Text style={[styles.emptyTitle, { color: colors.text }, fontStyle]}>{emptyTitle}</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }, fontStyle]}>{emptySubtitle}</Text>
    </View>
  );

  return (
    <View
      style={[
        styles.screenRoot,
        {
          backgroundColor: colors.background,
          paddingTop: headerTopPadding,
        },
      ]}
    >
      {/* Header outside Reanimated translateY — measureInWindow for the tour must match pixels on screen */}
      {chatListHeader}
      <Animated.View style={[styles.listWrap, listAnimatedStyle]}>
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={filteredRooms}
          renderItem={renderChatRow}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={emptyComponent}
          contentContainerStyle={[
            styles.listContent,
            filteredRooms.length === 0 && styles.listContentEmpty,
            { paddingBottom: bottomPad },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={7}
          initialNumToRender={10}
        />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  /** Figma: header block pt 13 pb 11 px 15 gap 10 */
  listHeaderBlock: {
    backgroundColor: FIGMA.white,
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 11,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  /** Groups search row + chip row for tour measure (single spotlight below the title) */
  searchFiltersTourWrap: {
    gap: 10,
  },
  chatsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  backBtn: {
    marginRight: 0,
  },
  chatsHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    padding: 0,
    margin: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as object }),
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: FIGMA.chipActiveBg,
    borderColor: FIGMA.chipActiveBg,
  },
  chipInactive: {
    backgroundColor: FIGMA.white,
    borderColor: FIGMA.chipInactiveBorder,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  /** Row: gap 11, px 15 pt 12 pb 13 */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 13,
    backgroundColor: FIGMA.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FIGMA.border,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'visible',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: FIGMA.white,
  },
  onlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: FIGMA.onlineGreen,
    borderWidth: 2,
    borderColor: FIGMA.white,
    bottom: -1,
  },
  onlineDotLTR: {
    right: -1,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  nameText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '400',
    flexShrink: 0,
  },
  previewText: {
    fontSize: 11.5,
    fontWeight: '400',
    flex: 1,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: FIGMA.badgeBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: FIGMA.white,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
    minHeight: 280,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
