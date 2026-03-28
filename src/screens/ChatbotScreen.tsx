// ChatbotScreen - AI Support Chat Interface
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useChatbot } from '../hooks/useChatbot';
import { ChatbotMessage } from '../types/chat';
import StreamingMessage from '../components/StreamingMessage';

const { width: screenWidth } = Dimensions.get('window');

interface ChatbotScreenProps {
  onBack?: () => void;
  onRequestLiveAgent?: (
    subject: string,
    aiHistory: any[],
    firstUserMessage: string
  ) => void;
  language?: 'en' | 'ar';
}

// Chat Bubble Component
const ChatBubble: React.FC<{ message: ChatbotMessage; isDarkMode: boolean; colors: any }> = ({
  message,
  isDarkMode,
  colors,
}) => {
  const isUser = message.isUser;
  
  return (
    <View
      style={[
        styles.bubbleContainer,
        isUser ? styles.userBubbleContainer : styles.botBubbleContainer,
      ]}
    >
      {!isUser && (
        <View style={[styles.botAvatar, { backgroundColor: colors.primary + '20' }]}>
          <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.botBubble, { 
                backgroundColor: isDarkMode ? colors.cardBackground : '#fff',
                borderColor: isDarkMode ? colors.gray700 : '#e0e0e0',
              }],
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.userText : [styles.botText, { color: colors.text }],
          ]}
        >
          {message.text}
        </Text>
        <Text style={[styles.timestamp, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.gray500 }]}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

// Typing Indicator Component
const TypingIndicator: React.FC<{ isDarkMode: boolean; colors: any }> = ({ isDarkMode, colors }) => (
  <View style={[styles.typingContainer, { justifyContent: 'flex-start' }]}>
    <View style={[styles.botAvatar, { backgroundColor: colors.primary + '20' }]}>
      <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
    </View>
    <View style={[styles.typingBubble, { backgroundColor: isDarkMode ? colors.cardBackground : '#fff' }]}>
      <View style={styles.typingDots}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      </View>
    </View>
  </View>
);

// Quick Question Chip
const QuickQuestionChip: React.FC<{
  question: string;
  onPress: () => void;
  colors: any;
  isDarkMode: boolean;
}> = ({ question, onPress, colors, isDarkMode }) => (
  <TouchableOpacity
    style={[
      styles.quickChip,
      {
        backgroundColor: isDarkMode ? colors.cardBackground : '#f0f4f8',
        borderColor: colors.primary + '30',
      },
    ]}
    onPress={onPress}
  >
    <Text style={[styles.quickChipText, { color: colors.primary }]} numberOfLines={1}>
      {question}
    </Text>
  </TouchableOpacity>
);

const ChatbotScreen: React.FC<ChatbotScreenProps> = ({
  onBack,
  onRequestLiveAgent,
  language: propLanguage,
}) => {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const language = propLanguage || (i18n.language === 'ar' ? 'ar' : 'en');
  const isRTL = language === 'ar';
  const headerDirectionStyle = { direction: 'ltr' as const };

  const {
    messages,
    loading,
    error,
    conversationId,
    sendMessage,
    sendQuickQuestion,
    getAIHistory,
    getFirstUserMessage,
    resetChat,
    quickQuestions,
  } = useChatbot({ language });

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (inputText.trim() && !loading) {
      sendMessage(inputText);
      setInputText('');
    }
  }, [inputText, loading, sendMessage]);

  const handleQuickQuestion = useCallback((question: string) => {
    sendQuickQuestion(question);
  }, [sendQuickQuestion]);

  const handleRequestLiveAgent = useCallback(() => {
    const aiHistory = getAIHistory();
    const firstUserMessage = getFirstUserMessage();

    Alert.alert(
      language === 'ar' ? 'Request Live Agent' : 'Request Live Agent',
      language === 'ar'
        ? 'Your conversation will be shared with the agent. Continue?'
        : 'Your conversation will be shared with the agent for better assistance. Continue?',
      [
        {
          text: language === 'ar' ? 'Cancel' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'ar' ? 'Request' : 'Request',
          onPress: () => {
            if (onRequestLiveAgent) {
              onRequestLiveAgent(firstUserMessage, aiHistory, firstUserMessage);
            }
          },
        },
      ]
    );
  }, [getAIHistory, getFirstUserMessage, language, onRequestLiveAgent]);

  // Find the last bot message index for streaming effect
  const lastBotMessageIndex = messages.length - 1 - [...messages].reverse().findIndex(m => !m.isUser);
  
  const renderMessage = useCallback(({ item, index }: { item: ChatbotMessage; index: number }) => {
    // Use streaming effect for the last bot message
    const isLastBotMessage = index === lastBotMessageIndex && !item.isUser;
    
    if (isLastBotMessage) {
      return (
        <StreamingMessage
          text={item.text}
          isUser={item.isUser}
          timestamp={item.timestamp}
          colors={colors}
          isDarkMode={isDarkMode}
          avatar={
            <View style={[styles.botAvatar, { backgroundColor: colors.primary + '20' }]}>
              <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
            </View>
          }
        />
      );
    }
    
    return <ChatBubble message={item} isDarkMode={isDarkMode} colors={colors} />;
  }, [isDarkMode, colors, lastBotMessageIndex]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
          headerDirectionStyle,
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.botIcon, { backgroundColor: colors.primary + '20' }]}>
            <MaterialCommunityIcons name="robot" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text, textAlign: 'left' }]}>
              {language === 'ar' ? 'Bonyad Assistant' : 'Bonyad Assistant'}
            </Text>
            <View style={styles.onlineIndicator}>
              <View style={[styles.onlineDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.onlineText, { color: colors.gray500 }]}>
                {language === 'ar' ? 'Online' : 'Online'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={resetChat} style={styles.resetButton}>
          <Feather name="refresh-cw" size={20} color={colors.gray500} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        inverted={false}
      />

      {/* Quick Questions */}
      {messages.length <= 2 && !loading && (
        <View style={[styles.quickQuestionsContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.quickQuestionsTitle, { color: colors.gray500 }]}>
            {language === 'ar' ? 'Quick Questions:' : 'Quick Questions:'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickQuestionsScroll}
          >
            {quickQuestions.map((question, index) => (
              <QuickQuestionChip
                key={index}
                question={question}
                onPress={() => handleQuickQuestion(question)}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Typing Indicator */}
      {loading && <TypingIndicator isDarkMode={isDarkMode} colors={colors} />}

      {/* Live Agent Circular Button */}
      <View style={styles.liveAgentContainer}>
        <TouchableOpacity
          style={[styles.liveAgentCircleButton, { backgroundColor: colors.success }]}
          onPress={handleRequestLiveAgent}
          activeOpacity={0.8}
        >
          <Ionicons name="headset" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.liveAgentCircleText, { color: colors.textSecondary }]}>
          {language === 'ar' ? 'Live Agent' : 'Live Agent'}
        </Text>
      </View>

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: isDarkMode ? colors.gray100 : '#f1f5f9',
              color: colors.text,
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={language === 'ar' ? 'Type your message...' : 'Type your message...'}
          placeholderTextColor={colors.gray500}
          multiline
          maxLength={500}
          textAlign={isRTL ? 'right' : 'left'}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() && !loading ? colors.primary : colors.gray400,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={isRTL ? 'arrow-back' : 'arrow-forward'}
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
  },
  resetButton: {
    padding: 8,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  bubbleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  botBubbleContainer: {
    alignSelf: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: screenWidth * 0.7,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  quickQuestionsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickQuestionsTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  quickQuestionsScroll: {
    paddingRight: 16,
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  liveAgentContainer: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  liveAgentCircleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' as any,
      },
    }),
  },
  liveAgentCircleText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});

export default ChatbotScreen;
