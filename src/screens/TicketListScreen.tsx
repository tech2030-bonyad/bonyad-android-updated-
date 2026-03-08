// 🎫 TicketListScreen - Support Tickets List
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useSupportTickets } from '../hooks/useSupportTickets';
import { SupportTicket } from '../types/chat';

const { width: screenWidth } = Dimensions.get('window');

interface TicketListScreenProps {
  onBack?: () => void;
  onCreateTicket?: () => void;
  onTicketPress?: (ticket: SupportTicket) => void;
}

const TicketItem: React.FC<{
  ticket: SupportTicket;
  onPress: () => void;
  colors: any;
  isDarkMode: boolean;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getCategoryText: (category: string) => string;
}> = ({
  ticket,
  onPress,
  colors,
  isDarkMode,
  getStatusColor,
  getStatusText,
  getPriorityColor,
  getCategoryText,
}) => (
  <TouchableOpacity
    style={[
      styles.ticketItem,
      {
        backgroundColor: colors.cardBackground,
        borderColor: isDarkMode ? colors.border : '#e5e7eb',
      },
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {/* Status Indicator */}
    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(ticket.status) }]} />
    
    <View style={styles.ticketContent}>
      {/* Header */}
      <View style={styles.ticketHeader}>
        <Text style={[styles.ticketSubject, { color: colors.text }]} numberOfLines={1}>
          {ticket.subject}
        </Text>
        {ticket.hasUnreadMessages && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadText}>NEW</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={[styles.ticketDescription, { color: colors.textSecondary }]} numberOfLines={2}>
        {ticket.description}
      </Text>

      {/* Category & Subcategory */}
      <View style={styles.ticketCategoryRow}>
        <Ionicons name="folder-outline" size={12} color={colors.textTertiary} />
        <Text style={[styles.ticketCategoryText, { color: colors.textTertiary }]}>
          {getCategoryText(ticket.category)}
          {ticket.subcategory ? ` › ${ticket.subcategory}` : ''}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.ticketFooter}>
        <View style={styles.ticketMeta}>
          <View style={[styles.badge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
            <Text style={[styles.badgeText, { color: getStatusColor(ticket.status) }]}>
              {getStatusText(ticket.status)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getPriorityColor(ticket.priority) + '20' }]}>
            <Text style={[styles.badgeText, { color: getPriorityColor(ticket.priority) }]}>
              {ticket.priority}
            </Text>
          </View>
        </View>
        <Text style={[styles.ticketDate, { color: colors.textTertiary }]}>
          {new Date(ticket.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>

    {/* Arrow */}
    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
  </TouchableOpacity>
);

const EmptyState: React.FC<{ colors: any; onCreate: () => void; isDarkMode: boolean }> = ({
  colors,
  onCreate,
  isDarkMode,
}) => (
  <View style={styles.emptyState}>
    <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}>
      <Ionicons name="headset-outline" size={48} color={colors.primary} />
    </View>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>Welcome to Support Center</Text>
    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
      Create a ticket to get help. Track progress and review closed tickets here.
    </Text>
    <TouchableOpacity
      style={[styles.emptyButton, { backgroundColor: colors.primary }]}
      onPress={onCreate}
    >
      <Text style={styles.emptyButtonText}>Create Ticket</Text>
    </TouchableOpacity>
  </View>
);

const TicketListScreen: React.FC<TicketListScreenProps> = ({
  onBack,
  onCreateTicket,
  onTicketPress,
}) => {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const language = i18n.language === 'ar' ? 'ar' : 'en';

  const {
    tickets,
    loading,
    stats,
    fetchTickets,
    getStatusColor,
    getStatusText,
    getPriorityColor,
    getCategoryText,
  } = useSupportTickets({ language });

  const renderTicket = useCallback(({ item }: { item: SupportTicket }) => (
    <TicketItem
      ticket={item}
      onPress={() => onTicketPress?.(item)}
      colors={colors}
      isDarkMode={isDarkMode}
      getStatusColor={getStatusColor}
      getStatusText={getStatusText}
      getPriorityColor={getPriorityColor}
      getCategoryText={getCategoryText}
    />
  ), [colors, isDarkMode, getStatusColor, getStatusText, getPriorityColor, getCategoryText, onTicketPress]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Support Center</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.resolved}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Resolved</Text>
        </View>
      </View>

      {/* Tickets List */}
      {tickets.length === 0 && !loading ? (
        <EmptyState colors={colors} onCreate={onCreateTicket || (() => {})} isDarkMode={isDarkMode} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchTickets} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={onCreateTicket}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  },
  headerRight: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusIndicator: {
    width: 4,
    alignSelf: 'stretch',
  },
  ticketContent: {
    flex: 1,
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  ticketDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  ticketCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ticketCategoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ticketDate: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TicketListScreen;
