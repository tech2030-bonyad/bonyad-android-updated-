import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { SmallTaskBid } from '../types/smallTasks';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface MySmallTaskBidsScreenProps {
  onBack: () => void;
  onBidPress?: (bid: SmallTaskBid) => void;
}

export default function MySmallTaskBidsScreen({
  onBack,
  onBidPress,
}: MySmallTaskBidsScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily } = useFontFamily();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';

  const [bids, setBids] = useState<SmallTaskBid[]>([]);
  const [filteredBids, setFilteredBids] = useState<SmallTaskBid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');

  const { alertState, showError, showSuccess, hideAlert, showConfirm } = useAlertPopup();

  // Animation values (Android only)
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'android') {
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      headerAnim.setValue(1);
    }

    fetchMyBids();
  }, []);

  useEffect(() => {
    filterBids();
  }, [bids, selectedFilter]);

  const fetchMyBids = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        setIsLoading(false);
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.MY_BIDS);
      console.log('🔍 Fetching my bids:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded bids:', data.bids?.length || data.length || 0);
        const bidsList = data.bids || data || [];
        setBids(bidsList);
        setFilteredBids(bidsList);
      } else {
        console.error('❌ Failed to fetch bids:', response.status);
        showError(t('Failed to load bids'), t('Error'));
      }
    } catch (error) {
      console.error('❌ Error fetching bids:', error);
      showError(t('Error loading bids'), t('Error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filterBids = () => {
    if (selectedFilter === 'ALL') {
      setFilteredBids(bids);
    } else {
      setFilteredBids(bids.filter(bid => bid.status === selectedFilter));
    }
  };

  const handleWithdrawBid = async (bidId: number) => {
    showConfirm(
      t('Withdraw Bid'),
      t('Are you sure you want to withdraw this bid? This action cannot be undone.'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          if (!token) {
            showError(t('Please login again'), t('Error'));
            return;
          }

          const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.WITHDRAW_BID, { id: bidId });
          console.log('🔄 Withdrawing bid:', url);

          const response = await fetch(url, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            console.log('✅ Bid withdrawn');
            showSuccess(t('Bid withdrawn successfully'), t('Success'));
            setTimeout(() => {
              hideAlert();
              fetchMyBids();
            }, 1500);
          } else {
            console.error('❌ Failed to withdraw bid:', response.status);
            showError(t('Failed to withdraw bid'), t('Error'));
          }
        } catch (error) {
          console.error('❌ Error withdrawing bid:', error);
          showError(t('Error withdrawing bid'), t('Error'));
        }
      }
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMyBids();
  };

  const riyalLogo = isDarkMode
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#FFB703';
      case 'ACCEPTED':
        return '#4CAF50';
      case 'REJECTED':
        return '#F44336';
      case 'WITHDRAWN':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'time-outline';
      case 'ACCEPTED':
        return 'checkmark-circle';
      case 'REJECTED':
        return 'close-circle';
      case 'WITHDRAWN':
        return 'arrow-undo-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'PENDING': t('Pending'),
      'ACCEPTED': t('Accepted'),
      'REJECTED': t('Rejected'),
      'WITHDRAWN': t('Withdrawn'),
    };
    return statusMap[status.toUpperCase()] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return t('Just now');
    } else if (diffHours < 24) {
      return t('{{hours}} hours ago', { hours: diffHours });
    } else if (diffDays === 1) {
      return t('Yesterday');
    } else if (diffDays < 7) {
      return t('{{days}} days ago', { days: diffDays });
    } else {
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const renderBid = ({ item, index }: { item: SmallTaskBid; index: number }) => {
    const taskName = item.request
      ? (isRTL ? item.request.taskType.nameAr : item.request.taskType.nameEn)
      : t('Task');

    // Animation for each card (Android only)
    const cardAnim = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(30)).current;

    useEffect(() => {
      if (Platform.OS === 'android') {
        const delay = index * 80;
        Animated.parallel([
          Animated.timing(cardAnim, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.spring(cardSlide, {
            toValue: 0,
            tension: 50,
            friction: 7,
            delay,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        cardAnim.setValue(1);
        cardSlide.setValue(0);
      }
    }, []);

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [{ translateY: cardSlide }],
        }}
      >
        <TouchableOpacity
          style={[styles.bidCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => onBidPress?.(item)}
          activeOpacity={0.7}
        >
          {/* Header */}
          <View style={[styles.bidHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.bidIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="construct" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bidTaskName, { color: colors.text, fontFamily: fontFamily.semiBold }]} numberOfLines={1}>
                {taskName}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Ionicons name={getStatusIcon(item.status) as any} size={12} color={getStatusColor(item.status)} />
                <Text style={[styles.statusText, { color: getStatusColor(item.status), fontFamily: fontFamily.semiBold }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {item.description && (
            <Text
              style={[
                styles.bidDescription,
                {
                  color: colors.textSecondary,
                  fontFamily: fontFamily.regular,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}

          {/* Amount & Hours */}
          <View style={[styles.bidInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.infoItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ExpoImage source={riyalLogo} style={styles.riyalLogo} contentFit="contain" />
              <Text style={[styles.bidAmount, { color: colors.primary, fontFamily: fontFamily.bold }]}>
                {new Intl.NumberFormat('en-US').format(item.amount)}
              </Text>
            </View>
            <View style={[styles.infoItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary, fontFamily: fontFamily.regular }]}>
                {item.estimatedHours} {t('hours')}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={[styles.bidFooter, { borderTopColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.dateText, { color: colors.textSecondary, fontFamily: fontFamily.regular }]}>
              {formatDate(item.createdAt)}
            </Text>
            {item.status === 'PENDING' && (
              <TouchableOpacity
                style={[styles.withdrawButton, { borderColor: colors.border }]}
                onPress={() => handleWithdrawBid(item.id)}
              >
                <Ionicons name="close-circle-outline" size={16} color={colors.error || '#F44336'} />
                <Text style={[styles.withdrawText, { color: colors.error || '#F44336', fontFamily: fontFamily.semiBold }]}>
                  {t('Withdraw')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: fontFamily.semiBold }]}>
        {selectedFilter === 'ALL' ? t('No bids submitted yet') : t('No {{filter}} bids', { filter: selectedFilter.toLowerCase() })}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontFamily: fontFamily.regular }]}>
        {t('Browse available tasks to submit your first bid')}
      </Text>
    </View>
  );

  const renderFilterButton = (filter: typeof selectedFilter, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        {
          backgroundColor: selectedFilter === filter ? colors.primary : colors.cardBackground,
          borderColor: selectedFilter === filter ? colors.primary : colors.border,
        },
      ]}
      onPress={() => setSelectedFilter(filter)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterButtonText,
          {
            color: selectedFilter === filter ? '#fff' : colors.text,
            fontFamily: fontFamily.semiBold,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: fontFamily.regular }]}>
            {t('Loading bids...')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20),
            borderBottomColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fontFamily.bold }]}>
            {t('My Bids')}
          </Text>
          {bids.length > 0 && (
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontFamily: fontFamily.regular }]}>
              {filteredBids.length} {t('bids')}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Filter Buttons */}
      <View style={[styles.filterContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {renderFilterButton('ALL', t('All'))}
        {renderFilterButton('PENDING', t('Pending'))}
        {renderFilterButton('ACCEPTED', t('Accepted'))}
        {renderFilterButton('REJECTED', t('Rejected'))}
      </View>

      {/* Bids List */}
      <FlatList
        data={filteredBids}
        renderItem={renderBid}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  bidCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  bidIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bidTaskName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bidDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  bidInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riyalLogo: {
    width: 14,
    height: 14,
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 13,
  },
  bidFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: 12,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  withdrawText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
