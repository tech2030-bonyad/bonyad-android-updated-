// 🤖 useChatbot Hook - Manage Chatbot State and API Calls
import { useState, useCallback, useRef } from 'react';
import ChatbotService from '../services/ChatbotService';
import { ChatbotMessage, AIConversationMessage } from '../types/chat';
import { parseNavigationFromResponse } from '../utils/navigationParser';

interface UseChatbotOptions {
  language?: 'en' | 'ar';
  userRole?: 'user' | 'technician';
  userId?: number;
}

export const useChatbot = (options: UseChatbotOptions = {}) => {
  const { language = 'en', userRole = 'user', userId = 0 } = options;
  
  const [messages, setMessages] = useState<ChatbotMessage[]>([
    {
      id: 'welcome',
      text: ChatbotService.getWelcomeMessage(language),
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Send message to chatbot
   */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add user message
    const userMessage: ChatbotMessage = {
      id: `user-${Date.now()}`,
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await ChatbotService.sendMessage(text, conversationId, {
        userType: userRole === 'technician' ? 'TECHNICIAN' : 'USER',
        language: language === 'ar' ? 'ar' : 'en',
        userId: userId > 0 ? userId : null,
      });
      console.log('📥 useChatbot response:', response);
      
      if (!response || !response.response) {
        throw new Error('Invalid response from chatbot');
      }
      
      setConversationId(response.conversationId);

      const parsed = parseNavigationFromResponse(response.response || '');
      const botMessage: ChatbotMessage = {
        id: `bot-${Date.now()}`,
        text: response.response,
        displayText: parsed.text,
        navigationActions: parsed.actions.length > 0 ? parsed.actions : undefined,
        isUser: false,
        timestamp: response.timestamp ? new Date(response.timestamp) : new Date(),
        sow: response.sow,
      };
      
      console.log('🤖 Bot message created:', botMessage);
      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Error in chatbot:', err);
      
      // Don't show error for aborted requests
      if (err.name === 'AbortError') return;
      
      setError(language === 'ar' 
        ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
        : 'Sorry, I\'m having trouble connecting. Please try again.'
      );

      const errorMessage: ChatbotMessage = {
        id: `error-${Date.now()}`,
        text: language === 'ar'
          ? 'عذراً، تواجه خدمة الدردشة مشكلة. يرجى المحاولة مرة أخرى لاحقاً.'
          : 'Sorry, the chat service is experiencing issues. Please try again later.',
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, language, userRole, userId]);

  /**
   * Send a quick question
   */
  const sendQuickQuestion = useCallback((question: string) => {
    sendMessage(question);
  }, [sendMessage]);

  /**
   * Get AI conversation history for live agent handoff
   */
  const getAIHistory = useCallback((): AIConversationMessage[] => {
    return ChatbotService.convertToAIHistory(messages);
  }, [messages]);

  /**
   * Get the first user message (for subject line)
   */
  const getFirstUserMessage = useCallback((): string => {
    const firstUserMsg = messages.find(m => m.isUser);
    return firstUserMsg?.text || (language === 'ar' ? 'طلب دعم' : 'Support request');
  }, [messages, language]);

  /**
   * Clear chat and start over
   */
  const resetChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        text: ChatbotService.getWelcomeMessage(language),
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    setConversationId(undefined);
    setError(null);
  }, [language]);

  /**
   * Load chat history
   */
  const loadHistory = useCallback(async (convId: string) => {
    try {
      setLoading(true);
      const history = await ChatbotService.getChatHistory(convId);
      if (history.length > 0) {
        setMessages(history);
        setConversationId(convId);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    messages,
    setMessages,
    loading,
    error,
    conversationId,
    sendMessage,
    sendQuickQuestion,
    getAIHistory,
    getFirstUserMessage,
    resetChat,
    loadHistory,
    quickQuestions: ChatbotService.getQuickQuestions(language),
  };
};

export default useChatbot;
