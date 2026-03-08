// 👨‍💼 useLiveAgent Hook - Manage Live Agent State and MQTT Connection
import { useState, useEffect, useRef, useCallback } from 'react';
import LiveAgentService from '../services/LiveAgentService';
import MqttChatService from '../services/MqttChatService';
import { 
  LiveAgentRequest, 
  SupportChatMessage, 
  AIConversationMessage,
  LiveAgentStatus,
  SendMessageWithFileRequest
} from '../types/chat';

interface UseLiveAgentOptions {
  language?: 'en' | 'ar';
  pollInterval?: number;
}

export const useLiveAgent = (options: UseLiveAgentOptions = {}) => {
  const { language = 'en', pollInterval = 3000 } = options;
  
  const [requestId, setRequestId] = useState<number | null>(null);
  const [status, setStatus] = useState<LiveAgentStatus>('IDLE');
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [numericRoomId, setNumericRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Request a live agent
   */
  const requestAgent = useCallback(async (
    subject: string,
    aiHistory: AIConversationMessage[],
    description?: string
  ): Promise<boolean> => {
    try {
      setStatus('PENDING');
      setConnectionError(null);
      
      const request = await LiveAgentService.requestLiveAgent(
        subject,
        aiHistory,
        description
      );
      
      setRequestId(request.id);
      setStatus(request.status);
      setRoomId(request.chatRoomRoomId);
      setNumericRoomId(request.chatRoomId);
      
      return true;
    } catch (error) {
      console.error('Error requesting agent:', error);
      setStatus('IDLE');
      setConnectionError(language === 'ar'
        ? 'فشل في طلب المندوب. يرجى المحاولة مرة أخرى.'
        : 'Failed to request agent. Please try again.'
      );
      return false;
    }
  }, [language]);

  /**
   * Poll for agent assignment
   */
  useEffect(() => {
    if (!requestId || status === 'ASSIGNED' || status === 'IN_PROGRESS' || LiveAgentService.isFinalStatus(status)) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const details = await LiveAgentService.getRequestDetails(requestId);
        setStatus(details.status);
        
        if (details.assignedAdminName) {
          setAgentName(details.assignedAdminName);
        }
        if (details.assignedAdminId) {
          setAgentId(details.assignedAdminId);
        }
        
        if (details.status === 'ASSIGNED' || details.status === 'IN_PROGRESS') {
          if (details.chatRoomRoomId) {
            setRoomId(details.chatRoomRoomId);
            setNumericRoomId(details.chatRoomId);
            // Connect to MQTT when assigned
            await connectToChat(details.chatRoomRoomId);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Start polling
    pollingRef.current = setInterval(poll, pollInterval);
    poll(); // Initial check

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [requestId, status, pollInterval]);

  /**
   * Connect to MQTT chat
   */
  const connectToChat = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      setConnectionError(null);
      
      const connected = await MqttChatService.subscribeToRoomWithCallbacks(
        roomId,
        {
          onMessage: (message) => {
            const supportMessage: SupportChatMessage = {
              id: message.id,
              senderId: message.senderId,
              senderName: message.senderName,
              content: message.content,
              createdAt: message.createdAt,
              isMine: message.isMine || false,
              fileUrl: message.fileUrl,
              fileType: message.fileType,
            };
            setMessages(prev => [...prev, supportMessage]);
          },
          onReadReceipt: (messageId, isRead) => {
            console.log('Message read:', messageId, isRead);
          },
          onTyping: (data) => {
            if (data.userId !== agentId) return;
            setIsTyping(data.isTyping);
          },
        }
      );

      if (connected) {
        setIsConnected(true);
        // Load existing messages
        if (numericRoomId) {
          const history = await LiveAgentService.getChatMessages(numericRoomId);
          setMessages(history);
        }
        return true;
      } else {
        setConnectionError(language === 'ar'
          ? 'فشل الاتصال بالدردشة. جاري المحاولة...'
          : 'Failed to connect to chat. Retrying...'
        );
        return false;
      }
    } catch (error) {
      console.error('Error connecting to chat:', error);
      setConnectionError(language === 'ar'
        ? 'خطأ في الاتصال'
        : 'Connection error'
      );
      return false;
    }
  }, [numericRoomId, agentId, language]);

  /**
   * Send message via MQTT
   */
  const sendMessage = useCallback((content: string) => {
    if (!isConnected || !roomId) {
      console.error('Not connected to chat');
      return;
    }

    // Publish typing stopped
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Optimistically add message
    const optimisticMessage: SupportChatMessage = {
      id: Date.now(),
      senderId: 0, // Current user
      senderName: language === 'ar' ? 'أنت' : 'You',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      isMine: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    // Send via REST as fallback (more reliable than MQTT for individual messages)
    if (numericRoomId) {
      LiveAgentService.sendMessage(numericRoomId, content).catch(error => {
        console.error('Error sending message:', error);
      });
    }
  }, [isConnected, roomId, numericRoomId, language]);

  /**
   * Send message with file attachment
   */
  const sendMessageWithFile = useCallback(async (request: SendMessageWithFileRequest): Promise<boolean> => {
    if (!requestId || !agentId) {
      console.error('❌ [useLiveAgent] Cannot send file: no requestId or agentId');
      return false;
    }

    try {
      // Add the support request ID to the request
      const fileRequest: SendMessageWithFileRequest = {
        ...request,
        receiverId: agentId,
        requestId: requestId,
      };

      // Optimistically add message with file
      const optimisticMessage: SupportChatMessage = {
        id: Date.now(),
        senderId: 0, // Current user
        senderName: language === 'ar' ? 'أنت' : 'You',
        content: request.content || '[Attachment]',
        createdAt: new Date().toISOString(),
        isMine: true,
        fileUrl: request.file ? 'pending' : null,
        fileType: request.file?.type.startsWith('image/') ? 'image' 
          : request.file?.type.startsWith('audio/') ? 'voice' 
          : 'document',
        fileName: request.file?.name,
        duration: request.duration,
      };
      
      setMessages(prev => [...prev, optimisticMessage]);

      // Send via REST API
      const response = await LiveAgentService.sendMessageWithFile(fileRequest);
      
      if (response?.message) {
        // Update the optimistic message with the real one
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...response.message!, isMine: true }
            : msg
        ));
        return true;
      } else {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        return false;
      }
    } catch (error) {
      console.error('❌ [useLiveAgent] Error sending message with file:', error);
      return false;
    }
  }, [requestId, agentId, language]);

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!roomId || !numericRoomId) return;
    
    // Debounce typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        // Auto-stop typing after 3 seconds
      }, 3000);
    }
  }, [roomId, numericRoomId]);

  /**
   * Cancel support request
   */
  const cancelRequest = useCallback(async (): Promise<boolean> => {
    if (!requestId) return false;
    
    const success = await LiveAgentService.cancelRequest(requestId);
    if (success) {
      setStatus('CLOSED');
      disconnect();
    }
    return success;
  }, [requestId]);

  /**
   * Disconnect from chat
   */
  const disconnect = useCallback(() => {
    MqttChatService.disconnect();
    setIsConnected(false);
    setMessages([]);
    setIsTyping(false);
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    disconnect();
    setRequestId(null);
    setStatus('IDLE');
    setAgentName(null);
    setAgentId(null);
    setRoomId(null);
    setNumericRoomId(null);
    setConnectionError(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [disconnect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [disconnect]);

  return {
    // State
    requestId,
    status,
    agentName,
    agentId,
    roomId,
    numericRoomId,
    messages,
    isConnected,
    connectionError,
    isTyping,
    
    // Actions
    requestAgent,
    sendMessage,
    sendMessageWithFile,
    sendTypingIndicator,
    cancelRequest,
    disconnect,
    reset,
    
    // Helpers
    statusText: LiveAgentService.getStatusText(status, language),
    isFinalStatus: LiveAgentService.isFinalStatus(status),
    canChat: status === 'ASSIGNED' || status === 'IN_PROGRESS',
  };
};

export default useLiveAgent;
