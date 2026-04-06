// SupportChatScreen - Live Agent Chat Interface
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
  ActivityIndicator,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useLiveAgent } from '../hooks/useLiveAgent';
import { AIConversationMessage, SupportChatMessage } from '../types/chat';
import StreamingMessage from '../components/StreamingMessage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import VoiceNoteService from '../services/VoiceNoteService';

const { width: screenWidth } = Dimensions.get('window');

interface SupportChatScreenProps {
  onBack?: () => void;
  initialSubject?: string;
  aiHistory?: AIConversationMessage[];
  language?: 'en' | 'ar';
}

// File Attachment Component
const FileAttachment: React.FC<{
  fileUrl: string | null | undefined;
  fileType: string | null | undefined;
  fileName?: string | null;
  duration?: number | null;
  isMine: boolean;
  colors: any;
}> = ({ fileUrl, fileType, fileName, duration, isMine, colors }) => {
  const isImage = fileType === 'image' || (fileUrl && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileUrl));
  const isVoice = fileType === 'voice' || (fileUrl && /\.(mp3|m4a|wav|ogg|aac)$/i.test(fileUrl));
  const isDocument = fileType === 'document' || (!isImage && !isVoice);

  const handlePress = () => {
    if (fileUrl && fileUrl !== 'pending') {
      // Open file viewer - in a real app, use a file viewer library
      console.log('Opening file:', fileUrl);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (fileUrl === 'pending') {
    return (
      <View style={[styles.attachmentContainer, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : colors.gray200 }]}>
        <ActivityIndicator size="small" color={isMine ? '#fff' : colors.primary} />
        <Text style={[styles.attachmentText, { color: isMine ? '#fff' : colors.text, marginLeft: 8 }]}>
          Uploading...
        </Text>
      </View>
    );
  }

  if (isImage && fileUrl) {
    const fullUrl = fileUrl.startsWith('http') ? fileUrl : `https://your-domain.com${fileUrl}`;
    return (
      <TouchableOpacity onPress={handlePress} style={styles.imageAttachment}>
        <Image
          source={{ uri: fullUrl }}
          style={styles.imageThumbnail}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  if (isVoice && fileUrl) {
    return (
      <TouchableOpacity 
        onPress={handlePress}
        style={[styles.attachmentContainer, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : colors.gray200 }]}
      >
        <MaterialIcons name="mic" size={20} color={isMine ? '#fff' : colors.primary} />
        <Text style={[styles.attachmentText, { color: isMine ? '#fff' : colors.text, marginLeft: 8 }]}>
          Voice Note {duration ? `(${formatDuration(duration)})` : ''}
        </Text>
        <MaterialIcons name="play-arrow" size={20} color={isMine ? '#fff' : colors.primary} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[styles.attachmentContainer, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : colors.gray200 }]}
    >
      <MaterialIcons name="insert-drive-file" size={20} color={isMine ? '#fff' : colors.primary} />
      <Text 
        style={[styles.attachmentText, { color: isMine ? '#fff' : colors.text, marginLeft: 8 }]} 
        numberOfLines={1}
      >
        {fileName || 'Document'}
      </Text>
      <MaterialIcons name="open-in-new" size={16} color={isMine ? '#fff' : colors.primary} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
};

// Chat Message Component
const ChatMessageItem: React.FC<{ 
  message: SupportChatMessage; 
  isDarkMode: boolean; 
  colors: any;
  isRTL: boolean;
}> = ({ message, isDarkMode, colors, isRTL }) => {
  const isMine = message.isMine;
  const hasAttachment = message.fileUrl || message.fileType;
  
  return (
    <View
      style={[
        styles.messageContainer,
        isMine ? styles.myMessageContainer : styles.agentMessageContainer,
      ]}
    >
      {!isMine && (
        <View style={[styles.agentAvatar, { backgroundColor: colors.success + '20' }]}>
          <MaterialCommunityIcons name="headset" size={18} color={colors.success} />
        </View>
      )}
      <View style={styles.messageContent}>
        {!isMine && (
          <Text style={[styles.senderName, { color: colors.success }]}>
            {message.senderName}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isMine
              ? [styles.myBubble, { backgroundColor: colors.primary }]
              : [styles.agentBubble, { 
                  backgroundColor: isDarkMode ? colors.cardBackground : '#fff',
                  borderColor: isDarkMode ? colors.gray700 : '#e0e0e0',
                }],
          ]}
        >
          {hasAttachment && (
            <FileAttachment
              fileUrl={message.fileUrl}
              fileType={message.fileType}
              fileName={message.fileName}
              duration={message.duration}
              isMine={isMine}
              colors={colors}
            />
          )}
          {message.content && message.content !== '[Attachment]' && (
            <Text
              style={[
                styles.messageText,
                isMine ? styles.myText : [styles.agentText, { color: colors.text }],
                hasAttachment && { marginTop: 8 },
              ]}
            >
              {message.content}
            </Text>
          )}
          <Text style={[styles.messageTime, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.gray500 }]}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Status Banner Component
const StatusBanner: React.FC<{ 
  status: string; 
  statusText: string; 
  isDarkMode: boolean; 
  colors: any;
  agentName?: string | null;
}> = ({ status, statusText, isDarkMode, colors, agentName }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return colors.success;
      case 'PENDING':
        return colors.warning;
      case 'RESOLVED':
      case 'CLOSED':
        return colors.gray500;
      default:
        return colors.primary;
    }
  };

  const statusColor = getStatusColor();

  return (
    <View style={[styles.statusBanner, { backgroundColor: statusColor + '15' }]}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <Text style={[styles.statusText, { color: statusColor }]}>
        {statusText}
        {agentName && (status === 'ASSIGNED' || status === 'IN_PROGRESS') ? ` - ${agentName}` : ''}
      </Text>
    </View>
  );
};

const SupportChatScreen: React.FC<SupportChatScreenProps> = ({
  onBack,
  initialSubject,
  aiHistory = [],
  language: propLanguage,
}) => {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const language = propLanguage || (i18n.language === 'ar' ? 'ar' : 'en');
  const isRTL = language === 'ar';

  const {
    status,
    agentName,
    agentId,
    requestId,
    messages,
    isConnected,
    connectionError,
    isTyping,
    requestAgent,
    sendMessage,
    sendMessageWithFile,
    cancelRequest,
    statusText,
    canChat,
    isFinalStatus,
  } = useLiveAgent({ language });

  const [inputText, setInputText] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const hasRequestedRef = useRef(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  // Request agent on mount if not already requested
  useEffect(() => {
    const initRequest = async () => {
      if (!hasRequestedRef.current && status === 'IDLE' && initialSubject) {
        hasRequestedRef.current = true;
        setIsRequesting(true);
        await requestAgent(initialSubject, aiHistory);
        setIsRequesting(false);
      }
    };
    initRequest();
  }, [initialSubject, aiHistory, requestAgent, status]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (inputText.trim() && isConnected && canChat) {
      sendMessage(inputText);
      setInputText('');
    }
  }, [inputText, isConnected, canChat, sendMessage]);

  // Handle file attachment
  const handleAttachmentPress = useCallback(async () => {
    if (isUploadingFile || isRecordingVoice || !canChat || !agentId) return;

    try {
      // Show attachment options
      Alert.alert(
        language === 'ar' ? 'إرفاق ملف' : 'Attach File',
        '',
        [
          {
            text: language === 'ar' ? 'الكاميرا' : 'Camera',
            onPress: handleCameraPress,
          },
          {
            text: language === 'ar' ? 'معرض الصور' : 'Photo Library',
            onPress: handleImageLibraryPress,
          },
          {
            text: language === 'ar' ? 'مستند' : 'Document',
            onPress: handleDocumentPress,
          },
          {
            text: language === 'ar' ? 'إلغاء' : 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('❌ Attachment picker error:', error);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'فشل اختيار الملف' : 'Failed to select file'
      );
    }
  }, [isUploadingFile, isRecordingVoice, canChat, agentId, language]);

  // Handle camera
  const handleCameraPress = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'ar' ? 'إذن مطلوب' : 'Permission Required',
          language === 'ar' ? 'نحتاج إذن الكاميرا لالتقاط الصور' : 'We need camera permission to take photos'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        await uploadFile({
          uri: asset.uri,
          type: 'image/jpeg',
          name: asset.fileName || `photo-${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
    }
  }, [language]);

  // Handle image library
  const handleImageLibraryPress = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'ar' ? 'إذن مطلوب' : 'Permission Required',
          language === 'ar' ? 'نحتاج إذن الوصول إلى الصور' : 'We need access to your photos'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        await uploadFile({
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || `image-${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error('❌ Image library error:', error);
    }
  }, [language]);

  // Handle document picker
  const handleDocumentPress = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      await uploadFile({
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        name: asset.name || `document-${Date.now()}`,
      });
    } catch (error) {
      console.error('❌ Document picker error:', error);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'فشل اختيار المستند' : 'Failed to select document'
      );
    }
  }, [language]);

  // Upload file
  const uploadFile = useCallback(async (file: { uri: string; type: string; name: string }) => {
    if (!agentId || !requestId) {
      console.error('❌ Cannot upload file: missing agentId or requestId');
      return;
    }

    setIsUploadingFile(true);
    try {
      const content = inputText.trim();
      const success = await sendMessageWithFile({
        receiverId: agentId,
        content: content || '',
        file: {
          uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
          type: file.type,
          name: file.name,
        },
        requestId: requestId,
      });

      if (success && content) {
        setInputText('');
      }
    } catch (error) {
      console.error('❌ File upload error:', error);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'فشل رفع الملف' : 'Failed to upload file'
      );
    } finally {
      setIsUploadingFile(false);
    }
  }, [agentId, requestId, inputText, sendMessageWithFile, language]);

  // Handle voice note recording
  const handleVoicePress = useCallback(async () => {
    if (isRecordingVoice) {
      // Stop recording
      try {
        const result = await VoiceNoteService.stopRecording();
        setIsRecordingVoice(false);
        setRecordingDuration(0);

        if (result && agentId && requestId) {
          const fileName = `voice_${Date.now()}.m4a`;
          await sendMessageWithFile({
            receiverId: agentId,
            content: '',
            file: {
              uri: Platform.OS === 'ios' ? result.uri.replace('file://', '') : result.uri,
              type: 'audio/m4a',
              name: fileName,
            },
            requestId: requestId,
            duration: result.duration,
          });
        }
      } catch (error) {
        console.error('❌ Voice stop error:', error);
      }
    } else {
      // Start recording
      try {
        const started = await VoiceNoteService.startRecording((duration) => {
          setRecordingDuration(duration);
        });
        if (started) {
          setIsRecordingVoice(true);
        }
      } catch (error) {
        console.error('❌ Voice start error:', error);
        Alert.alert(
          language === 'ar' ? 'خطأ' : 'Error',
          language === 'ar' ? 'فشل بدء التسجيل' : 'Failed to start recording'
        );
      }
    }
  }, [isRecordingVoice, agentId, requestId, language]);

  const handleCancelRequest = useCallback(() => {
    Alert.alert(
      language === 'ar' ? 'Cancel Request' : 'Cancel Request',
      language === 'ar' 
        ? 'Are you sure you want to cancel your support request?'
        : 'Are you sure you want to cancel your support request?',
      [
        { text: language === 'ar' ? 'No' : 'No', style: 'cancel' },
        {
          text: language === 'ar' ? 'Yes' : 'Yes',
          style: 'destructive',
          onPress: async () => {
            await cancelRequest();
            onBack?.();
          },
        },
      ]
    );
  }, [cancelRequest, language, onBack]);

  // Find last agent message index for streaming effect
  const lastAgentMessageIndex = messages.length - 1 - [...messages].reverse().findIndex(m => !m.isMine);

  const renderMessage = useCallback(({ item, index }: { item: any; index: number }) => {
    // Use streaming effect for the last agent message
    const isLastAgentMessage = index === lastAgentMessageIndex && !item.isMine;

    if (isLastAgentMessage && !item.isMine) {
      return (
        <StreamingMessage
          text={item.content}
          isUser={false}
          timestamp={new Date(item.createdAt)}
          colors={colors}
          isDarkMode={isDarkMode}
          avatar={
            <View style={[styles.agentAvatar, { backgroundColor: colors.success + '20' }]}>
              <MaterialCommunityIcons name="headset" size={18} color={colors.success} />
            </View>
          }
        />
      );
    }

    return (
      <ChatMessageItem
        message={item}
        isDarkMode={isDarkMode}
        colors={colors}
        isRTL={isRTL}
      />
    );
  }, [isDarkMode, colors, isRTL, lastAgentMessageIndex]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {isRequesting ? (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyStateText, { color: colors.gray500, marginTop: 16 }]}>
            {language === 'ar' 
              ? 'Connecting you to a support agent...'
              : 'Connecting you to a support agent...'}
          </Text>
        </>
      ) : status === 'PENDING' ? (
        <>
          <MaterialCommunityIcons name="clock-outline" size={48} color={colors.warning} />
          <Text style={[styles.emptyStateText, { color: colors.gray500, marginTop: 16 }]}>
            {language === 'ar'
              ? 'Waiting for an available agent...'
              : 'Waiting for an available agent...'}
          </Text>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.error }]}
            onPress={handleCancelRequest}
          >
            <Text style={[styles.cancelButtonText, { color: colors.error }]}>
              {language === 'ar' ? 'Cancel Request' : 'Cancel Request'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <MaterialCommunityIcons name="chat-processing-outline" size={48} color={colors.gray400} />
          <Text style={[styles.emptyStateText, { color: colors.gray500, marginTop: 16 }]}>
            {language === 'ar' ? 'Start the conversation' : 'Start the conversation'}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: colors.cardBackground,
        borderBottomColor: colors.border
      }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backButton, language === 'ar' && { marginLeft: 'auto' }]}>
          <BackArrowIonicons variant="chevron" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.supportIcon, {
            backgroundColor: colors.success + '20'
          }]}>
            <MaterialCommunityIcons name="headset" size={24} color={colors.success} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {language === 'ar' ? 'Live Support' : 'Live Support'}
            </Text>
            <View style={styles.connectionIndicator}>
              <View style={[styles.connectionDot, {
                backgroundColor: isConnected ? '#10b981' : colors.warning
              }]} />
              <Text style={[styles.connectionText, {
                color: colors.gray500
              }]}>
                {isConnected
                  ? (language === 'ar' ? 'Connected' : 'Connected')
                  : (language === 'ar' ? 'Connecting...' : 'Connecting...')
                }
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={handleCancelRequest} style={styles.closeButton}>
          <Feather name="x" size={22} color={colors.gray500} />
        </TouchableOpacity>
      </View>

      {/* Status Banner */}
      <StatusBanner 
        status={status}
        statusText={statusText}
        isDarkMode={isDarkMode}
        colors={colors}
        agentName={agentName}
      />

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        inverted={false}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={[styles.typingContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.typingBubble, { backgroundColor: isDarkMode ? colors.cardBackground : '#fff' }]}>
            <Text style={[styles.typingText, { color: colors.gray500 }]}>
              {agentName || (language === 'ar' ? 'Agent' : 'Agent')} {language === 'ar' ? 'is typing...' : 'is typing...'}
            </Text>
            <View style={styles.typingDots}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
            </View>
          </View>
        </View>
      )}

      {/* Connection Error */}
      {connectionError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
          <Ionicons name="warning-outline" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {connectionError}
          </Text>
        </View>
      )}

      {/* Voice Recording Indicator */}
      {isRecordingVoice && (
        <View style={[styles.recordingIndicator, { backgroundColor: colors.error + '15' }]}>
          <View style={styles.recordingDot} />
          <Text style={[styles.recordingText, { color: colors.error }]}>
            {language === 'ar' ? 'جاري التسجيل...' : 'Recording...'} {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
          </Text>
          <TouchableOpacity onPress={handleVoicePress} style={styles.stopRecordingButton}>
            <MaterialIcons name="stop" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* File Uploading Indicator */}
      {isUploadingFile && (
        <View style={[styles.uploadingIndicator, { backgroundColor: colors.primary + '10' }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.uploadingText, { color: colors.primary, marginLeft: 8 }]}>
            {language === 'ar' ? 'جاري رفع الملف...' : 'Uploading file...'}
          </Text>
        </View>
      )}

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        {/* Attachment Button */}
        <TouchableOpacity
          style={[styles.attachmentButton, { opacity: canChat && !isRecordingVoice ? 1 : 0.5 }]}
          onPress={handleAttachmentPress}
          disabled={!canChat || isRecordingVoice || isUploadingFile}
        >
          <MaterialIcons name="attach-file" size={24} color={colors.gray500} />
        </TouchableOpacity>

        {/* Voice Button or Text Input */}
        {inputText.trim() ? (
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? colors.gray100 : '#f1f5f9',
                color: colors.text,
                opacity: canChat ? 1 : 0.5,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              canChat
                ? (language === 'ar' ? 'Type your message...' : 'Type your message...')
                : (language === 'ar' ? 'Waiting for agent...' : 'Waiting for agent...')
            }
            placeholderTextColor={colors.gray500}
            multiline
            maxLength={500}
            editable={canChat}
            textAlign={isRTL ? 'right' : 'left'}
          />
        ) : (
          <TouchableOpacity
            style={[styles.voiceButtonContainer, { backgroundColor: isDarkMode ? colors.gray100 : '#f1f5f9' }]}
            onPress={handleVoicePress}
            disabled={!canChat || isUploadingFile}
            activeOpacity={0.7}
          >
            <MaterialIcons name="mic" size={24} color={canChat && !isUploadingFile ? colors.primary : colors.gray400} />
            <Text style={[styles.voiceButtonText, { color: canChat && !isUploadingFile ? colors.text : colors.gray400 }]}>
              {language === 'ar' ? 'اضغط للتسجيل' : 'Hold to record'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() && canChat ? colors.primary : colors.gray400,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || !canChat}
        >
          <Ionicons
            name={isRTL ? 'arrow-back' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
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
  closeButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  supportIcon: {
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
  connectionIndicator: {
    alignItems: 'center',
    marginTop: 2,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  agentMessageContainer: {
    alignSelf: 'flex-start',
  },
  agentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  messageContent: {
    maxWidth: screenWidth * 0.7,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#fff',
  },
  agentText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingText: {
    fontSize: 12,
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
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
  attachmentButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  voiceButtonContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 44,
  },
  voiceButtonText: {
    fontSize: 15,
    marginLeft: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  stopRecordingButton: {
    padding: 8,
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // File Attachment Styles
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  attachmentText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  imageAttachment: {
    marginBottom: 4,
  },
  imageThumbnail: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
});

export default SupportChatScreen;
