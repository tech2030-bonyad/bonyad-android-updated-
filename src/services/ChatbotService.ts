// 🤖 Chatbot Service - AI Support Chat API Integration
import { getChatbotChatUrl, getChatbotHistoryUrl } from '../config/api';
import { storage } from '../utils/storage';
import { ChatbotResponse, AIConversationMessage, ChatbotMessage } from '../types/chat';

class ChatbotService {
  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await storage.getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
  }

  /**
   * Send message to AI Chatbot
   */
  async sendMessage(
    message: string,
    conversationId?: string,
    options?: { userType?: 'USER' | 'TECHNICIAN'; language?: string; userId?: number | null }
  ): Promise<ChatbotResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        getChatbotChatUrl(),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await storage.getAuthToken() || ''}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({
            message: message.trim(),
            conversationId: conversationId || undefined,
            userType: options?.userType ?? 'USER',
            language: options?.language ?? 'en',
            ...(options?.userId != null && options.userId > 0 ? { userId: String(options.userId) } : {}),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Chatbot API error:', errorText);
        throw new Error(`Chatbot API error: ${response.status}`);
      }

      const rawData = await response.json();
      console.log('📥 Chatbot raw response:', JSON.stringify(rawData, null, 2));
      
      // Handle different response formats
      const data: ChatbotResponse = {
        response: rawData.response || rawData.message || rawData.text || rawData.answer || 'No response',
        conversationId: rawData.conversationId || rawData.conversation_id || rawData.id || '',
        timestamp: rawData.timestamp || rawData.created_at || new Date().toISOString(),
      };
      
      console.log('✅ Chatbot parsed response:', data);
      return data;
    } catch (error) {
      console.error('❌ Error sending message to chatbot:', error);
      throw error;
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(conversationId: string): Promise<ChatbotMessage[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        getChatbotHistoryUrl(conversationId),
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch chat history: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('❌ Error fetching chat history:', error);
      return [];
    }
  }

  /**
   * Convert chat messages to AI conversation history format
   */
  convertToAIHistory(messages: ChatbotMessage[]): AIConversationMessage[] {
    return messages
      .filter(msg => msg.text && msg.text.trim())
      .map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp.toISOString(),
      }));
  }

  /**
   * Get welcome message based on language
   */
  getWelcomeMessage(language: 'en' | 'ar' = 'en'): string {
    return language === 'ar'
      ? 'مرحباً! أنا مساعد بُنْيَة الذكي. كيف يمكنني مساعدتك اليوم؟'
      : "Hello! I'm Bonyad AI Assistant. How can I help you today?";
  }

  /**
   * Get suggested quick questions
   */
  getQuickQuestions(language: 'en' | 'ar' = 'en'): string[] {
    if (language === 'ar') {
      return [
        'كيف أنشئ مشروعاً جديداً؟',
        'كيف أجد فنيين موثوقين؟',
        'ما هي طرق الدفع المتاحة؟',
        'كيف أتابع مشروعي؟',
      ];
    }
    return [
      'How do I create a new project?',
      'How do I find reliable technicians?',
      'What payment methods are available?',
      'How do I track my project?',
    ];
  }
}

export default new ChatbotService();
