// 👨‍💼 Live Agent Service - Support Request & Live Chat API Integration
import { API_BASE_URL, API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { 
  LiveAgentRequest, 
  AIConversationMessage, 
  SupportChatMessage,
  LiveAgentStatus,
  SendMessageWithFileResponse,
  SendMessageWithFileRequest
} from '../types/chat';

class LiveAgentService {
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
   * Request a live agent
   */
  async requestLiveAgent(
    subject: string,
    aiHistory: AIConversationMessage[],
    description?: string,
    category: string = 'General',
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'
  ): Promise<LiveAgentRequest> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SUPPORT.REQUESTS}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            subject: subject.trim(),
            description: description || 'Live agent requested from chatbot',
            category,
            priority,
            aiConversationHistory: aiHistory,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Live agent request error:', errorText);
        throw new Error(`Live agent request failed: ${response.status}`);
      }

      const data: LiveAgentRequest = await response.json();
      console.log('✅ Live agent requested:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error requesting live agent:', error);
      throw error;
    }
  }

  /**
   * Get request details (for polling)
   */
  async getRequestDetails(requestId: number): Promise<LiveAgentRequest> {
    try {
      const headers = await this.getAuthHeaders();
      const url = buildApiUrlWithParams(API_ENDPOINTS.SUPPORT.REQUEST_DETAILS, { id: requestId });
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch request details: ${response.status}`);
      }

      const data: LiveAgentRequest = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching request details:', error);
      throw error;
    }
  }

  /**
   * Get my support requests
   */
  async getMyRequests(): Promise<LiveAgentRequest[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SUPPORT.MY_REQUESTS}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.status}`);
      }

      const data = await response.json();
      return data.requests || [];
    } catch (error) {
      console.error('❌ Error fetching my requests:', error);
      return [];
    }
  }

  /**
   * Cancel support request
   */
  async cancelRequest(requestId: number): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const url = buildApiUrlWithParams(API_ENDPOINTS.SUPPORT.CANCEL_REQUEST, { id: requestId });
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel request: ${response.status}`);
      }

      console.log('✅ Support request cancelled:', requestId);
      return true;
    } catch (error) {
      console.error('❌ Error cancelling request:', error);
      return false;
    }
  }

  /**
   * Send message via REST (fallback when MQTT is not available)
   */
  async sendMessage(roomId: number, content: string): Promise<SupportChatMessage | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/chat/rooms/${roomId}/messages`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: content.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data: SupportChatMessage = await response.json();
      console.log('✅ Message sent via REST');
      return data;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return null;
    }
  }

  /**
   * Get chat messages for a room
   */
  async getChatMessages(roomId: number): Promise<SupportChatMessage[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/chat/rooms/${roomId}/messages`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('❌ Error fetching chat messages:', error);
      return [];
    }
  }

  /**
   * Send message with file attachment via /api/support/send-with-file
   * Used for support chat with file attachments (images, documents, voice notes)
   */
  async sendMessageWithFile(
    request: SendMessageWithFileRequest
  ): Promise<SendMessageWithFileResponse | null> {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('receiverId', String(request.receiverId));
      formData.append('content', request.content || '');
      
      if (request.requestId) {
        formData.append('requestId', String(request.requestId));
      }

      // Add duration for voice notes if available
      if (request.duration !== undefined && request.duration !== null) {
        formData.append('duration', String(request.duration));
      }

      // Append the file
      if (request.file) {
        formData.append('file', {
          uri: request.file.uri,
          type: request.file.type || 'application/octet-stream',
          name: request.file.name || `attachment-${Date.now()}`,
        } as any);
      }

      console.log('📤 [LiveAgentService] Sending message with file:', {
        receiverId: request.receiverId,
        contentLength: request.content?.length || 0,
        requestId: request.requestId,
        hasFile: !!request.file,
        fileName: request.file?.name,
        fileType: request.file?.type,
        duration: request.duration,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/support/send-with-file`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
          body: formData,
        }
      );

      console.log('📥 [LiveAgentService] Send with file response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [LiveAgentService] Send with file failed:', errorText);
        throw new Error(errorText || `Failed to send message with file: ${response.status}`);
      }

      const data: SendMessageWithFileResponse = await response.json();
      console.log('✅ [LiveAgentService] Message with file sent successfully:', {
        messageId: data.message?.id,
        fileType: data.message?.fileType,
      });

      return data;
    } catch (error) {
      console.error('❌ [LiveAgentService] Error sending message with file:', error);
      return null;
    }
  }

  /**
   * Check if request is in a final state
   */
  isFinalStatus(status: LiveAgentStatus): boolean {
    return status === 'RESOLVED' || status === 'CLOSED';
  }

  /**
   * Get status display text
   */
  getStatusText(status: LiveAgentStatus, language: 'en' | 'ar' = 'en'): string {
    const statusMap: Record<LiveAgentStatus, { en: string; ar: string }> = {
      IDLE: { en: 'Idle', ar: 'خامل' },
      PENDING: { en: 'Waiting for agent...', ar: 'في انتظار مندوب...' },
      ASSIGNED: { en: 'Agent assigned', ar: 'تم تعيين مندوب' },
      IN_PROGRESS: { en: 'In progress', ar: 'قيد التنفيذ' },
      RESOLVED: { en: 'Resolved', ar: 'تم الحل' },
      CLOSED: { en: 'Closed', ar: 'مغلق' },
    };
    return statusMap[status]?.[language] || status;
  }
}

export default new LiveAgentService();
