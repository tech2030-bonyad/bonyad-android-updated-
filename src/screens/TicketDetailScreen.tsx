// 🎫 TicketDetailScreen - View Ticket Details & Chat
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import SupportTicketService from '../services/SupportTicketService';
import { SupportTicket, TicketRating } from '../types/chat';

interface TicketDetailScreenProps {
  ticketId: number;
  onBack?: () => void;
  onNavigateToChat?: (roomId: string, adminName: string) => void;
}

const StarRating: React.FC<{
  rating: number;
  onRate: (rating: number) => void;
  colors: any;
  disabled?: boolean;
}> = ({ rating, onRate, colors, disabled }) => (
  <View style={styles.starContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => !disabled && onRate(star)}
        disabled={disabled}
        style={styles.starButton}
      >
        <Ionicons
          name={star <= rating ? 'star' : 'star-outline'}
          size={32}
          color={star <= rating ? '#fbbf24' : colors.textTertiary}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const TicketDetailScreen: React.FC<TicketDetailScreenProps> = ({
  ticketId,
  onBack,
  onNavigateToChat,
}) => {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const language = i18n.language === 'ar' ? 'ar' : 'en';

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    loadTicketDetails();
  }, [ticketId]);

  const loadTicketDetails = async () => {
    setLoading(true);
    try {
      const data = await SupportTicketService.getTicketDetails(ticketId);
      if (data) {
        setTicket(data);
        if (data.rating) {
          setRating(data.rating);
          setFeedback(data.feedback || '');
        }
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async () => {
    if (rating === 0) {
      Alert.alert('Error', language === 'ar' ? 'الرجاء تحديد التقييم' : 'Please select a rating');
      return;
    }

    setSubmittingRating(true);
    try {
      const success = await SupportTicketService.rateTicket(ticketId, { rating, feedback });
      if (success) {
        Alert.alert(
          'Success',
          language === 'ar' ? 'تم إرسال التقييم بنجاح' : 'Rating submitted successfully'
        );
      }
    } catch (error) {
      Alert.alert('Error', language === 'ar' ? 'فشل في إرسال التقييم' : 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleCloseTicket = () => {
    Alert.alert(
      language === 'ar' ? 'إغلاق التذكرة' : 'Close Ticket',
      language === 'ar' 
        ? 'هل أنت متأكد من إغلاق هذه التذكرة؟'
        : 'Are you sure you want to close this ticket?',
      [
        { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: language === 'ar' ? 'إغلاق' : 'Close',
          style: 'destructive',
          onPress: async () => {
            const success = await SupportTicketService.closeTicket(ticketId);
            if (success) {
              loadTicketDetails();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Ticket not found</Text>
      </View>
    );
  }

  const getStatusColor = SupportTicketService.getStatusColor(ticket.status);
  const getPriorityColor = SupportTicketService.getPriorityColor(ticket.priority);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor }]} />
              <Text style={[styles.statusText, { color: getStatusColor }]}>
                {SupportTicketService.getStatusText(ticket.status, language)}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor + '15' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor }]}>
                {SupportTicketService.getPriorityText(ticket.priority, language)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Ionicons name="folder-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'الفئة:' : 'Category:'}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {SupportTicketService.getCategoryText(ticket.category, language)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {new Date(ticket.createdAt).toLocaleString()}
            </Text>
          </View>

          {ticket.assignedAdminName && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {language === 'ar' ? 'المسؤول:' : 'Agent:'}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {ticket.assignedAdminName}
              </Text>
            </View>
          )}
        </View>

        {/* Description Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {language === 'ar' ? 'الوصف' : 'Description'}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {ticket.description}
          </Text>
        </View>

        {/* Attachments */}
        {ticket.attachmentUrls && ticket.attachmentUrls.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'المرفقات' : 'Attachments'}
            </Text>
            <View style={styles.attachmentsList}>
              {ticket.attachmentUrls.map((url, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.attachmentItem, { backgroundColor: colors.background }]}
                  onPress={() => {
                    const { Linking } = require('react-native');
                    Linking.canOpenURL(url).then((supported: boolean) => {
                      if (supported) {
                        Linking.openURL(url);
                      }
                    });
                  }}
                >
                  <Ionicons 
                    name={url.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image-outline' : 'document-outline'} 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                    {language === 'ar' ? `ملف ${index + 1}` : `File ${index + 1}`}
                  </Text>
                  <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Message History with Attachments */}
        {ticket.messages && ticket.messages.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'سجل المحادثة' : 'Conversation History'}
            </Text>
            {ticket.messages.map((message, index) => (
              <View key={message.id} style={[
                styles.messageItem,
                index > 0 && styles.messageItemBorder,
                index > 0 && { borderTopColor: colors.border }
              ]}>
                {/* Message Header */}
                <View style={styles.messageHeader}>
                  <View style={styles.messageSender}>
                    <Ionicons 
                      name={message.isAdminMessage ? 'shield-checkmark' : 'person'} 
                      size={16} 
                      color={message.isAdminMessage ? colors.success : colors.primary} 
                    />
                    <Text style={[styles.messageSenderName, { color: colors.text }]}>
                      {message.senderName}
                    </Text>
                    {message.isAdminMessage && (
                      <View style={[styles.adminBadge, { backgroundColor: colors.success + '20' }]}>
                        <Text style={[styles.adminBadgeText, { color: colors.success }]}>
                          {language === 'ar' ? 'دعم' : 'Support'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.messageTime, { color: colors.textTertiary }]}>
                    {new Date(message.createdAt).toLocaleString()}
                  </Text>
                </View>

                {/* Message Content */}
                <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                  {message.message}
                </Text>

                {/* Message Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <View style={styles.messageAttachments}>
                    <Text style={[styles.attachmentsLabel, { color: colors.textTertiary }]}>
                      {language === 'ar' ? 'المرفقات:' : 'Attachments:'}
                    </Text>
                    {message.attachments.map((url, fileIndex) => (
                      <TouchableOpacity
                        key={fileIndex}
                        style={[styles.attachmentItem, { backgroundColor: colors.background }]}
                        onPress={() => {
                          const { Linking } = require('react-native');
                          Linking.canOpenURL(url).then((supported: boolean) => {
                            if (supported) {
                              Linking.openURL(url);
                            }
                          });
                        }}
                      >
                        <Ionicons 
                          name={url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image-outline' : 'document-outline'} 
                          size={20} 
                          color={colors.primary} 
                        />
                        <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                          {language === 'ar' ? `ملف ${fileIndex + 1}` : `File ${fileIndex + 1}`}
                        </Text>
                        <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Chat Button */}
        {ticket.chatRoomRoomId && (
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: colors.primary }]}
            onPress={() => onNavigateToChat?.(ticket.chatRoomRoomId!, ticket.assignedAdminName || 'Support')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles" size={24} color="#fff" />
            <Text style={styles.chatButtonText}>
              {language === 'ar' ? 'الدردشة مع الدعم' : 'Chat with Support'}
            </Text>
            {ticket.hasUnreadMessages && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>NEW</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Rating Section - Only for RESOLVED tickets */}
        {ticket.status === 'RESOLVED' && !ticket.rating && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'قيم الدعم' : 'Rate Support'}
            </Text>
            <Text style={[styles.ratingSubtitle, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'كيف كانت تجربتك؟' : 'How was your experience?'}
            </Text>
            
            <StarRating rating={rating} onRate={setRating} colors={colors} />
            
            <TextInput
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: isDarkMode ? colors.background : '#f9fafb',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={feedback}
              onChangeText={setFeedback}
              placeholder={language === 'ar' ? 'تعليقات إضافية (اختياري)' : 'Additional feedback (optional)'}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity
              style={[
                styles.rateButton,
                { backgroundColor: colors.success },
                submittingRating && { opacity: 0.7 },
              ]}
              onPress={handleRate}
              disabled={submittingRating}
            >
              <Text style={styles.rateButtonText}>
                {language === 'ar' ? 'إرسال التقييم' : 'Submit Rating'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Show existing rating */}
        {ticket.rating && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'تقييمك' : 'Your Rating'}
            </Text>
            <StarRating rating={ticket.rating} onRate={() => {}} colors={colors} disabled />
            {ticket.feedback && (
              <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
                "{ticket.feedback}"
              </Text>
            )}
          </View>
        )}

        {/* Close Ticket Button */}
        {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
          <TouchableOpacity
            style={[styles.closeButton, { borderColor: colors.error }]}
            onPress={handleCloseTicket}
          >
            <Ionicons name="close-circle-outline" size={20} color={colors.error} />
            <Text style={[styles.closeButtonText, { color: colors.error }]}>
              {language === 'ar' ? 'إغلاق التذكرة' : 'Close Ticket'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  attachmentsList: {
    gap: 10,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  ratingSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  feedbackInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    height: 100,
    marginBottom: 16,
  },
  rateButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 12,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
    gap: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Message History Styles
  messageItem: {
    paddingVertical: 16,
  },
  messageItemBorder: {
    borderTopWidth: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageSender: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageSenderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  messageTime: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  messageAttachments: {
    marginTop: 8,
  },
  attachmentsLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
});

export default TicketDetailScreen;
