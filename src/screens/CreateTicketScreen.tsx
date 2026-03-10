// 🎫 CreateTicketScreen – same integration as web (getSupportCategoriesHierarchy, createTicket with categoryId/subcategoryId)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import {
  getSupportCategoriesHierarchy,
  hierarchyToRequestTypes,
  createTicket,
} from '../services/SupportTicketService';
import FileUploadService from '../services/FileUploadService';
import type { SupportRequestType, TicketPriority } from '../types/chat';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface CreateTicketScreenProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

/** Fallback when GET /support/categories/hierarchy fails or returns empty – same as web CreateTicketModal */
const FALLBACK_CATEGORIES: SupportRequestType[] = [
  { id: 1, nameEn: 'General Inquiry', nameAr: 'استفسار عام', name: 'General Inquiry', active: true, subcategories: [
    { id: 11, nameEn: 'Product question', nameAr: 'سؤال عن المنتج', name: 'Product question', active: true },
    { id: 12, nameEn: 'Pricing', nameAr: 'الأسعار', name: 'Pricing', active: true },
    { id: 13, nameEn: 'Other', nameAr: 'أخرى', name: 'Other', active: true },
  ]},
  { id: 2, nameEn: 'Payment Issues', nameAr: 'مشكلات الدفع', name: 'Payment Issues', active: true, subcategories: [
    { id: 21, nameEn: 'Payment not received', nameAr: 'لم أستلم الدفع', name: 'Payment not received', active: true },
    { id: 22, nameEn: 'Refund', nameAr: 'استرداد', name: 'Refund', active: true },
    { id: 23, nameEn: 'Wallet / Escrow', nameAr: 'المحفظة / الضمان', name: 'Wallet / Escrow', active: true },
  ]},
  { id: 3, nameEn: 'Technical Issue', nameAr: 'مشكلة تقنية', name: 'Technical Issue', active: true, subcategories: [
    { id: 31, nameEn: 'App not working', nameAr: 'التطبيق لا يعمل', name: 'App not working', active: true },
    { id: 32, nameEn: 'Login / Account access', nameAr: 'تسجيل الدخول / الوصول', name: 'Login / Account access', active: true },
    { id: 33, nameEn: 'Bug or error', nameAr: 'خلل أو خطأ', name: 'Bug or error', active: true },
  ]},
  { id: 4, nameEn: 'Account Issue', nameAr: 'مشكلة الحساب', name: 'Account Issue', active: true, subcategories: [
    { id: 41, nameEn: 'Profile update', nameAr: 'تحديث الملف', name: 'Profile update', active: true },
    { id: 42, nameEn: 'Verification', nameAr: 'التحقق', name: 'Verification', active: true },
    { id: 43, nameEn: 'Close account', nameAr: 'إغلاق الحساب', name: 'Close account', active: true },
  ]},
];

const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const CreateTicketScreen: React.FC<CreateTicketScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const isRTL = language === 'ar';
  const { alertState, showSuccess, showError, hideAlert } = useAlertPopup();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<SupportRequestType[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [attachments, setAttachments] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [loading, setLoading] = useState(false);

  const topLevelCategories = categories.filter(c => !c.parentId && c.active !== false);
  const subcategories = categoryId != null
    ? (categories.find(c => c.id === categoryId)?.subcategories || []).filter(s => s.active !== false)
    : [];

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const hierarchy = await getSupportCategoriesHierarchy();
      if (hierarchy?.length > 0) {
        setCategories(hierarchyToRequestTypes(hierarchy));
      } else {
        setCategories(FALLBACK_CATEGORIES);
      }
    } catch {
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCategorySelect = (id: number) => {
    setCategoryId(id);
    setSubcategoryId(undefined);
  };

  const handleSubcategorySelect = (id: number) => {
    setSubcategoryId(prev => prev === id ? undefined : id);
  };

  // Pick document from file system
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets[0]) {
        const file = result.assets[0];
        if (attachments.length >= 5) {
          showError(language === 'ar' ? 'الحد الأقصى 5 ملفات' : 'Maximum 5 files allowed');
          return;
        }
        setAttachments([...attachments, { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' }]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(language === 'ar' ? 'يحتاج إلى صلاحية الوصول للصور' : 'Permission to access gallery is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - attachments.length,
        quality: 0.8,
      });

      if (result.canceled === false && result.assets) {
        if (attachments.length + result.assets.length > 5) {
          showError(language === 'ar' ? 'الحد الأقصى 5 ملفات' : 'Maximum 5 files allowed');
          return;
        }
        const newAttachments = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        }));
        setAttachments([...attachments, ...newAttachments]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showError(language === 'ar' ? 'يحتاج إلى صلاحية الكاميرا' : 'Permission to access camera is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled === false && result.assets && result.assets[0]) {
        if (attachments.length >= 5) {
          showError(language === 'ar' ? 'الحد الأقصى 5 ملفات' : 'Maximum 5 files allowed');
          return;
        }
        const asset = result.assets[0];
        setAttachments([...attachments, {
          uri: asset.uri,
          name: asset.fileName || `camera_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        }]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Upload files and get URLs
  const uploadAttachments = async (): Promise<string[]> => {
    if (attachments.length === 0) return [];

    setUploadingFiles(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of attachments) {
        const url = await FileUploadService.uploadFile(file.uri, file.name, file.type);
        if (url) {
          uploadedUrls.push(url);
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploadingFiles(false);
    }

    return uploadedUrls;
  };

  // Get file icon based on type
  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'document-text';
    if (type.includes('word')) return 'document';
    return 'document-attach';
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      showError(language === 'ar' ? 'الرجاء إدخال الموضوع' : 'Please enter a subject');
      return;
    }
    if (!description.trim()) {
      showError(language === 'ar' ? 'الرجاء إدخال الوصف' : 'Please enter a description');
      return;
    }
    if (description.trim().length < 10) {
      showError(language === 'ar' ? 'الوصف قصير جداً' : 'Description is too short');
      return;
    }
    if (categories.length > 0 && categoryId == null && subcategoryId == null) {
      showError(language === 'ar' ? 'الرجاء اختيار الفئة أو الفئة الفرعية' : 'Please select a category or subcategory');
      return;
    }

    setLoading(true);
    try {
      const attachmentUrls = await uploadAttachments();

      const ticket = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        priority,
        ...(categoryId != null && { categoryId }),
        ...(subcategoryId != null && { subcategoryId }),
        attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      });

      if (ticket) {
        showSuccess(
          language === 'ar'
            ? 'تم إنشاء تذكرتك بنجاح. سنتواصل معك خلال 24 إلى 48 ساعة.'
            : 'Your ticket has been created successfully. We will contact you within 24 to 48 hours.',
          language === 'ar' ? 'تم بنجاح' : 'Success'
        );
        setTimeout(() => onSuccess?.(), 2000);
      }
    } catch (error: any) {
      const msg = error?.message || '';
      const isCategoryError = typeof msg === 'string' && /category is not active/i.test(msg);
      showError(
        isCategoryError
          ? (language === 'ar' ? 'الفئة المحددة لم تعد متاحة. حاول مرة أخرى أو اختر فئة أخرى.' : 'Selected category is no longer available. Please try again or choose another.')
          : (error?.message || (language === 'ar' ? 'فشل في إنشاء التذكرة' : 'Failed to create ticket'))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {language === 'ar' ? 'تذكرة جديدة' : 'New Ticket'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Subject */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'ar' ? 'الموضوع *' : 'Subject *'}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? colors.cardBackground : '#f9fafb',
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={subject}
            onChangeText={setSubject}
            placeholder={language === 'ar' ? 'موجز للمشكلة' : 'Brief summary of your issue'}
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
          />
          <Text style={[styles.characterCount, { color: colors.textTertiary }]}>
            {subject.length}/100
          </Text>
        </View>

        {/* Category – from API GET /support/categories/hierarchy */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'ar' ? 'الفئة *' : 'Category *'}
          </Text>
          {loadingCategories ? (
            <View style={[styles.loadingCategories, { backgroundColor: isDarkMode ? colors.cardBackground : '#f9fafb', borderRadius: 12 }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingCategoriesText, { color: colors.textSecondary }]}>{language === 'ar' ? 'جاري تحميل الفئات...' : 'Loading categories...'}</Text>
            </View>
          ) : topLevelCategories.length > 0 ? (
            <View style={styles.chipRow}>
              {topLevelCategories.map((c) => {
                const name = isRTL && c.nameAr ? c.nameAr : (c.nameEn || c.name || '');
                const selected = categoryId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => handleCategorySelect(c.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected ? colors.primary + '20' : (isDarkMode ? colors.cardBackground : '#f9fafb'),
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.categoryChipText, { color: selected ? colors.primary : colors.text }]} numberOfLines={1}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Subcategory */}
        {subcategories.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {language === 'ar' ? 'الفئة الفرعية' : 'Subcategory'}
            </Text>
            <View style={styles.chipRow}>
              {subcategories.map((s) => {
                const name = isRTL && s.nameAr ? s.nameAr : (s.nameEn || s.name || '');
                const selected = subcategoryId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => handleSubcategorySelect(s.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected ? colors.primary + '20' : (isDarkMode ? colors.cardBackground : '#f9fafb'),
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.categoryChipText, { color: selected ? colors.primary : colors.text }]} numberOfLines={1}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Priority – same as web */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'ar' ? 'الأولوية' : 'Priority'}
          </Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: priority === p ? colors.primary + '20' : (isDarkMode ? colors.cardBackground : '#f9fafb'),
                    borderColor: priority === p ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.categoryChipText, { color: priority === p ? colors.primary : colors.text }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'ar' ? 'الوصف *' : 'Description *'}
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: isDarkMode ? colors.cardBackground : '#f9fafb',
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder={
              language === 'ar'
                ? 'يرجى وصف مشكلتك بالتفصيل...'
                : 'Please describe your issue in detail...'
            }
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={[styles.characterCount, { color: colors.textTertiary }]}>
            {description.length}/1000
          </Text>
        </View>

        {/* Attachments Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'ar' ? 'المرفقات' : 'Attachments'}
          </Text>
          
          {/* Attachment List */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {attachments.map((file, index) => (
                <View key={index} style={[styles.attachmentCard, { backgroundColor: isDarkMode ? colors.cardBackground : '#f9fafb' }]}>
                  {file.type.startsWith('image/') ? (
                    <Image source={{ uri: file.uri }} style={styles.attachmentImage} />
                  ) : (
                    <View style={[styles.fileIconContainer, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name={getFileIcon(file.type) as any} size={28} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.attachmentInfo}>
                    <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={[styles.attachmentType, { color: colors.textTertiary }]}>
                      {file.type.startsWith('image/') 
                        ? (language === 'ar' ? 'صورة' : 'Image')
                        : (language === 'ar' ? 'ملف' : 'File')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeAttachment(index)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={24} color={colors.error || '#ef4444'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Upload Progress */}
          {uploadingFiles && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.uploadingText, { color: colors.textSecondary }]}>
                {language === 'ar' ? 'جاري رفع الملفات...' : 'Uploading files...'}
              </Text>
            </View>
          )}

          {/* Add Attachment Buttons */}
          <View style={styles.attachmentButtonsRow}>
            <TouchableOpacity
              style={[styles.attachmentActionBtn, { backgroundColor: colors.primary + '10' }]}
              onPress={pickImage}
              disabled={attachments.length >= 5 || uploadingFiles}
            >
              <Ionicons name="images-outline" size={22} color={colors.primary} />
              <Text style={[styles.attachmentActionText, { color: colors.primary }]}>
                {language === 'ar' ? 'صور' : 'Photos'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.attachmentActionBtn, { backgroundColor: colors.primary + '10' }]}
              onPress={takePhoto}
              disabled={attachments.length >= 5 || uploadingFiles}
            >
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
              <Text style={[styles.attachmentActionText, { color: colors.primary }]}>
                {language === 'ar' ? 'كاميرا' : 'Camera'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.attachmentActionBtn, { backgroundColor: colors.primary + '10' }]}
              onPress={pickDocument}
              disabled={attachments.length >= 5 || uploadingFiles}
            >
              <Ionicons name="document-attach-outline" size={22} color={colors.primary} />
              <Text style={[styles.attachmentActionText, { color: colors.primary }]}>
                {language === 'ar' ? 'ملف' : 'File'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.attachmentsLimit, { color: colors.textTertiary }]}>
            {language === 'ar' 
              ? `الحد الأقصى 5 ملفات • ${attachments.length}/5`
              : `Maximum 5 files • ${attachments.length}/5`}
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (loading || (categories.length > 0 && categoryId == null && subcategoryId == null)) && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={loading || !subject.trim() || !description.trim() || loadingCategories || (categories.length > 0 && categoryId == null && subcategoryId == null)}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {language === 'ar' ? 'إرسال التذكرة' : 'Submit Ticket'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  loadingCategoriesText: {
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    height: 150,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  
  // Categories List
  categoriesList: {
    gap: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  categoryArrow: {
    marginLeft: 8,
  },

  // Selected Subcategory
  selectedSubcategoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedSubcategoryText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Attachments
  attachmentsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  attachmentImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  fileIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
  },
  attachmentType: {
    fontSize: 12,
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  uploadingText: {
    fontSize: 13,
  },
  attachmentButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  attachmentActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  attachmentActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  attachmentsLimit: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },

  // Submit
  submitButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalScroll: {
    maxHeight: 400,
  },
  subcategoriesList: {
    gap: 8,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  subcategoryItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalDoneBtn: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateTicketScreen;
