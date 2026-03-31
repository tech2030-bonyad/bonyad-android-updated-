/**
 * Ticket Detail Screen – same as web SupportTicketDetailScreen.
 * View ticket, messages, reply (text + optional file), resolve.
 * Chat happens in this screen via addMessage / sendMessageWithFile.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import * as SupportTicketService from '../services/SupportTicketService';
import type { SupportTicket, SupportTicketMessage } from '../types/chat';
import { buildAssetUrl } from '../config/api';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';

const SUPPORT_FILE_MAX_BYTES = 10 * 1024 * 1024; // 10MB

interface TicketDetailScreenProps {
  ticketId: number;
  onBack?: () => void;
}

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const TicketDetailScreen: React.FC<TicketDetailScreenProps> = ({ ticketId, onBack }) => {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const isRTL = language === 'ar';

  const formatDateLocalized = useCallback(
    (iso: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      // Use an Arabic locale to translate month names / digits when in AR.
      const locale = isRTL ? 'ar-SA' : 'en-US';
      return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
    },
    [isRTL],
  );

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [sendingFile, setSendingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [fileError, setFileError] = useState('');

  const loadTicketDetails = useCallback(async () => {
    try {
      const data = await SupportTicketService.getTicketDetails(ticketId);
      setTicket(data);
    } catch (error) {
      console.error('Error loading ticket:', error);
      setTicket(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    loadTicketDetails();
  }, [loadTicketDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTicketDetails();
  };

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || sending || !ticket) return;
    setSending(true);
    try {
      await SupportTicketService.addMessage(ticketId, text, []);
      setReplyText('');
      await loadTicketDetails();
    } catch (e) {
      console.error('Send reply error:', e);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (resolving || !ticket) return;
    setResolving(true);
    try {
      const updated = await SupportTicketService.resolveTicket(ticketId);
      setTicket(updated);
    } catch (e) {
      console.error('Resolve error:', e);
    } finally {
      setResolving(false);
    }
  };

  const receiverId = ticket
    ? (ticket.assignedAdminId ?? (ticket.messages || []).find((m: SupportTicketMessage) => m.senderId != null && m.senderId !== ticket.userId)?.senderId)
    : undefined;

  const pickDocument = async () => {
    setFileError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'audio/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const size = file.size ?? 0;
      if (size > SUPPORT_FILE_MAX_BYTES) {
        setFileError(t('support.fileTooLarge') || 'File must be under 10MB');
        return;
      }
      setSelectedFile({
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
        name: file.name || 'file',
      });
    } catch (e) {
      console.error('Document pick error:', e);
      setFileError(t('support.attachFailed') || 'Failed to pick file');
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile || !ticket || sendingFile) return;
    if (receiverId == null) {
      setFileError(t('support.noReceiverForFile') || 'Cannot send file until a support agent is assigned.');
      return;
    }
    setFileError('');
    setSendingFile(true);
    try {
      await SupportTicketService.sendMessageWithFile({
        requestId: ticketId,
        receiverId,
        content: replyText.trim() || undefined,
        file: selectedFile,
      });
      setSelectedFile(null);
      setReplyText('');
      await loadTicketDetails();
    } catch (e: any) {
      console.error('Send file error:', e);
      setFileError(e?.message || (t('support.sendFileFailed') || 'Failed to send file'));
    } finally {
      setSendingFile(false);
    }
  };

  const getFileUrl = (path: string | null | undefined) => {
    if (!path) return '';
    return path.startsWith('http') ? path : buildAssetUrl(path);
  };

  const canReply = ticket && (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING_FOR_CUSTOMER');
  const canResolve = ticket && ticket.status !== 'CLOSED' && (ticket.status === 'RESOLVED' || ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING_FOR_CUSTOMER');

  if (loading && !ticket) {
    return <AnimatedLoadingScreen message={t('support.loading') || 'Loading...'} />;
  }

  if (!ticket) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>{t('support.ticketNotFound') || 'Ticket not found'}</Text>
        <TouchableOpacity onPress={onBack} style={styles.backLink}>
          <Text style={{ color: colors.primary }}>{t('support.backToList') || 'Back to list'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = SupportTicketService.getStatusColor(ticket.status);
  const priorityColor = SupportTicketService.getPriorityColor(ticket.priority);
  const messages = (ticket.messages || []) as SupportTicketMessage[];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
            style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: canReply ? 140 : 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Meta */}
        <View style={{ marginBottom: 12, gap: 8 }}>
          {/* Date left + Status right (even in AR) */}
          <View style={styles.metaTopRow}>
            <Text style={[styles.metaText, styles.metaDate, { color: colors.textSecondary }]}>
              {formatDateLocalized(ticket.createdAt)}
            </Text>
            <View style={{ flex: 1 }} />
            <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {SupportTicketService.getStatusText(ticket.status, language)}
              </Text>
            </View>
          </View>

          {/* Priority / Category row */}
          <View style={[styles.metaRow, { flexWrap: 'wrap', gap: 8 }]}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {SupportTicketService.getPriorityText(ticket.priority, language)}
            </Text>
            {ticket.category && (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {String(ticket.category)}
              </Text>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary, marginBottom: 6 }]}>{t('support.description') || 'Description'}</Text>
          <Text style={[styles.bodyText, { color: colors.text, lineHeight: 22 }]}>{ticket.description}</Text>
          {ticket.attachmentUrls && ticket.attachmentUrls.length > 0 && (
            <View style={[styles.attachmentsRow, { flexWrap: 'wrap', marginTop: 12, gap: 8 }]}>
              {ticket.attachmentUrls.map((url, idx) => (
                <TouchableOpacity key={idx} onPress={() => Linking.openURL(url)} style={[styles.attachLink, { backgroundColor: colors.background || 'rgba(0,0,0,0.06)' }]}>
                  <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
                  <Text style={[styles.attachText, { color: colors.primary, marginLeft: 6 }]} numberOfLines={1}>{t('support.attachment') || 'Attachment'} {idx + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Messages */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24, marginBottom: 12 }]}>{t('support.messages') || 'Messages'}</Text>
        {messages.map((msg, index) => {
          const isAdmin = msg.isAdminMessage || msg.senderRole === 'ADMIN';
          const alignRight = (msg.userName ?? msg.senderName) !== ticket.userName;
          return (
            <View
              key={msg.id}
              style={[
                styles.messageCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  alignSelf: alignRight ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                },
              ]}
            >
              <Text style={[styles.messageAuthor, { color: colors.textSecondary, marginBottom: 4 }]}>{msg.userName ?? msg.senderName ?? (isAdmin ? 'Support' : 'You')}</Text>
              <Text style={[styles.messageContent, { color: colors.text, lineHeight: 20 }]}>
                {msg.content?.trim() || (msg.fileUrl ? '' : (t('support.noMessageText') || '(No message text)'))}
              </Text>
              {msg.fileUrl && (
                <View style={styles.messageAttachment}>
                  {msg.fileType === 'image' && (
                    <TouchableOpacity onPress={() => Linking.openURL(getFileUrl(msg.fileUrl)!)}>
                      <Image source={{ uri: getFileUrl(msg.fileUrl) }} style={styles.messageImage} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                  {msg.fileType === 'document' && (
                    <TouchableOpacity onPress={() => Linking.openURL(getFileUrl(msg.fileUrl)!)} style={[styles.docLink, { backgroundColor: colors.background }]}>
                      <Ionicons name="document-outline" size={22} color={colors.primary} />
                      <Text style={[styles.docLinkText, { color: colors.primary }]}>{t('support.document') || 'Document'}</Text>
                    </TouchableOpacity>
                  )}
                  {msg.fileType === 'voice' && (
                    <View style={styles.voiceRow}>
                      <Ionicons name="mic-outline" size={24} color={colors.textSecondary} />
                      <TouchableOpacity onPress={() => Linking.openURL(getFileUrl(msg.fileUrl)!)}>
                        <Text style={[styles.voiceLink, { color: colors.primary }]}>{t('support.voiceNote') || 'Voice note'}{msg.duration != null ? ` (${msg.duration}s)` : ''}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {msg.fileUrl && !['image', 'document', 'voice'].includes(msg.fileType || '') && (
                    <TouchableOpacity onPress={() => Linking.openURL(getFileUrl(msg.fileUrl)!)} style={[styles.docLink, { backgroundColor: colors.background }]}>
                      <Ionicons name="attach-outline" size={18} color={colors.primary} />
                      <Text style={[styles.docLinkText, { color: colors.primary }]}>{t('support.attachment') || 'Attachment'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {!msg.fileUrl && msg.attachmentUrls && msg.attachmentUrls.length > 0 && (
                <View style={[styles.attachmentsRow, { flexWrap: 'wrap', marginTop: 8, gap: 6 }]}>
                  {msg.attachmentUrls.map((url, idx) => (
                    <TouchableOpacity key={idx} onPress={() => Linking.openURL(url)} style={[styles.attachLink, { backgroundColor: colors.background }]}>
                      <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
                      <Text style={[styles.attachText, { color: colors.primary, marginLeft: 6 }]} numberOfLines={1}>{t('support.attachment') || 'Attachment'} {idx + 1}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={[styles.messageDate, { color: colors.textSecondary, marginTop: 4 }]}>{formatDate(msg.createdAt)}</Text>
            </View>
          );
        })}

        {/* Reply input */}
        {canReply && (
          <>
            {fileError ? (
              <View style={[styles.errorBanner, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={[styles.errorBannerText, { color: '#DC2626', marginLeft: 8 }]}>{fileError}</Text>
              </View>
            ) : null}
            {selectedFile && (
              <View style={[styles.selectedFileRow, { marginTop: 8 }]}>
                <Ionicons name="document-attach" size={20} color={colors.primary} />
                <Text style={[styles.selectedFileName, { color: colors.text, flex: 1 }]} numberOfLines={1}>{selectedFile.name}</Text>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendFile} disabled={sendingFile} style={[styles.sendFileBtn, { backgroundColor: colors.primary }]}>
                  {sendingFile ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendFileBtnText}>{t('support.sendFile') || 'Send file'}</Text>}
                </TouchableOpacity>
              </View>
            )}
            <View style={[styles.replyRow, { marginTop: 20, gap: 10, alignItems: 'flex-end' }]}>
              <TouchableOpacity
                onPress={pickDocument}
                style={[styles.attachBtn, { backgroundColor: colors.background || '#e2e8f0' }]}
                accessibilityLabel={t('support.attachFile') || 'Attach file'}
              >
                <Ionicons name="attach" size={24} color={receiverId != null ? colors.primary : colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder={t('support.replyPlaceholder') || 'Type your reply...'}
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[styles.replyInput, { backgroundColor: colors.background || '#f1f5f9', borderColor: colors.border, color: colors.text }]}
              />
              <TouchableOpacity
                onPress={handleSendReply}
                disabled={!replyText.trim() || sending}
                style={[styles.sendBtn, { backgroundColor: replyText.trim() ? colors.primary : (colors.background || '#e2e8f0') }]}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={22} color={replyText.trim() ? '#fff' : colors.textSecondary} />}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Resolve button */}
        {canResolve && ticket.status !== 'CLOSED' && (
          <TouchableOpacity
            onPress={handleResolve}
            disabled={resolving}
            style={[styles.resolveBtn, { marginTop: 24, borderColor: '#10B981' }]}
          >
            {resolving ? <ActivityIndicator size="small" color="#10B981" /> : <Ionicons name="checkmark-done" size={22} color="#10B981" />}
            <Text style={[styles.resolveBtnText, { color: '#10B981', marginLeft: 8 }]}>{t('support.resolveTicket') || 'Mark as resolved'}</Text>
          </TouchableOpacity>
        )}
        {ticket.status === 'CLOSED' && (
          <View style={[styles.closedBanner, { marginTop: 20, backgroundColor: '#10B98118' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={[styles.closedText, { color: '#10B981', marginLeft: 10 }]}>{t('support.ticketClosed') || 'This ticket is closed.'}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12 },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaDate: {
    textAlign: 'left',
  },
  errorTitle: { fontWeight: '600', marginTop: 12 },
  backLink: { marginTop: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 16 },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  metaRow: {},
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  badgeText: { fontWeight: '600', fontSize: 12 },
  metaText: { fontSize: 12 },
  card: { borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1 },
  cardLabel: { fontSize: 12 },
  bodyText: { fontSize: 15 },
  attachmentsRow: { alignItems: 'center' },
  attachLink: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  attachText: { fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  messageCard: { padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  messageAuthor: { fontWeight: '600', fontSize: 12 },
  messageContent: { fontSize: 14 },
  messageAttachment: { marginTop: 8 },
  messageImage: { width: 200, height: 160, borderRadius: 8, overflow: 'hidden' },
  docLink: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', gap: 8 },
  docLinkText: { fontWeight: '500', fontSize: 14 },
  voiceRow: { alignItems: 'center', gap: 8 },
  voiceLink: { fontWeight: '500', fontSize: 14 },
  messageDate: { fontSize: 11 },
  replyRow: { alignItems: 'flex-end' },
  replyInput: { flex: 1, borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15, minHeight: 44 },
  attachBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  errorBanner: { alignItems: 'center', marginTop: 12, padding: 10, borderRadius: 8 },
  errorBannerText: { flex: 1, fontSize: 13 },
  selectedFileRow: { alignItems: 'center', gap: 8 },
  selectedFileName: { fontSize: 14 },
  sendFileBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sendFileBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  resolveBtnText: { fontWeight: '600', fontSize: 16 },
  closedBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12 },
  closedText: { flex: 1, fontWeight: '500', fontSize: 14 },
});

export default TicketDetailScreen;
