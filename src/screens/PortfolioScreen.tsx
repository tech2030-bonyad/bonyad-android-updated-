import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Share,
  Linking,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_BASE_URL } from '../config/api';
import { getMyPortfolio, PortfolioProject } from '../services/TechnicianService';
import * as ImagePicker from 'expo-image-picker';
import { showError, showSuccess } from '../utils/alert';
import {
  uploadPortfolioPhoto,
  addPortfolioProject,
  updatePortfolioProject,
  deletePortfolioProject,
  checkHasPortfolio,
  createPortfolio,
  generatePortfolioPDF,
  getMyPDFInfo,
  getQRCodeUrl,
  PortfolioPDFInfo,
} from '../services/PortfolioService';
import { getUserProfile } from '../services/ProfileService';
import { storage } from '../utils/storage';
import {
  PortfolioHeader,
  ProfileSection,
  PDFCard,
  ProjectCard,
  AddProjectButton,
  PortfolioViewToggle,
  PortfolioBottomTabBar,
} from '../components/portfolio';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 20;
const CARD_GAP = 12;
const GRID_CARD_W = (SCREEN_W - H_PAD * 2 - CARD_GAP) / 2;

export type PortfolioTabId = 'home' | 'projects' | 'payments' | 'profile';

export interface PortfolioScreenProps {
  userId: string | number;
  onBack: () => void;
  onNavigateTab?: (tab: PortfolioTabId) => void;
  onEditProfile?: () => void;
}

function normalizeAssetUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL.replace('/api', '')}${url}`;
  return url;
}

function initialsFromName(name: string | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function pickCategoryAndEmoji(title: string, description: string): { tag: string; emoji: string } {
  const blob = `${title} ${description}`.toLowerCase();
  if (/commercial|office|مكتب|تجاري/.test(blob)) return { tag: 'Commercial', emoji: '🏢' };
  if (/interior|room|غرف|داخلي/.test(blob)) return { tag: 'Interior', emoji: '🏗️' };
  if (/paint|دهان/.test(blob)) return { tag: 'Finishing', emoji: '' }; // remove emoji for finishing work
  if (/electric|كهرباء/.test(blob)) return { tag: 'Electrical', emoji: '⚡' };
  return { tag: 'Project', emoji: '🏗️' };
}

export default function PortfolioScreen({
  userId: userIdProp,
  onBack,
  onNavigateTab,
  onEditProfile,
}: PortfolioScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { fontFamily, boldFontFamily, scaledSize } = useFontFamily();
  const bottomTabPad = Math.max(28, insets.bottom);

  const fontStyle = { fontFamily: fontFamily || undefined };
  const boldStyle = { fontFamily: boldFontFamily || fontFamily || undefined };

  const [resolvedUserId, setResolvedUserId] = useState<number>(Number(userIdProp) || 0);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioProject[]>([]);
  const [portfolioMeta, setPortfolioMeta] = useState<{ yearsOfExperience?: number; bio?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [pdfInfo, setPdfInfo] = useState<PortfolioPDFInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [qrVisible, setQrVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(28)).current;

  const screenSlideX = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    screenSlideX.setValue(-SCREEN_W);
    screenOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(screenSlideX, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, [screenOpacity, screenSlideX]);

  const handleBackScreen = useCallback(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(screenSlideX, { toValue: SCREEN_W, duration: 220, useNativeDriver: true }),
    ]).start(() => onBack());
  }, [onBack, screenOpacity, screenSlideX]);

  const modalChrome = useMemo(
    () => ({
      thinBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      closeBtnBg: isDark ? '#2A2A2C' : '#F5F5F5',
      closeBtnText: isDark ? '#CFCFD4' : '#666666',
      subtitle: isDark ? '#A0A0A8' : '#888888',
    }),
    [isDark],
  );

  const closeAddModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 28, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setShowAddModal(false);
    });
  }, [backdropOpacity, cardTranslateY]);

  useEffect(() => {
    if (!showAddModal) return;
    backdropOpacity.setValue(0);
    cardTranslateY.setValue(28);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(cardTranslateY, { toValue: 0, useNativeDriver: true, tension: 72, friction: 12 }),
    ]).start();
  }, [showAddModal, backdropOpacity, cardTranslateY]);

  useEffect(() => {
    const n = Number(userIdProp);
    if (n > 0) {
      setResolvedUserId(n);
      return;
    }
    storage.getUserId().then((id) => {
      if (id != null && id > 0) setResolvedUserId(id);
    });
  }, [userIdProp]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, profile, pdf] = await Promise.all([
        getMyPortfolio(),
        getUserProfile().catch(() => null),
        getMyPDFInfo().catch(() => null),
      ]);
      setUserProfile(profile);
      setPdfInfo(pdf);
      if (!data) {
        setPortfolioItems([]);
        setPortfolioMeta(null);
      } else {
        setPortfolioMeta({
          yearsOfExperience: data.yearsOfExperience,
          bio: (data as { bio?: string }).bio,
        });
        setPortfolioItems(Array.isArray(data.pastProjects) ? data.pastProjects : []);
      }
    } catch {
      setPortfolioItems([]);
      setPortfolioMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const displayName =
    userProfile?.name ||
    userProfile?.firstName ||
    [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') ||
    '—';

  const roleLabel = useMemo(() => {
    const services = userProfile?.services;
    if (Array.isArray(services) && services.length > 0) {
      const s = services[0];
      return i18n.language?.startsWith('ar') ? s.nameAr || s.nameEn : s.nameEn || s.nameAr;
    }
    return t('Construction Specialist');
  }, [userProfile, i18n.language, t]);

  const bioText = portfolioMeta?.bio?.trim() || userProfile?.description?.trim() || '';

  const projectsCount = portfolioItems.length;
  const ratingVal = userProfile?.averageRating;
  const ratingText =
    ratingVal != null && !Number.isNaN(Number(ratingVal)) ? Number(ratingVal).toFixed(1) : '—';
  const years =
    portfolioMeta?.yearsOfExperience ?? userProfile?.yearsOfExperience ?? userProfile?.experienceYears;
  const activeText =
    years != null && years !== ''
      ? `${years}${i18n.language?.startsWith('ar') ? ' سنوات' : 'yr'}`
      : '—';

  const shareUrl = pdfInfo?.publicUrl || (resolvedUserId ? `https://www.bonyad-hub.com/portfolio/${resolvedUserId}` : '');

  const handleShare = async () => {
    try {
      const msg = shareUrl || t('My Portfolio');
      await Share.share(
        Platform.OS === 'web' ? { url: msg } : { message: msg, url: shareUrl || undefined },
      );
    } catch {
      showError(t('network_error'));
    }
  };

  const handleHeaderMenu = () => {
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      ...(onEditProfile ? [{ text: t('Edit Profile'), onPress: onEditProfile }] : []),
      { text: t('Share'), onPress: () => handleShare() },
      { text: t('Cancel'), style: 'cancel' },
    ];
    Alert.alert(t('My Portfolio'), undefined, buttons);
  };

  const handleEditProfilePress = () => {
    if (onEditProfile) onEditProfile();
    else handleHeaderMenu();
  };

  const handleGenerateOrOpenPdf = async () => {
    if (pdfInfo?.pdfUrl) return;
    setIsPdfBusy(true);
    try {
      const info = await generatePortfolioPDF({ regenerate: false });
      setPdfInfo(info);
      showSuccess(t('PDF generated successfully'));
    } catch (e: any) {
      showError(e?.message || t('Failed to generate PDF'));
    } finally {
      setIsPdfBusy(false);
    }
  };

  const handlePdfEditRegenerate = () => {
    Alert.alert(t('Edit'), t('Regenerate PDF?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Regenerate'),
        onPress: async () => {
          setIsPdfBusy(true);
          try {
            const info = await generatePortfolioPDF({ regenerate: true });
            setPdfInfo(info);
            showSuccess(t('PDF generated successfully'));
          } catch (e: any) {
            showError(e?.message || t('Failed to generate PDF'));
          } finally {
            setIsPdfBusy(false);
          }
        },
      },
    ]);
  };

  const handleDownloadPdf = () => {
    const raw = pdfInfo?.pdfUrl;
    if (!raw) {
      handleGenerateOrOpenPdf();
      return;
    }
    const url = normalizeAssetUrl(raw);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => showError(t('network_error')));
    }
  };

  const openAdd = () => {
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setSelectedImages([]);
    setShowAddModal(true);
  };

  const openEdit = (p: PortfolioProject) => {
    setEditingProject(p);
    setTitle(p.title || '');
    setDescription(p.description || '');
    setSelectedImages([]);
    setShowAddModal(true);
  };

  const handleSaveProject = async () => {
    if (!title.trim()) {
      showError(t('Please enter a title'));
      return;
    }
    if (!editingProject && selectedImages.length === 0) {
      showError(t('missing_fields'));
      return;
    }

    setIsSaving(true);
    try {
      const photoUrls: string[] = [];
      for (const asset of selectedImages) {
        photoUrls.push(await uploadPortfolioPhoto(asset));
      }

      if (editingProject) {
        const payload: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim() || title.trim(),
        };
        if (photoUrls.length > 0) payload.photos = photoUrls;
        await updatePortfolioProject(editingProject.id, payload as any);
        showSuccess(t('Project updated successfully'));
      } else {
        const hasPortfolio = await checkHasPortfolio();
        if (!hasPortfolio) await createPortfolio();
        const today = new Date().toISOString().split('T')[0];
        await addPortfolioProject({
          title: title.trim(),
          description: description.trim() || title.trim(),
          startDate: today,
          endDate: today,
          photos: photoUrls,
          isPublic: true,
        });
        showSuccess(t('Project added successfully'));
      }
      closeAddModal();
      loadAll();
    } catch (e: any) {
      showError(e?.message || t('Failed to save project'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (p: PortfolioProject) => {
    Alert.alert(t('Delete Project'), t('Are you sure you want to delete this project? This action cannot be undone.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePortfolioProject(p.id);
            showSuccess(t('Project deleted successfully'));
            loadAll();
          } catch (e: any) {
            showError(e?.message || t('Failed to delete'));
          }
        },
      },
    ]);
  };

  const handleCardMenu = (p: PortfolioProject) => {
    Alert.alert(p.title || t('Project'), undefined, [
      { text: t('Edit'), onPress: () => openEdit(p) },
      { text: t('Delete Project'), style: 'destructive', onPress: () => handleDelete(p) },
      { text: t('Cancel'), style: 'cancel' },
    ]);
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(t('Please grant permission to access your photos'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setSelectedImages((prev) => [...prev, ...result.assets]);
    }
  };

  const removeImageAt = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onBottomTab = (tab: 'home' | 'projects' | 'payments' | 'profile') => {
    if (!onNavigateTab) return;
    if (tab === 'home') onNavigateTab('home');
    else if (tab === 'projects') onNavigateTab('projects');
    else if (tab === 'payments') onNavigateTab('payments');
    else if (tab === 'profile') onNavigateTab('profile');
  };

  const formatCardDate = (d: string | undefined) => {
    if (!d) return '';
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' });
    } catch {
      return d;
    }
  };

  const formatPdfLongDate = (d: string | undefined) => {
    if (!d) return '';
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const pdfDateLine = pdfInfo?.generatedAt
    ? `${t('Generated')} · ${formatPdfLongDate(pdfInfo.generatedAt)}`
    : t('Tap to generate');

  const renderProjectItem = (item: PortfolioProject, index: number) => {
    const rawFiles = (item as PortfolioProject & { files?: string[] }).files;
    const photos = item.photos?.length ? item.photos : rawFiles || [];
    const first = photos[0];
    const imageUri = first ? normalizeAssetUrl(typeof first === 'string' ? first : String(first)) : null;
    const { tag, emoji } = pickCategoryAndEmoji(item.title || '', item.description || '');
    const coverDate = formatCardDate(item.endDate || item.startDate);
    const headerDate = formatCardDate(item.startDate || item.endDate) || '—';

    const card = (
      <ProjectCard
        index={index}
        title={item.title || ''}
        description={item.description || ''}
        ownerName={displayName}
        initials={initialsFromName(displayName)}
        imageUri={imageUri}
        categoryTag={tag}
        emoji={emoji}
        coverDate={coverDate}
        headerDate={headerDate}
        boldFontFamily={boldFontFamily || undefined}
        fontFamily={fontFamily || undefined}
        onEdit={() => openEdit(item)}
        onDelete={() => handleDelete(item)}
        editLabel={t('Edit')}
        deleteLabel={t('Delete')}
        noImageLabel={t('No image available')}
      />
    );

    if (viewMode === 'grid') {
      return (
        <View key={item.id} style={{ width: GRID_CARD_W }}>
          {card}
        </View>
      );
    }
    return (
      <View key={item.id} style={{ width: '100%' }}>
        {card}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: 0, backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Animated.View
        style={[
          styles.animatedScreen,
          {
            opacity: screenOpacity,
            transform: [{ translateX: screenSlideX }],
          },
        ]}
      >
        <>
          <PortfolioHeader
            title={t('Portfolio')}
            onBack={handleBackScreen}
            boldFontFamily={boldFontFamily || undefined}
          />

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              <ScrollView
                contentContainerStyle={{
                  paddingHorizontal: H_PAD,
                  paddingTop: 4,
                  // `PortfolioBottomTabBar` is `position: 'absolute'`, so we need extra bottom padding
                  // to keep the scroll content above the bar.
                  paddingBottom: onNavigateTab ? bottomTabPad + 120 : 40,
                }}
                showsVerticalScrollIndicator={false}
              >
                <ProfileSection
          initials={initialsFromName(displayName)}
          displayName={displayName}
          roleLabel={roleLabel}
          bioText={bioText}
          projectsCount={String(projectsCount)}
          ratingText={ratingText}
          activeText={activeText}
          labels={{
            projects: t('Projects'),
            rating: t('Rating'),
            active: t('Active'),
          }}
          boldFontFamily={boldFontFamily || undefined}
          fontFamily={fontFamily || undefined}
          avatarUrl={userProfile?.avatar || userProfile?.profileImage}
          onEditProfile={handleEditProfilePress}
          onShare={handleShare}
          onMenu={handleHeaderMenu}
          editProfileLabel={t('Edit Profile')}
          shareLabel={t('Share')}
        />

        <PDFCard
          pdfTitle={t('Portfolio PDF')}
          dateLine={pdfDateLine}
          readyLabel={t('Ready')}
          hasPdf={!!pdfInfo?.pdfUrl}
          isBusy={isPdfBusy}
          boldFontFamily={boldFontFamily || undefined}
          fontFamily={fontFamily || undefined}
          onQr={() => (pdfInfo?.pdfUrl ? setQrVisible(true) : handleGenerateOrOpenPdf())}
          onDownload={handleDownloadPdf}
          onEdit={handlePdfEditRegenerate}
          qrLabel={t('QR Code')}
          downloadLabel={t('Download')}
          editLabel={t('Edit')}
        />

        <View style={{ marginHorizontal: -H_PAD }}>
          <PortfolioViewToggle mode={viewMode} onChange={setViewMode} />
        </View>

        {portfolioItems.length === 0 ? (
          <Text style={[styles.empty, fontStyle, { color: colors.textSecondary }]}>{t('No portfolio projects yet')}</Text>
        ) : (
          <View
            style={[
              styles.projectsWrap,
              viewMode === 'grid'
                ? {
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                  }
                : { paddingTop: 8 },
            ]}
          >
            {portfolioItems.map((item, index) => renderProjectItem(item, index))}
          </View>
        )}

                <AddProjectButton label={t('Add New Project')} onPress={openAdd} boldFontFamily={boldFontFamily || undefined} />
              </ScrollView>

              {onNavigateTab ? (
                <PortfolioBottomTabBar activeTab="profile" onTabPress={onBottomTab} />
              ) : null}
            </>
          )}
        </>
      </Animated.View>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { flexDirection: 'row', borderBottomColor: modalChrome.thinBorder }]}>
              <Text style={[boldStyle, { color: colors.text, fontSize: scaledSize(18) }]}>
                {editingProject ? t('Edit Project') : t('Add Portfolio Item')}
              </Text>
              <TouchableOpacity onPress={closeAddModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, ...fontStyle }]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('Title')}
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, ...fontStyle }]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('Description')}
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity style={[styles.addPhotosBtn, { borderColor: colors.primary }]} onPress={pickImages}>
                <Ionicons name="images-outline" size={22} color={colors.primary} />
                <Text style={{ color: colors.primary, marginLeft: 8, ...fontStyle }}>{t('Add Images')}</Text>
              </TouchableOpacity>
              <View style={styles.thumbRow}>
                {selectedImages.map((a, i) => (
                  <View key={i} style={styles.thumbWrap}>
                    <Image source={{ uri: a.uri }} style={styles.thumb} />
                    <TouchableOpacity style={styles.thumbRemove} onPress={() => removeImageAt(i)}>
                      <Ionicons name="close-circle" size={22} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveProject}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('Save')}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={qrVisible} transparent animationType="fade">
        <Pressable style={styles.qrOverlay} onPress={() => setQrVisible(false)}>
          <Pressable style={[styles.qrBox, { backgroundColor: colors.cardBackground }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[boldStyle, { color: colors.text, marginBottom: 12, fontSize: scaledSize(16) }]}>{t('Portfolio')} QR</Text>
            {resolvedUserId ? (
              <Image
                source={{ uri: getQRCodeUrl(resolvedUserId) }}
                style={{ width: 200, height: 200 }}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity onPress={() => setQrVisible(false)} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.primary, ...fontStyle }}>{t('Close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  animatedScreen: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  projectsWrap: {},
  empty: {
    textAlign: 'center',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 18,
    marginTop: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 18,
    marginTop: 10,
    minHeight: 90,
    fontSize: 15,
  },
  addPhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 12,
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: 88, height: 88, borderRadius: 10 },
  thumbRemove: { position: 'absolute', top: -6, right: -6 },
  saveBtn: {
    marginHorizontal: 18,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrBox: { borderRadius: 16, padding: 20, alignItems: 'center' },
});
