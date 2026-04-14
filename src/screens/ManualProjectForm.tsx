import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  useWindowDimensions,
  Animated,
  Modal,
  Pressable,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { storage } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import LocationPicker from '../components/LocationPicker';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import { createProject, CreateProjectRequest } from '../services/ProjectService';
import { searchUserByPhone, type UserSearchResult } from '../services/UserService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import { globalAlertManager } from '../utils/globalAlertManager';
import { getCategories, getSubcategories, ServiceCategory as ApiServiceCategory, ServiceSubcategory } from '../services/ServiceService';

interface ManualProjectFormProps {
  technician?: any;
  onBack: () => void;
  onSuccess?: () => void;
  initialCategoryId?: number;
  initialCategoryName?: string;
  initialSubcategoryId?: number;
  initialSubcategoryName?: string;
}

interface ServiceCategory {
  id: number;
  nameAr?: string;
  nameEn: string;
  description?: string;
  imageUrl?: string;
}

interface PhaseInput {
  title: string;
  description: string;
  durationDays: string;
  amount: string;
}

function AnimatedPhaseCard({ children, style }: { children: React.ReactNode; style?: any }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// Design system colors from Figma
const FIGMA_COLORS = {
  bluePrimary100: '#003867',
  bluePrimary80: '#004A8A',
  bluePrimary70: '#00549B',
  bluePrimary60: '#005DAC',
  bluePrimary10: '#E6EFF7',
  bluePrimary20: '#B3CEE6',
  greenPrimary: '#008B3E',
  greenLight: '#E6F5EC',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  white: '#FFFFFF',
  purple100: '#3C076D',
  purple10: '#EFE6F5',
};

export default function ManualProjectForm({
  technician,
  onBack,
  onSuccess,
  initialCategoryId,
  initialCategoryName,
  initialSubcategoryId,
  initialSubcategoryName,
}: ManualProjectFormProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isRTL = i18n.language === 'ar';
  const { alertState, showError, showAlert, hideAlert } = useAlertPopup();
  
  // Responsive breakpoints
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width >= 1024;
  const isMediumWeb = isWeb && width >= 768 && width < 1024;
  const isSmallScreen = width < 768;

  // Form state
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  // Cleaned up redundant AI generation fields
  const [projectPhases, setProjectPhases] = useState<PhaseInput[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(initialCategoryId || 0);
  const [categoryDisplay, setCategoryDisplay] = useState(initialCategoryName || '');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number>(initialSubcategoryId || 0);
  const [subcategoryDisplay, setSubcategoryDisplay] = useState(initialSubcategoryName || '');
  const [budget, setBudget] = useState('');
  const [budgetUnspecified, setBudgetUnspecified] = useState(false);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  // Service categories & subcategories
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);

  const DROPDOWN_MAX_HEIGHT = 250;
  const categoryDropdownAnim = useRef(new Animated.Value(0)).current;
  const subcategoryDropdownAnim = useRef(new Animated.Value(0)).current;

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showPhasesModal, setShowPhasesModal] = useState(false);
  const phaseModalOpacity = useRef(new Animated.Value(0)).current;
  const phaseModalTranslateY = useRef(new Animated.Value(28)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;
  const isClosingScreenRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);


  const closeScreenAnimated = () => {
    if (isClosingScreenRef.current) return;
    isClosingScreenRef.current = true;
    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 16,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onBack();
    });
  };
  
  // Date picker state for bid closed at
  const [bidClosedDate, setBidClosedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [bidsCloseAt, setBidsCloseAt] = useState<string>('');

  // Open for bids vs direct assignment (same as web ManualProjectForm)
  const [assignmentType, setAssignmentType] = useState<'ALL' | 'DIRECT_ASSIGNMENT'>(
    technician ? 'DIRECT_ASSIGNMENT' : 'ALL'
  );
  const [directAssignmentTechnician, setDirectAssignmentTechnician] = useState<UserSearchResult | null>(
    technician
      ? {
          id: technician.id,
          name: technician.name || technician.userName || '',
          phoneNumber: technician.phoneNumber || technician.phone || '',
          role: 'TECHNICIAN',
          status: technician.status,
        }
      : null
  );
  const [technicianSearchPhone, setTechnicianSearchPhone] = useState('');
  const [technicianSearchLoading, setTechnicianSearchLoading] = useState(false);
  const [technicianSearchError, setTechnicianSearchError] = useState<string | null>(null);
  const assignmentToggleAnim = useRef(new Animated.Value(technician ? 1 : 0)).current;

  useEffect(() => {
    if (technician) {
      setAssignmentType('DIRECT_ASSIGNMENT');
      setDirectAssignmentTechnician({
        id: technician.id,
        name: technician.name || technician.userName || '',
        phoneNumber: technician.phoneNumber || technician.phone || '',
        role: 'TECHNICIAN',
        status: technician.status,
      });
      assignmentToggleAnim.setValue(1);
    }
  }, [technician]);

  // Fetch service categories (GET /services/categories)
  useEffect(() => {
    getCategories()
      .then((list) => setServiceCategories(list as ServiceCategory[]))
      .catch((err) => console.error('Error loading categories:', err));
  }, []);

  // Fetch subcategories when category is selected (GET /services/:categoryId/subcategories)
  useEffect(() => {
    if (!selectedCategoryId) {
      setSubcategories([]);
      setSelectedSubcategoryId(0);
      setSubcategoryDisplay('');
      return;
    }
    setSubcategoriesLoading(true);
    getSubcategories(selectedCategoryId)
      .then((list) => {
        setSubcategories(list);
        setSelectedSubcategoryId(0);
        setSubcategoryDisplay('');
      })
      .catch((err) => {
        console.error('Error loading subcategories:', err);
        setSubcategories([]);
      })
      .finally(() => setSubcategoriesLoading(false));
  }, [selectedCategoryId]);

  const openCategoryDropdown = () => {
    setShowSubcategoryPicker(false);
    categoryDropdownAnim.setValue(0);
    setShowCategoryPicker(true);
  };
  const closeCategoryDropdown = () => {
    Animated.timing(categoryDropdownAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setShowCategoryPicker(false);
      }
    });
  };

  const openSubcategoryDropdown = () => {
    setShowCategoryPicker(false);
    subcategoryDropdownAnim.setValue(0);
    setShowSubcategoryPicker(true);
  };
  const closeSubcategoryDropdown = () => {
    Animated.timing(subcategoryDropdownAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setShowSubcategoryPicker(false);
      }
    });
  };

  useEffect(() => {
    if (showCategoryPicker) {
      categoryDropdownAnim.setValue(0);
      Animated.timing(categoryDropdownAnim, {
        toValue: DROPDOWN_MAX_HEIGHT,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [showCategoryPicker]);

  useEffect(() => {
    if (showSubcategoryPicker) {
      subcategoryDropdownAnim.setValue(0);
      Animated.timing(subcategoryDropdownAnim, {
        toValue: DROPDOWN_MAX_HEIGHT,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [showSubcategoryPicker]);

  // Pick images
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Please grant camera roll permissions', 'warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      setPhotos([...photos, ...newPhotos].slice(0, 5));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Format date for API
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Handle date picker change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowTimePicker(false);
      if (event.type === 'set' && selectedDate) {
        setBidClosedDate(selectedDate);
        setBidsCloseAt(formatDateForAPI(selectedDate));
      }
    } else if (Platform.OS === 'ios' && selectedDate) {
      setBidClosedDate(selectedDate);
      setBidsCloseAt(formatDateForAPI(selectedDate));
    }
  };

  // Handle date selection
  const handlePickDate = () => {
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(true);
    }
  };

  // Handle time selection
  const handlePickTime = () => {
    if (Platform.OS === 'android') {
      setShowTimePicker(true);
    } else {
      setShowTimePicker(true);
    }
  };

  // Clear bid deadline
  const clearBidDeadline = () => {
    setBidClosedDate(new Date());
    setBidsCloseAt('');
  };

  const setAssignmentTypeWithAnimation = (next: 'ALL' | 'DIRECT_ASSIGNMENT') => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(280, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
    const toValue = next === 'DIRECT_ASSIGNMENT' ? 1 : 0;
    Animated.timing(assignmentToggleAnim, {
      toValue,
      useNativeDriver: true,
      duration: 200,
    }).start();
    setAssignmentType(next);
    if (next === 'ALL') setTechnicianSearchError(null);
  };

  const handleSearchTechnician = async () => {
    const phone = (technicianSearchPhone || '').trim();
    if (!phone) {
      setTechnicianSearchError(t('Please enter technician phone number'));
      return;
    }
    setTechnicianSearchError(null);
    setTechnicianSearchLoading(true);
    try {
      const user = await searchUserByPhone(phone);
      if ((user.role || '').toUpperCase() !== 'TECHNICIAN') {
        setTechnicianSearchError(t('Assigned user must be a TECHNICIAN'));
        setDirectAssignmentTechnician(null);
        return;
      }
      setDirectAssignmentTechnician(user);
    } catch (e: any) {
      setTechnicianSearchError(e.message || t('Technician not found'));
      setDirectAssignmentTechnician(null);
    } finally {
      setTechnicianSearchLoading(false);
    }
  };

  const addProjectPhase = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setProjectPhases((prev) => [
      ...prev,
      { title: '', description: '', durationDays: '', amount: '' },
    ]);
  };

  const updateProjectPhase = (index: number, field: keyof PhaseInput, value: string) => {
    setProjectPhases((prev) =>
      prev.map((phase, i) => (i === index ? { ...phase, [field]: value } : phase))
    );
  };

  const removeProjectPhase = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setProjectPhases((prev) => prev.filter((_, i) => i !== index));
  };

  const openPhasesModal = () => {
    phaseModalOpacity.setValue(0);
    phaseModalTranslateY.setValue(28);
    setShowPhasesModal(true);
    Animated.parallel([
      Animated.timing(phaseModalOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(phaseModalTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const closePhasesModal = () => {
    Animated.parallel([
      Animated.timing(phaseModalOpacity, { toValue: 0, duration: 170, useNativeDriver: true }),
      Animated.timing(phaseModalTranslateY, { toValue: 18, duration: 170, useNativeDriver: true }),
    ]).start(() => setShowPhasesModal(false));
  };

  // Submit project – same backend integration as web (ProjectService.createProject)
  const submitProject = async () => {
    if (!description.trim()) {
      showError('Please enter a project description');
      return;
    }

    if (!selectedCategoryId) {
      showError(t('Please select a service category'));
      return;
    }

    const effectiveTechnician = technician || directAssignmentTechnician;
    if (assignmentType === 'DIRECT_ASSIGNMENT' && !effectiveTechnician?.id) {
      showError(t('Please assign to a technician or switch to Open for Bids.'));
      return;
    }

    const hasValidLocation =
      latitude != null &&
      longitude != null &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      !(Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001);

    if (!hasValidLocation) {
      showError(t('Please select a valid project location on the map'));
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();

      if (!token || !userId) {
        showError('Please login again');
        setIsSubmitting(false);
        return;
      }

      if (!budgetUnspecified && (!budget || budget.trim() === '' || parseFloat(budget) <= 0)) {
        showError(t('Please enter a valid budget amount or mark it as unspecified'));
        setIsSubmitting(false);
        return;
      }

      const images = photos.map((uri, index) => {
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        return {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: `photo_${index}.jpg`,
          type,
        };
      });

      const projectData: CreateProjectRequest = {
        description: description.trim(),
        serviceCategoryId: selectedCategoryId,
        serviceSubcategoryId: selectedSubcategoryId || undefined,
        address: address || '',
        latitude: latitude as number,
        longitude: longitude as number,
        timeRequired: 7,
        projectType: assignmentType,
        budget: budgetUnspecified ? undefined : parseFloat(budget || '0'),
        budgetUnspecified: budgetUnspecified || undefined,
        images: images.length > 0 ? images : undefined,
        assignedTechnicianId:
          assignmentType === 'DIRECT_ASSIGNMENT' ? effectiveTechnician?.id : undefined,
        assignmentType: assignmentType === 'DIRECT_ASSIGNMENT' ? 'DIRECT_ASSIGNMENT' : undefined,
        bidsCloseAt: bidsCloseAt || undefined,
      };

      const data = await createProject(projectData);
      const createdProjectId =
        (data as any)?.id ??
        (data as any)?.projectId ??
        (data as any)?.data?.id ??
        null;

      if (createdProjectId) {
        const successMessage =
          assignmentType === 'DIRECT_ASSIGNMENT'
            ? t('Deal sent successfully!')
            : t('Project submitted successfully!');
        showAlert(
          t('Success'),
          successMessage,
          'success',
          [
            {
              text: t('OK'),
              onPress: () => {
                onSuccess?.();
                closeScreenAnimated();
              },
            },
          ]
        );
      } else {
        throw new Error('Failed to create project');
      }
    } catch (error: any) {
      console.error('Error submitting project:', error);
      showError(error.message || 'Failed to submit project', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === 'dark';
  const primaryBlue = isDark ? colors.primary : FIGMA_COLORS.bluePrimary60;
  const cardBg = isDark ? colors.cardBackground : FIGMA_COLORS.white;
  const textPrimary = isDark ? colors.text : FIGMA_COLORS.bluePrimary100;
  const textBody = isDark ? colors.text : FIGMA_COLORS.textBody;
  const textSecondary = isDark ? colors.textSecondary : FIGMA_COLORS.textSecondary;
  const lightBlueBg = isDark ? colors.surface : FIGMA_COLORS.bluePrimary10;
  const borderColor = isDark ? colors.border : FIGMA_COLORS.textDividers;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.background : FIGMA_COLORS.white,
          paddingTop: isLargeWeb ? 0 : Platform.OS === 'android' ? 0 : insets.top,
          opacity: screenOpacity,
          transform: [{ translateY: screenTranslateY }],
        },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingBottom: insets.bottom + 100,
            width: '100%',
          },
          isLargeWeb && styles.scrollContentLargeWeb,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Breadcrumb Navigation - Hidden on large web */}
        {!isLargeWeb && (
        <View style={[styles.breadcrumbContainer, { borderBottomColor: borderColor }]}>
          <TouchableOpacity 
            onPress={closeScreenAnimated} 
            style={[styles.breadcrumbBack, isLargeWeb && styles.breadcrumbBackLargeWeb]}
          >
            <BackArrowIonicons variant="chevron" size={isLargeWeb ? 40 : 20} color={textPrimary} />
          </TouchableOpacity>
          <View style={[styles.breadcrumbTextContainer, isLargeWeb && styles.breadcrumbTextContainerLargeWeb]}>
            <Text style={[styles.breadcrumbTitle, { color: textPrimary }, isLargeWeb && styles.breadcrumbTitleLargeWeb]}>
              {t('Project Creation')}
            </Text>
            <Text style={[styles.breadcrumbSubtitle, { color: textSecondary }, isLargeWeb && styles.breadcrumbSubtitleLargeWeb]}>
              {t('Manual Project Form')}
            </Text>
          </View>
        </View>
        )}

        {/* Title Section - Large Web */}
        {isLargeWeb && (
          <View style={styles.titleSectionLargeWeb}>
            <TouchableOpacity onPress={closeScreenAnimated} style={styles.titleBackButton}>
              <BackArrowIonicons variant="chevron" size={24} color={textPrimary} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.titleMainText}>
                {t('Project Creation')}
              </Text>
              <Text style={styles.titleSubtext}>
                {t('Manual Project Form')}
              </Text>
            </View>
          </View>
        )}

        {/* Project Creation Flow */}
        <View style={[styles.flowContainer, isLargeWeb && styles.flowContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="CREATING" />
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: borderColor }, isLargeWeb && styles.dividerLargeWeb]} />

        {/* Form Header */}
        <View style={styles.formHeader}>
          <Text style={[styles.formTitle, { color: textPrimary }]}>
            {t('Project Details')}
          </Text>
          <Text style={[styles.formSubtitle, { color: textBody }]}>
            {t('Fill in the details below to create your project. Service providers will send bids once submitted.')}
          </Text>
        </View>

        {/* Service Category Selection - Dropdown */}
        <View style={[styles.section, { zIndex: 102 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
              {t('Service Category')} *
            </Text>
          </View>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[
                styles.selectButton,
                styles.editableInput,
                { 
                  backgroundColor: cardBg, 
                  borderColor: showCategoryPicker ? primaryBlue : borderColor,
                  borderWidth: showCategoryPicker ? 1.5 : 1,
                }
              ]}
              onPress={() => { showCategoryPicker ? closeCategoryDropdown() : openCategoryDropdown(); }}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  { color: categoryDisplay ? textBody : textSecondary },
                ]}
              >
                {categoryDisplay || t('Select category')}
              </Text>
              <Ionicons
                name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={showCategoryPicker ? primaryBlue : textSecondary}
              />
            </TouchableOpacity>

            {showCategoryPicker ? (
              <Animated.View
                style={[
                  styles.dropdownList,
                  { backgroundColor: cardBg, borderColor: borderColor },
                  { maxHeight: categoryDropdownAnim, overflow: 'hidden' },
                ]}
              >
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {serviceCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.dropdownOption,
                        { borderBottomColor: borderColor },
                        selectedCategoryId === cat.id ? { backgroundColor: lightBlueBg } : undefined,
                      ]}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);
                        setCategoryDisplay(isRTL && cat.nameAr ? cat.nameAr : (cat.nameEn || ''));
                        closeCategoryDropdown();
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, { color: textBody }]} numberOfLines={1}>
                        {isRTL && cat.nameAr ? cat.nameAr : (cat.nameEn || '')}
                      </Text>
                      {selectedCategoryId === cat.id ? (
                        <Ionicons name="checkmark" size={18} color={primaryBlue} />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            ) : null}
          </View>
        </View>

        {/* Service Subcategory (optional) - shown when category has subcategories */}
        {selectedCategoryId !== 0 && (subcategories.length > 0 || subcategoriesLoading) ? (
          <View style={[styles.section, { zIndex: 101 }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="layers-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
              <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
                {t('Service Subcategory')} ({t('Optional')})
              </Text>
            </View>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  styles.editableInput,
                  { 
                    backgroundColor: cardBg, 
                    borderColor: showSubcategoryPicker ? primaryBlue : borderColor,
                    borderWidth: showSubcategoryPicker ? 1.5 : 1,
                  }
                ]}
                onPress={() => { showSubcategoryPicker ? closeSubcategoryDropdown() : openSubcategoryDropdown(); }}
                disabled={subcategoriesLoading}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    { color: subcategoryDisplay ? textBody : textSecondary },
                  ]}
                >
                  {subcategoriesLoading ? t('Loading...') : (subcategoryDisplay || t('Select subcategory'))}
                </Text>
                <Ionicons
                  name={showSubcategoryPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={showSubcategoryPicker ? primaryBlue : textSecondary}
                />
              </TouchableOpacity>

              {showSubcategoryPicker && !subcategoriesLoading ? (
                <Animated.View
                  style={[
                    styles.dropdownList,
                    { backgroundColor: cardBg, borderColor: borderColor },
                    { maxHeight: subcategoryDropdownAnim, overflow: 'hidden' },
                  ]}
                >
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    <TouchableOpacity
                      style={[
                        styles.dropdownOption,
                        { borderBottomColor: borderColor },
                        !selectedSubcategoryId ? { backgroundColor: lightBlueBg } : undefined,
                      ]}
                      onPress={() => {
                        setSelectedSubcategoryId(0);
                        setSubcategoryDisplay('');
                        closeSubcategoryDropdown();
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, { color: textBody }]}>{t('None')}</Text>
                      {!selectedSubcategoryId ? <Ionicons name="checkmark" size={18} color={primaryBlue} /> : null}
                    </TouchableOpacity>
                    {subcategories.map((sub) => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.dropdownOption,
                          { borderBottomColor: borderColor },
                          selectedSubcategoryId === sub.id ? { backgroundColor: lightBlueBg } : undefined,
                        ]}
                        onPress={() => {
                          setSelectedSubcategoryId(sub.id);
                          setSubcategoryDisplay(isRTL && sub.nameAr ? sub.nameAr : (sub.nameEn || ''));
                          closeSubcategoryDropdown();
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, { color: textBody }]} numberOfLines={1}>
                          {isRTL && sub.nameAr ? sub.nameAr : (sub.nameEn || '')}
                        </Text>
                        {selectedSubcategoryId === sub.id ? (
                          <Ionicons name="checkmark" size={18} color={primaryBlue} />
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Animated.View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Project Name */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="create-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
              {t('Project Name')}
            </Text>
          </View>
          <View style={[styles.inputContainer, styles.editableInput, { backgroundColor: cardBg, borderColor: borderColor }]}>
            <TextInput
              style={[styles.singleLineInput, { color: textBody, backgroundColor: cardBg }]}
              value={projectName}
              onChangeText={setProjectName}
              placeholder={t('Enter project name')}
              placeholderTextColor={textSecondary}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
              {t('Project Description')} *
            </Text>
          </View>
          <View style={[styles.inputContainer, styles.editableInput, { backgroundColor: cardBg, borderColor: borderColor }]}>
            <TextInput
              style={[styles.textArea, { color: textBody, backgroundColor: cardBg }]}
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
              placeholder={t('Describe your project needs in detail...')}
              placeholderTextColor={textSecondary}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Extra Fields Removed for Simplicity */}

        {/* Project Phases */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="git-branch-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
              <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
                {t('Project Phases')}
              </Text>
            </View>
            <TouchableOpacity onPress={openPhasesModal} style={styles.phaseAddButton}>
              <Ionicons name="add" size={18} color={primaryBlue} />
              <Text style={[styles.phaseAddButtonText, { color: primaryBlue }]}>{t('Add')}</Text>
            </TouchableOpacity>
          </View>
          {projectPhases.length > 0 ? (
            projectPhases.map((phase, index) => (
              <View key={`phase-${index}`} style={[styles.phaseChip, { borderColor, backgroundColor: lightBlueBg }]}>
                <Text style={[styles.phaseChipText, { color: textBody }]} numberOfLines={1}>
                  {phase.title?.trim() || `${t('Phase')} ${index + 1}`}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.phaseEmptyText, { color: textSecondary }]}>
              {t('No phases added yet')}
            </Text>
          )}
        </View>

        {/* Budget & Duration Row */}
        <View style={[styles.cardsRow, !isSmallScreen && styles.cardsRowWeb]}>
          {/* Budget Card */}
          <View style={[
            styles.statCard, 
            { 
              backgroundColor: cardBg, 
              borderColor: borderColor,
              flex: isSmallScreen ? 1 : undefined,
              width: isSmallScreen ? undefined : '48%',
            }
          ]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="cash-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
              <Text style={[styles.statCardLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
                {t('Budget')} (SAR)
              </Text>
            </View>
            {budgetUnspecified ? (
              <Text style={[styles.statCardValue, { color: textSecondary }]}>
                {t('Unspecified')}
              </Text>
            ) : (
              <View style={[styles.budgetInputWrapper, { backgroundColor: lightBlueBg, borderColor: borderColor }]}>
                <TextInput
                  style={[styles.budgetInput, { color: textBody }]}
                  value={budget}
                  onChangeText={setBudget}
                  placeholder={t('Enter amount')}
                  placeholderTextColor={textSecondary}
                  keyboardType="numeric"
                />
              </View>
            )}
            <TouchableOpacity
              onPress={() => setBudgetUnspecified(!budgetUnspecified)}
              style={styles.checkboxContainer}
            >
              <Ionicons
                name={budgetUnspecified ? 'checkbox' : 'checkbox-outline'}
                size={16}
                color={budgetUnspecified ? primaryBlue : textSecondary}
              />
              <Text style={[styles.checkboxText, { color: textSecondary }]}>
                {t('Unspecified')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bid Deadline Card */}
          <View style={[
            styles.statCard, 
            { 
              backgroundColor: cardBg, 
              borderColor: borderColor,
              flex: isSmallScreen ? 1 : undefined,
              width: isSmallScreen ? undefined : '48%',
            }
          ]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="time-outline" size={14} color={FIGMA_COLORS.greenPrimary} />
              <Text style={[styles.statCardLabel, { color: FIGMA_COLORS.greenPrimary }]}>
                {t('Bid Deadline')}
              </Text>
            </View>
            {bidsCloseAt ? (
              <View style={styles.dateValueContainer}>
                <Text style={[styles.statCardValue, { color: textBody, flex: 1 }]} numberOfLines={1}>
                  {formatDateForDisplay(bidsCloseAt)}
                </Text>
                <TouchableOpacity onPress={clearBidDeadline}>
                  <Ionicons name="close-circle" size={18} color={colors.error || '#F44336'} />
                </TouchableOpacity>
              </View>
            ) : isWeb ? (
              // Web-specific date/time inputs
              <View style={styles.webDatePickerContainer}>
                <input
                  type="datetime-local"
                  style={{
                    flex: 1,
                    padding: 10,
                    fontSize: 14,
                    borderRadius: 6,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: lightBlueBg,
                    color: textBody,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => {
                    if (e.target.value) {
                      const date = new Date(e.target.value);
                      setBidClosedDate(date);
                      setBidsCloseAt(formatDateForAPI(date));
                    }
                  }}
                />
              </View>
            ) : (
              <View style={styles.datePickerRow}>
                <TouchableOpacity style={[styles.miniDateButton, { backgroundColor: FIGMA_COLORS.greenLight }]} onPress={handlePickDate}>
                  <Ionicons name="calendar-outline" size={14} color={FIGMA_COLORS.greenPrimary} />
                  <Text style={[styles.miniDateText, { color: FIGMA_COLORS.greenPrimary }]}>
                    {t('Date')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniDateButton, { backgroundColor: FIGMA_COLORS.greenLight }]} onPress={handlePickTime}>
                  <Ionicons name="time-outline" size={14} color={FIGMA_COLORS.greenPrimary} />
                  <Text style={[styles.miniDateText, { color: FIGMA_COLORS.greenPrimary }]}>
                    {t('Time')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Assignment: Open for Bids vs Assign technician (same as web manual entry) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>{t('Assignment')}</Text>
          </View>
          <View style={[styles.cardsRow, { flexDirection: 'column', gap: 8 }]}>
            <Animated.View
              style={{
                transform: [
                  {
                    scale: assignmentToggleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.04, 0.98],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setAssignmentTypeWithAnimation('ALL')}
                style={[
                  styles.selectButton,
                  styles.editableInput,
                  {
                    backgroundColor: cardBg,
                    borderColor: assignmentType === 'ALL' ? primaryBlue : borderColor,
                    borderWidth: assignmentType === 'ALL' ? 1.5 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Text style={[styles.selectButtonText, { color: textBody }]}>{t('Open for Bids')}</Text>
                  {assignmentType === 'ALL' ? <Ionicons name="checkmark" size={18} color={primaryBlue} /> : null}
                </View>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View
              style={{
                transform: [
                  {
                    scale: assignmentToggleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1.04],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setAssignmentTypeWithAnimation('DIRECT_ASSIGNMENT')}
                style={[
                  styles.selectButton,
                  styles.editableInput,
                  {
                    backgroundColor: cardBg,
                    borderColor: assignmentType === 'DIRECT_ASSIGNMENT' ? primaryBlue : borderColor,
                    borderWidth: assignmentType === 'DIRECT_ASSIGNMENT' ? 1.5 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Text style={[styles.selectButtonText, { color: textBody }]}>{t('Assign to Technician')}</Text>
                  {assignmentType === 'DIRECT_ASSIGNMENT' ? (
                    <Ionicons name="checkmark" size={18} color={primaryBlue} />
                  ) : null}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
          {assignmentType === 'DIRECT_ASSIGNMENT' ? (
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.sectionLabel, { marginBottom: 4, color: FIGMA_COLORS.bluePrimary80 }]}>
                {t('Technician phone number')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.editableInput, styles.budgetInput, { flex: 1, backgroundColor: cardBg, borderColor }]}
                  value={technicianSearchPhone}
                  onChangeText={(text) => {
                    setTechnicianSearchPhone(text);
                    setTechnicianSearchError(null);
                  }}
                  placeholder={t('e.g. 555123456')}
                  placeholderTextColor={textSecondary}
                  editable={!technicianSearchLoading}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={[styles.selectButton, { paddingHorizontal: 14, backgroundColor: lightBlueBg }]}
                  onPress={handleSearchTechnician}
                  disabled={technicianSearchLoading}
                >
                  {technicianSearchLoading ? (
                    <ActivityIndicator size="small" color={primaryBlue} />
                  ) : (
                    <Ionicons name="search" size={22} color={primaryBlue} />
                  )}
                </TouchableOpacity>
              </View>
              {technicianSearchError ? (
                <Text style={{ color: colors.error || '#FF3B30', fontSize: 12, marginTop: 4 }}>
                  {technicianSearchError}
                </Text>
              ) : null}
              {directAssignmentTechnician ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 8,
                    padding: 10,
                    backgroundColor: lightBlueBg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor,
                  }}
                >
                  <Ionicons name="person" size={20} color={primaryBlue} />
                  <Text style={{ marginLeft: 8, color: textBody, flex: 1 }} numberOfLines={2}>
                    {directAssignmentTechnician.name} · {directAssignmentTechnician.phoneNumber}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setDirectAssignmentTechnician(null)}
                    style={{ padding: 4 }}
                    accessibilityLabel={t('Cancel')}
                  >
                    <Ionicons name="close-circle" size={22} color={textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
              {t('Project Address')} ({t('Optional')})
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addressButton, styles.editableInput, { backgroundColor: cardBg, borderColor: borderColor }]}
            onPress={() => setShowMapPicker(true)}
          >
            <Ionicons name="location" size={18} color={primaryBlue} />
            <Text 
              style={[styles.addressText, { color: address ? textBody : textSecondary }]} 
              numberOfLines={1}
            >
              {address || t('Select location on map')}
            </Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
              {t('Photos')} ({photos.length}/5) ({t('Optional')})
            </Text>
          </View>
          <View style={styles.photosContainer}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={22} color={FIGMA_COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 ? (
              <TouchableOpacity
                style={[styles.addPhotoButton, { borderColor: primaryBlue, backgroundColor: lightBlueBg }]}
                onPress={pickImages}
              >
                <Ionicons name="add" size={28} color={primaryBlue} />
                <Text style={[styles.addPhotoText, { color: primaryBlue }]}>{t('Add')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: primaryBlue },
            (isSubmitting || !description.trim() || !selectedCategoryId) ? styles.submitButtonDisabled : undefined
          ]}
          onPress={submitProject}
          disabled={isSubmitting || !description.trim() || !selectedCategoryId}
        >
          {isSubmitting ? (
            <ActivityIndicator color={FIGMA_COLORS.white} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {assignmentType === 'DIRECT_ASSIGNMENT' ? t('Send Deal') : t('Submit Project')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: FIGMA_COLORS.purple10, borderColor: FIGMA_COLORS.purple100 }]}
          onPress={closeScreenAnimated}
        >
          <Text style={[styles.cancelButtonText, { color: FIGMA_COLORS.purple100 }]}>
            {t('Cancel')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Location Picker */}
      {showMapPicker && (
        <LocationPicker
          initialLocation={
            latitude != null && longitude != null ? { latitude, longitude } : undefined
          }
          initialAddress={address}
          onLocationSelect={(location) => {
            setLatitude(location.latitude);
            setLongitude(location.longitude);
            setAddress(location.address);
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* Date Picker for Android */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={bidClosedDate}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={bidClosedDate}
          mode="time"
          display="spinner"
          is24Hour={false}
          onChange={handleDateChange}
        />
      )}

      {/* Date Picker for iOS */}
      {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
        <DateTimePicker
          value={bidClosedDate}
          mode="datetime"
          display="spinner"
          is24Hour={false}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: cardBg }]}>
            <ActivityIndicator size="large" color={primaryBlue} />
            <Text style={[styles.loadingText, { color: textBody }]}>
              {t('Submitting project...')}
            </Text>
          </View>
        </View>
      )}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
        countdown={alertState.countdown}
      />
      <Modal visible={showPhasesModal} transparent animationType="none" onRequestClose={closePhasesModal}>
        <Animated.View style={[styles.phaseModalBackdrop, { opacity: phaseModalOpacity }]}>
          <Pressable style={styles.phaseModalDismiss} onPress={closePhasesModal} />
          <Animated.View
            style={[
              styles.phaseModalSheet,
              { backgroundColor: cardBg, borderColor },
              { transform: [{ translateY: phaseModalTranslateY }] },
            ]}
          >
            <View style={styles.phaseModalHeader}>
              <Text style={[styles.phaseModalTitle, { color: textPrimary }]}>{t('Project Phases')}</Text>
              <TouchableOpacity onPress={closePhasesModal} style={styles.phaseModalCloseBtn} hitSlop={10}>
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.phaseModalSubtitle, { color: textSecondary }]}>
              {t('Add trackable stages for your project')}
            </Text>
            <ScrollView style={styles.phaseModalList} contentContainerStyle={styles.phaseModalListContent}>
              {projectPhases.length > 0 ? (
                projectPhases.map((phase, index) => (
                  <AnimatedPhaseCard key={`phase-modal-${index}`} style={[styles.phaseCard, { borderColor }]}>
                    <View style={styles.phaseCardHeader}>
                      <Text style={[styles.phaseCardTitle, { color: textPrimary }]}>{`${t('Phase')} ${index + 1}`}</Text>
                      <TouchableOpacity onPress={() => removeProjectPhase(index)} style={styles.phaseRemoveButton}>
                        <Ionicons name="close" size={18} color={textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.phaseFieldLabel, { color: textSecondary }]}>{t('Phase name / Title')}</Text>
                    <TextInput
                      style={[styles.phaseInput, { color: textBody, borderColor }]}
                      value={phase.title}
                      onChangeText={(text) => updateProjectPhase(index, 'title', text)}
                      placeholder={t('e.g. Design & Planning')}
                      placeholderTextColor={textSecondary}
                    />
                    <Text style={[styles.phaseFieldLabel, { color: textSecondary }]}>{t('Description')}</Text>
                    <TextInput
                      style={[styles.phaseInput, styles.phaseDescriptionInput, { color: textBody, borderColor }]}
                      value={phase.description}
                      onChangeText={(text) => updateProjectPhase(index, 'description', text)}
                      placeholder={t('Describe this phase')}
                      placeholderTextColor={textSecondary}
                      multiline
                      numberOfLines={2}
                    />
                    <View style={styles.phaseInlineRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.phaseFieldLabel, { color: textSecondary }]}>{t('Duration (days)')}</Text>
                        <TextInput
                          style={[styles.phaseInput, { color: textBody, borderColor }]}
                          value={phase.durationDays}
                          onChangeText={(text) => updateProjectPhase(index, 'durationDays', text)}
                          placeholder={t('e.g. 14')}
                          placeholderTextColor={textSecondary}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ width: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.phaseFieldLabel, { color: textSecondary }]}>{t('Amount (SAR)')}</Text>
                        <TextInput
                          style={[styles.phaseInput, { color: textBody, borderColor }]}
                          value={phase.amount}
                          onChangeText={(text) => updateProjectPhase(index, 'amount', text)}
                          placeholder={t('e.g. 5000')}
                          placeholderTextColor={textSecondary}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </AnimatedPhaseCard>
                ))
              ) : (
                <View style={[styles.phaseCard, { borderColor, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={[styles.phaseEmptyText, { color: textSecondary, textAlign: 'center' }]}>
                    {t('Add trackable stages for your project')}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={[styles.phaseModalAddBtn, { borderColor }]} onPress={addProjectPhase}>
                <Text style={[styles.phaseModalAddBtnText, { color: textSecondary }]}>+ {t('Add Phase')}</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity onPress={closePhasesModal} style={[styles.phaseModalDoneBtn, { backgroundColor: primaryBlue }]}>
              <Text style={styles.phaseModalDoneBtnText}>{t('Done')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
      <View style={{ height: 40 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentLargeWeb: {
    padding: 48,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  breadcrumbContainerLargeWeb: {
    paddingVertical: 32,
    gap: 56,
  },
  breadcrumbBack: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumbBackLargeWeb: {
    width: 40,
    height: 40,
  },
  breadcrumbTextContainer: {
    flex: 1,
  },
  breadcrumbTextContainerLargeWeb: {
    gap: 8,
  },
  breadcrumbTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  breadcrumbTitleLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  breadcrumbSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  breadcrumbSubtitleLargeWeb: {
    fontSize: 16,
    marginTop: 0,
  },
  flowContainer: {
    paddingVertical: 12,
  },
  flowContainerLargeWeb: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  divider: {
    height: 0.5,
    marginVertical: 8,
  },
  dividerLargeWeb: {
    marginVertical: 0,
    marginTop: 0,
    marginBottom: 24,
  },
  formHeader: {
    paddingVertical: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  formSubtitle: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  editableInput: {
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
      },
      default: {},
    }),
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 100,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: 14,
    flex: 1,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 200,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 0.5,
  },
  dropdownOptionText: {
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textArea: {
    padding: 16,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  singleLineInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
  },
  phaseAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  phaseAddButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phaseCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'transparent',
  },
  phaseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  phaseCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  phaseFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  phaseInput: {
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 10,
  },
  phaseDescriptionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  phaseInlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  phaseRemoveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  phaseChipText: {
    fontSize: 14,
  },
  phaseEmptyText: {
    fontSize: 13,
  },
  phaseModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  phaseModalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  phaseModalSheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: '100%',
    maxWidth: 520,
    maxHeight: '78%',
  },
  phaseModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  phaseModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  phaseModalCloseBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseModalCloseText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '400',
  },
  phaseModalSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  phaseModalList: {
    maxHeight: 360,
  },
  phaseModalListContent: {
    paddingBottom: 8,
  },
  phaseModalAddBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseModalAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phaseModalDoneBtn: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  phaseModalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  cardsRowWeb: {
    flexDirection: 'row',
  },
  statCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 0.5,
    minHeight: 100,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 14,
  },
  statCardInput: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  budgetInputWrapper: {
    borderRadius: 6,
    borderWidth: 1,
    marginVertical: 4,
  },
  budgetInput: {
    fontSize: 16,
    fontWeight: '600',
    padding: 10,
  },
  webDatePickerContainer: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  checkboxText: {
    fontSize: 11,
  },
  dateValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  miniDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 139, 62, 0.1)',
  },
  miniDateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    padding: 14,
    borderWidth: 0.5,
  },
  addressText: {
    fontSize: 14,
    flex: 1,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 11,
  },
  addPhotoButton: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 10,
    marginTop: 2,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: FIGMA_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: 28,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
  },
  // Title Section - Large Web (Figma Design)
  titleSectionLargeWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 48,
    paddingTop: 24,
    paddingBottom: 0,
  },
  titleBackButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  titleMainText: {
    fontSize: 42,
    fontWeight: '700',
    color: FIGMA_COLORS.bluePrimary100,
    lineHeight: 42,
  },
  titleSubtext: {
    fontSize: 20,
    fontWeight: '300',
    color: FIGMA_COLORS.textSecondary,
    lineHeight: 20,
  },
});
