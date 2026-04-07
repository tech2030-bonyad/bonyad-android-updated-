// ChatbotScreen — AI assistant (light UI; robot hero when no user messages; composer clears GlassTabBar)
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Animated,
  Easing,
  BackHandler,
  Modal,
  type TextStyle,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useChatbot } from '../hooks/useChatbot';
import { ChatbotMessage } from '../types/chat';
import type { NavigationAction } from '../utils/navigationParser';
import { isChatbotHomeTabTarget, resolveChatbotScreenToken } from '../utils/chatbotNavTargets';
import { renderChatbotInlineText } from '../utils/chatbotAndroidRichText';
import { ChatbotRobotFace } from '../components/ChatbotFab';
import { getGlassTabBarOverlayHeight } from '../components/GlassTabBar';
import ChatbotService from '../services/ChatbotService';
import SOWProjectCard from '../components/SOWProjectCard';

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_BUBBLE_W = Math.min(320, SCREEN_W * 0.78);

type ChatChrome = {
  screenBg: string;
  cardBg: string;
  border: string;
  text: string;
  textSecondary: string;
  headerGrad: [string, string];
  inputBg: string;
  placeholder: string;
  userBubbleBg: string;
  userBubbleText: string;
  typingDot: string;
};

function buildChrome(colors: { primary: string; primaryDark: string; background: string; cardBackground: string; border: string; text: string; textSecondary: string; gray100: string; textTertiary: string }): ChatChrome {
  return {
    screenBg: colors.background,
    cardBg: colors.cardBackground,
    border: colors.border,
    text: colors.text,
    textSecondary: colors.textSecondary,
    headerGrad: [colors.primaryDark, colors.primary],
    inputBg: colors.gray100,
    placeholder: colors.textTertiary,
    userBubbleBg: colors.cardBackground,
    userBubbleText: colors.text,
    typingDot: colors.textSecondary,
  };
}

type ListRow =
  | { type: 'date'; id: string; label: string }
  | { type: 'msg'; msg: ChatbotMessage };

function calendarDayKey(iso: Date): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function datePillLabel(d: Date, t: (k: string) => string): string {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diffDays === 0) return t('Today');
  if (diffDays === 1) return t('Yesterday');
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

interface ChatbotScreenProps {
  onBack?: () => void;
  onRequestLiveAgent?: (
    subject: string,
    aiHistory: any[],
    firstUserMessage: string
  ) => void;
  language?: 'en' | 'ar';
  userRole?: 'user' | 'technician';
  userId?: number;
  onNavigateToTab?: (tabName: string) => void;
  onNavigateToScreen?: (screenName: string, params?: Record<string, unknown>) => void;
  /** When true, reserve space for the floating `GlassTabBar` (home shell). */
  hasBottomTabBar?: boolean;
}


/** Milliseconds between each character (bot “typing” the welcome line). */
const WELCOME_TYPE_INTERVAL_MS = 38;

function TypingWelcomeText({
  fullText,
  textStyle,
  cursorColor,
}: {
  fullText: string;
  textStyle: TextStyle | TextStyle[];
  cursorColor: string;
}) {
  const chars = useMemo(() => Array.from(fullText), [fullText]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (chars.length === 0) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= chars.length) {
        clearInterval(id);
      }
    }, WELCOME_TYPE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [chars]);

  const visible = chars.slice(0, count).join('');
  const showCursor = count < chars.length;

  return (
    <Text style={textStyle}>
      {visible}
      {showCursor ? (
        <Text style={[styles.welcomeCursor, { color: cursorColor }]}>|</Text>
      ) : null}
    </Text>
  );
}

const ChatBubble: React.FC<{
  message: ChatbotMessage;
  colors: { primary: string; primaryLight: string; primaryDark: string; text: string };
  chrome: ChatChrome;
  onNavPress?: (action: NavigationAction) => void;
  onProjectCreated?: (projectId: number) => void;
}> = ({ message, colors, chrome, onNavPress, onProjectCreated }) => {
  const isUser = message.isUser;
  const noopNav = () => {};
  const botBody =
    !isUser && message.displayText != null
      ? renderChatbotInlineText(
          message.displayText,
          message.navigationActions as NavigationAction[] | undefined,
          [
            styles.bubbleText,
            isUser ? styles.userBubbleTextDark : styles.botBubbleText,
          ],
          { color: colors.primary, textDecorationLine: 'underline' as const, fontWeight: '600' as const },
          onNavPress ?? noopNav
        )
      : null;

  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
      <View style={[styles.bubbleWrap, { maxWidth: MAX_BUBBLE_W }]}>
        {isUser ? (
          <View
            style={[
              styles.userBubble,
              { backgroundColor: chrome.userBubbleBg, borderColor: chrome.border },
            ]}
          >
            {botBody ? (
              botBody
            ) : (
              <Text style={[styles.bubbleText, { color: chrome.userBubbleText }]}>{message.displayText ?? message.text}</Text>
            )}
          </View>
        ) : (
          <LinearGradient colors={chrome.headerGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.botBubble}>
            {botBody ? (
              botBody
            ) : (
              <Text style={[styles.bubbleText, styles.botBubbleText]}>{message.displayText ?? message.text}</Text>
            )}
          </LinearGradient>
        )}
        <Text
          style={[
            styles.msgTime,
            { alignSelf: isUser ? 'flex-end' : 'flex-start', color: chrome.textSecondary },
          ]}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {/* SOW Project Card — shown below bot bubble when chatbot suggests a project */}
      {!isUser && message.sow && (
        <SOWProjectCard
          sow={message.sow}
          onProjectCreated={onProjectCreated}
        />
      )}
    </View>
  );
};

const TypingIndicator: React.FC<{ chrome: ChatChrome }> = ({ chrome }) => (
  <View style={[styles.msgRow, styles.msgRowBot]}>
    <View style={[styles.typingBubble, { backgroundColor: chrome.inputBg, borderColor: chrome.border }]}>
      <View style={styles.typingDots}>
        <View style={[styles.dot, { backgroundColor: chrome.typingDot }]} />
        <View style={[styles.dot, { backgroundColor: chrome.typingDot }]} />
        <View style={[styles.dot, { backgroundColor: chrome.typingDot }]} />
      </View>
    </View>
  </View>
);

const QuickQuestionChip: React.FC<{
  question: string;
  onPress: () => void;
  primary: string;
  chrome: ChatChrome;
}> = ({ question, onPress, primary, chrome }) => (
  <TouchableOpacity
    style={[styles.quickChip, { borderColor: `${primary}44`, backgroundColor: chrome.cardBg }]}
    onPress={onPress}
  >
    <Text style={[styles.quickChipText, { color: chrome.text }]} numberOfLines={2}>
      {question}
    </Text>
  </TouchableOpacity>
);

const ChatbotScreen: React.FC<ChatbotScreenProps> = ({
  onBack,
  language: propLanguage,
  userRole = 'user',
  userId = 0,
  onNavigateToTab,
  onNavigateToScreen,
  hasBottomTabBar = false,
}) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = propLanguage || (i18n.language === 'ar' ? 'ar' : 'en');
  const chrome = useMemo(() => buildChrome(colors), [colors]);

  const tabBarClearance = useMemo(() => {
    if (!hasBottomTabBar) return Math.max(insets.bottom, 12);
    return getGlassTabBarOverlayHeight(insets.bottom);
  }, [hasBottomTabBar, insets.bottom]);

  const {
    messages,
    setMessages,
    loading,
    error,
    sendMessage,
    sendQuickQuestion,
    resetChat,
    quickQuestions,
  } = useChatbot({ language, userRole, userId });

  const hasUserMessage = messages.some((m) => m.isUser);
  const welcomeOnly = !hasUserMessage;

  const [inputText, setInputText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    screenOpacity.setValue(0);
    screenTranslateY.setValue(28);
    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(screenTranslateY, {
        toValue: 0,
        tension: 68,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenOpacity, screenTranslateY]);

  const runCloseAnimation = useCallback(
    (then?: () => void) => {
      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(screenTranslateY, {
          toValue: 36,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) then?.();
      });
    },
    [screenOpacity, screenTranslateY]
  );

  const handleBack = useCallback(() => {
    runCloseAnimation(() => onBack?.());
  }, [onBack, runCloseAnimation]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showDeleteModal) {
        setShowDeleteModal(false);
        return true;
      }
      if (onBack) {
        handleBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [onBack, handleBack, showDeleteModal]);

  useEffect(() => {
    if (hasUserMessage && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages, loading, hasUserMessage]);

  const listRows: ListRow[] = useMemo(() => {
    const rows: ListRow[] = [];
    let lastKey: string | null = null;
    messages.forEach((m) => {
      const k = calendarDayKey(m.timestamp);
      if (k !== lastKey) {
        lastKey = k;
        rows.push({ type: 'date', id: `d-${k}`, label: datePillLabel(m.timestamp, t) });
      }
      rows.push({ type: 'msg', msg: m });
    });
    return rows;
  }, [messages, t]);

  const handleSend = useCallback(() => {
    if (inputText.trim() && !loading) {
      sendMessage(inputText);
      setInputText('');
    }
  }, [inputText, loading, sendMessage]);

  const handleQuickQuestion = useCallback(
    (question: string) => {
      sendQuickQuestion(question);
    },
    [sendQuickQuestion]
  );

  const handleSOWProjectCreated = useCallback(
    (projectId: number) => {
      const successMsg: ChatbotMessage = {
        id: `sow-success-${Date.now()}`,
        text:
          language === 'ar'
            ? `تم إضافة المشروع بنجاح إلى مشاريعي! (رقم المشروع: ${projectId})`
            : `Project successfully added to My Projects! (ID: ${projectId})`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
    },
    [language]
  );

  const confirmDeleteChat = useCallback(() => {
    resetChat();
    setShowDeleteModal(false);
  }, [resetChat]);

  const runNavAction = useCallback(
    (action: NavigationAction) => {
      const ty = action.type;
      if (ty === 'tab' && onNavigateToTab) {
        const token = action.target;
        const resolved = resolveChatbotScreenToken(String(token)) ?? String(token);
        if (!isChatbotHomeTabTarget(String(token)) && onNavigateToScreen) {
          void onNavigateToScreen(resolved, action.params);
          return;
        }
        onNavigateToTab(token);
        return;
      }
      onNavigateToScreen?.(action.target, action.params);
    },
    [onNavigateToTab, onNavigateToScreen]
  );

  const renderRow = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.type === 'date') {
        return (
          <View style={styles.dateSection}>
            <View style={[styles.datePill, { backgroundColor: chrome.cardBg, borderColor: chrome.border }]}>
              <Text style={[styles.datePillText, { color: chrome.text }]}>{item.label}</Text>
            </View>
          </View>
        );
      }
      return <ChatBubble message={item.msg} colors={colors} chrome={chrome} onNavPress={runNavAction} onProjectCreated={handleSOWProjectCreated} />;
    },
    [colors, chrome, runNavAction, handleSOWProjectCreated]
  );

  const keyExtractor = useCallback((item: ListRow) => {
    if (item.type === 'date') return item.id;
    return item.msg.id;
  }, []);

  const placeholder = language === 'ar' ? 'اكتب رسالتك…' : 'Enter your message…';

  const welcomeFullText = ChatbotService.getWelcomeMessage(language === 'ar' ? 'ar' : 'en');

  const showQuickQuestions = !loading && (welcomeOnly || messages.length <= 2);

  const quickChips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
      {quickQuestions.map((question, index) => (
        <QuickQuestionChip
          key={index}
          question={question}
          onPress={() => handleQuickQuestion(question)}
          primary={colors.primary}
          chrome={chrome}
        />
      ))}
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: chrome.screenBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}
    >
      <Animated.View
        style={[
          styles.animatedScreen,
          {
            opacity: screenOpacity,
            transform: [{ translateY: screenTranslateY }],
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <View style={[styles.mainColumn, { paddingHorizontal: 12 }]}>
          <View style={styles.topBar}>
            {onBack ? (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={language === 'ar' ? 'رجوع' : 'Back'}
              >
                <BackArrowIonicons variant="chevron" size={26} color={chrome.text} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnSpacer} />
            )}
            <View
              style={[
                styles.headerPill,
                { backgroundColor: chrome.cardBg, borderColor: chrome.border },
              ]}
            >
              <Text style={[styles.headerTitle, { color: chrome.text }]} numberOfLines={1}>
                {language === 'ar' ? 'مساعد بنياد' : 'Bonyad Assistant'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowDeleteModal(true)}
              style={styles.deleteBtnOutside}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={language === 'ar' ? 'حذف المحادثة' : 'Delete chat'}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={styles.errorBanner}>{error}</Text>
          ) : null}

          {welcomeOnly ? (
            <View style={styles.emptyCenter}>
              <ChatbotRobotFace
                primaryColor={colors.primaryLight}
                primaryDark={colors.primaryDark}
                diameter={100}
                enableBlink
              />
              <TypingWelcomeText
                fullText={welcomeFullText}
                textStyle={[styles.welcomeText, { color: chrome.text }]}
                cursorColor={colors.primary}
              />
            </View>
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={listRows}
                keyExtractor={keyExtractor}
                renderItem={renderRow}
                style={styles.listFlex}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />
              {loading && <TypingIndicator chrome={chrome} />}
            </>
          )}
        </View>

        <View
          style={[
            styles.composerDock,
            {
              backgroundColor: chrome.cardBg,
              borderTopColor: chrome.border,
              paddingBottom: tabBarClearance,
            },
          ]}
        >
          {showQuickQuestions ? (
            <View style={styles.quickAboveComposer}>
              <Text style={[styles.quickTitle, { color: chrome.textSecondary }]}>
                {language === 'ar' ? 'أسئلة سريعة' : 'Quick questions'}
              </Text>
              {quickChips}
            </View>
          ) : null}
          <View style={styles.composerRow}>
            <View
              style={[
                styles.inputShell,
                { backgroundColor: chrome.inputBg, borderColor: chrome.border },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  { color: chrome.text, textAlign: language === 'ar' ? 'right' : 'left' },
                ]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={placeholder}
                placeholderTextColor={chrome.placeholder}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || loading}
              style={[styles.roundAction, (!inputText.trim() || loading) && styles.roundActionDisabled]}
              activeOpacity={0.85}
            >
              <LinearGradient colors={chrome.headerGrad} style={StyleSheet.absoluteFill} />
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="paper-plane" size={18} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roundAction}
              onPress={() =>
                Alert.alert(
                  language === 'ar' ? 'قريباً' : 'Coming soon',
                  language === 'ar' ? 'الإدخال الصوتي قيد التطوير.' : 'Voice input is not available yet.'
                )
              }
              activeOpacity={0.85}
            >
              <LinearGradient colors={chrome.headerGrad} style={StyleSheet.absoluteFill} />
              <Feather name="mic" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roundAction, styles.roundActionBorder, { borderColor: chrome.border }]}
              onPress={() =>
                Alert.alert(
                  language === 'ar' ? 'قريباً' : 'Coming soon',
                  language === 'ar' ? 'إرفاق الملفات قيد التطوير.' : 'Attachments are not available yet.'
                )
              }
              activeOpacity={0.85}
            >
              <LinearGradient colors={chrome.headerGrad} style={StyleSheet.absoluteFill} />
              <Feather name="paperclip" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
        statusBarTranslucent
      >
        <View style={styles.deleteModalRoot}>
          <TouchableOpacity
            style={styles.deleteModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowDeleteModal(false)}
          />
          <View style={styles.deleteModalWrap} pointerEvents="box-none">
            <View style={[styles.deleteModalCard, { backgroundColor: chrome.cardBg, borderColor: chrome.border }]}>
              <Text style={[styles.deleteModalTitle, { color: chrome.text }]}>
                {language === 'ar' ? 'حذف المحادثة؟' : 'Delete chat?'}
              </Text>
              <Text style={[styles.deleteModalBody, { color: chrome.textSecondary }]}>
                {language === 'ar'
                  ? 'سيتم مسح جميع الرسائل في هذه المحادثة. لا يمكن التراجع عن هذا الإجراء.'
                  : 'All messages in this chat will be cleared. This cannot be undone.'}
              </Text>
              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={[styles.deleteModalBtnSecondary, { borderColor: chrome.border }]}
                  onPress={() => setShowDeleteModal(false)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.deleteModalBtnSecondaryText, { color: chrome.text }]}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteModalBtnPrimary, { backgroundColor: colors.error }]}
                  onPress={confirmDeleteChat}
                  activeOpacity={0.85}
                >
                  <Text style={styles.deleteModalBtnPrimaryText}>
                    {language === 'ar' ? 'حذف' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  animatedScreen: {
    flex: 1,
  },
  mainColumn: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnSpacer: {
    width: 40,
  },
  headerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  deleteBtnOutside: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  errorBanner: {
    color: '#c62828',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
    paddingHorizontal: 2,
    flexGrow: 1,
  },
  emptyCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  welcomeText: {
    marginTop: 20,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  welcomeCursor: {
    opacity: 0.85,
    fontWeight: '300',
  },
  quickAboveComposer: {
    marginBottom: 10,
    paddingTop: 2,
  },
  dateSection: {
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  datePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  msgRow: {
    marginBottom: 14,
  },
  msgRowUser: {
    alignItems: 'flex-end',
  },
  msgRowBot: {
    alignItems: 'flex-start',
  },
  bubbleWrap: {
    maxWidth: MAX_BUBBLE_W,
  },
  userBubble: {
    borderRadius: 22,
    borderTopRightRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  botBubble: {
    borderRadius: 22,
    borderTopLeftRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  bubbleText: {
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  userBubbleTextDark: {
    color: '#111827',
  },
  botBubbleText: {
    color: '#FFFFFF',
  },
  msgTime: {
    fontSize: 13,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  typingBubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    borderTopLeftRadius: 14,
    borderWidth: 1,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.85,
    marginHorizontal: 3,
  },
  quickTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  quickScroll: {
    paddingRight: 8,
    paddingVertical: 2,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    maxWidth: SCREEN_W * 0.72,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  composerDock: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
  },
  inputShell: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    paddingVertical: 0,
  },
  roundAction: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundActionDisabled: {
    opacity: 0.45,
  },
  roundActionBorder: {
    borderWidth: 1,
  },
  deleteModalRoot: {
    flex: 1,
  },
  deleteModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  deleteModalWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalBody: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteModalBtnSecondary: {
    flex: 1,
    marginEnd: 5,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  deleteModalBtnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalBtnPrimary: {
    flex: 1,
    marginStart: 5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalBtnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ChatbotScreen;
