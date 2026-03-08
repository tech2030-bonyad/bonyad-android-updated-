// 🎫 CreateTicketScreen - Create New Support Ticket
import React, { useState } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import SupportTicketService from '../services/SupportTicketService';
import FileUploadService from '../services/FileUploadService';
import { TicketCategory, TicketPriority } from '../types/chat';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface CreateTicketScreenProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

// Category configuration with subcategories (priority is for backend only, not displayed)
const CATEGORY_CONFIG: Record<TicketCategory, {
  labelEn: string;
  labelAr: string;
  icon: string;
  subcategories: { value: string; labelEn: string; labelAr: string; priority: TicketPriority }[];
}> = {
  'General': {
    labelEn: 'General',
    labelAr: 'عام',
    icon: 'help-circle-outline',
    subcategories: [
      { value: 'General Inquiry', labelEn: 'General Inquiry', labelAr: 'استفسار عام', priority: 'LOW' },
      { value: 'Feedback', labelEn: 'Feedback', labelAr: 'ملاحظات', priority: 'LOW' },
      { value: 'Complaint', labelEn: 'Complaint', labelAr: 'شكوى', priority: 'MEDIUM' },
    ],
  },
  'Billing': {
    labelEn: 'Billing',
    labelAr: 'الفواتير',
    icon: 'card-outline',
    subcategories: [
      { value: 'Duplicate Charge', labelEn: 'Duplicate Charge', labelAr: 'رسوم مكررة', priority: 'HIGH' },
      { value: 'Refund Request', labelEn: 'Refund Request', labelAr: 'طلب استرداد', priority: 'HIGH' },
      { value: 'Payment Failed', labelEn: 'Payment Failed', labelAr: 'فشل الدفع', priority: 'HIGH' },
      { value: 'Invoice Issue', labelEn: 'Invoice Issue', labelAr: 'مشكلة في الفاتورة', priority: 'MEDIUM' },
      { value: 'Subscription', labelEn: 'Subscription', labelAr: 'الاشتراك', priority: 'MEDIUM' },
    ],
  },
  'Technical': {
    labelEn: 'Technical',
    labelAr: 'تقني',
    icon: 'construct-outline',
    subcategories: [
      { value: 'App Crashing', labelEn: 'App Crashing', labelAr: 'تعطل التطبيق', priority: 'URGENT' },
      { value: 'Login Issue', labelEn: 'Login Issue', labelAr: 'مشكلة تسجيل الدخول', priority: 'HIGH' },
      { value: 'Payment Error', labelEn: 'Payment Error', labelAr: 'خطأ في الدفع', priority: 'HIGH' },
      { value: 'Feature Not Working', labelEn: 'Feature Not Working', labelAr: 'الميزة لا تعمل', priority: 'MEDIUM' },
      { value: 'Slow Performance', labelEn: 'Slow Performance', labelAr: 'بطء الأداء', priority: 'LOW' },
    ],
  },
  'Account': {
    labelEn: 'Account',
    labelAr: 'الحساب',
    icon: 'person-outline',
    subcategories: [
      { value: 'Password Reset', labelEn: 'Password Reset', labelAr: 'إعادة تعيين كلمة المرور', priority: 'HIGH' },
      { value: 'Account Locked', labelEn: 'Account Locked', labelAr: 'الحساب مغلق', priority: 'URGENT' },
      { value: 'Update Profile', labelEn: 'Update Profile', labelAr: 'تحديث الملف الشخصي', priority: 'LOW' },
      { value: 'Delete Account', labelEn: 'Delete Account', labelAr: 'حذف الحساب', priority: 'MEDIUM' },
      { value: 'Verification', labelEn: 'Verification', labelAr: 'التحقق', priority: 'MEDIUM' },
    ],
  },
  'Other': {
    labelEn: 'Other',
    labelAr: 'أخرى',
    icon: 'ellipsis-horizontal-outline',
    subcategories: [
      { value: 'Other', labelEn: 'Other', labelAr: 'أخرى', priority: 'MEDIUM' },
    ],
  },
};

const CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
  value: key as TicketCategory,
  ...config,
}));

const CreateTicketScreen: React.FC<CreateTicketScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const { alertState, showSuccess, showError, hideAlert } = useAlertPopup();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [subcategory, setSubcategory] = useState<string>('');
  const [attachments, setAttachments] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get current category config
  const currentCategory = category ? CATEGORY_CONFIG[category] : null;
  const currentSubcategories = currentCategory?.subcategories || [];

  // Get auto-assigned priority based on selected subcategory
  const autoPriority = currentSubcategories.find(s => s.value === subcategory)?.priority || 'MEDIUM';

  const handleCategorySelect = (cat: TicketCategory) => {
    setCategory(cat);
    setSubcategory('');
    setShowSubcategoryModal(true);
  };

  const handleSubcategorySelect = (sub: string) => {
    setSubcategory(sub);
    setShowSubcategoryModal(false);
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
    if (!category) {
      showError(language === 'ar' ? 'الرجاء اختيار الفئة' : 'Please select a category');
      return;
    }
    if (!subcategory) {
      showError(language === 'ar' ? 'الرجاء اختيار الفئة الفرعية' : 'Please select a subcategory');
      return;
    }
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

    setLoading(true);
    try {
      const attachmentUrls = await uploadAttachments();

      const ticket = await SupportTicketService.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        subcategory,
        priority: autoPriority,
        attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      });

      if (ticket) {
        showSuccess(
          language === 'ar' 
            ? 'تم إنشاء تذكرتك بنجاح. سنتواصل معك خلال 24 إلى 48 ساعة.'
            : 'Your ticket has been created successfully. We will contact you within 24 to 48 hours.',
          language === 'ar' ? 'تم بنجاح' : 'Success'
        );
        // Call onSuccess after a delay to let user see the success message
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (error: any) {
      showError(
        error.message || (language === 'ar' ? 'فشل في إنشاء التذكرة' : 'Failed to create ticket')
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

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'ar' ? 'اختر الفئة *' : 'Select Category *'}
          </Text>
          <View style={styles.categoriesList}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryItem,
                  {
                    backgroundColor: category === cat.value 
                      ? colors.primary + '10'
                      : isDarkMode ? colors.cardBackground : '#f9fafb',
                    borderColor: category === cat.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleCategorySelect(cat.value)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIconBox, { 
                  backgroundColor: category === cat.value ? colors.primary : colors.textTertiary + '30'
                }]}>
                  <Ionicons name={cat.icon as any} size={22} color="#fff" />
                </View>
                <Text style={[styles.categoryItemText, { color: colors.text }]}>
                  {language === 'ar' ? cat.labelAr : cat.labelEn}
                </Text>
                <View style={styles.categoryArrow}>
                  <Ionicons 
                    name={category === cat.value ? "checkmark-circle" : "chevron-forward"} 
                    size={22} 
                    color={category === cat.value ? colors.primary : colors.textTertiary} 
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Subcategory Display */}
        {category && subcategory && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {language === 'ar' ? 'الفئة الفرعية' : 'Subcategory'}
            </Text>
            <TouchableOpacity 
              style={[styles.selectedSubcategoryBox, { 
                backgroundColor: isDarkMode ? colors.cardBackground : '#f9fafb',
                borderColor: colors.border 
              }]}
              onPress={() => setShowSubcategoryModal(true)}
            >
              <Text style={[styles.selectedSubcategoryText, { color: colors.text }]}>
                {language === 'ar' 
                  ? currentSubcategories.find(s => s.value === subcategory)?.labelAr 
                  : currentSubcategories.find(s => s.value === subcategory)?.labelEn}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

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
            (loading || !category || !subcategory) && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={loading || !category || !subcategory}
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

      {/* Subcategory Modal */}
      <Modal
        visible={showSubcategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubcategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'ar' 
                  ? `اختر ${currentCategory?.labelAr || ''}` 
                  : `Select ${currentCategory?.labelEn || ''}`}
              </Text>
              <TouchableOpacity onPress={() => setShowSubcategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.subcategoriesList}>
                {currentSubcategories.map((sub) => (
                  <TouchableOpacity
                    key={sub.value}
                    style={[
                      styles.subcategoryItem,
                      {
                        backgroundColor: subcategory === sub.value 
                          ? colors.primary + '10'
                          : isDarkMode ? colors.background : '#f9fafb',
                        borderColor: subcategory === sub.value 
                          ? colors.primary 
                          : colors.border,
                      },
                    ]}
                    onPress={() => handleSubcategorySelect(sub.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.subcategoryItemText, { color: colors.text }]}>
                      {language === 'ar' ? sub.labelAr : sub.labelEn}
                    </Text>
                    {subcategory === sub.value && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowSubcategoryModal(false)}
            >
              <Text style={styles.modalDoneText}>
                {language === 'ar' ? 'تم' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
