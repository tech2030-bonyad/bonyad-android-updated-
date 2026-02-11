import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProjectTypeSelectionScreenProps {
  onSelectLarge: () => void;
  onSelectSmall: () => void;
  onBack?: () => void;
}

export default function ProjectTypeSelectionScreen({
  onSelectLarge,
  onSelectSmall,
  onBack,
}: ProjectTypeSelectionScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSelect = (callback: () => void) => {
    // Exit animation before navigation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      {onBack && (
        <View style={[
          styles.header, 
          { 
            paddingTop: Math.max(insets.top, 20),
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }
        ]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons 
              name={isRTL ? "arrow-forward" : "arrow-back"} 
              size={24} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>
      )}

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('Create New')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('Choose the type of project you want to create')}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
          {/* Large Project Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.primary + '30',
                shadowColor: colors.primary,
              },
            ]}
            onPress={() => handleSelect(onSelectLarge)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="business-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {t('Large Project')}
            </Text>
          </TouchableOpacity>

          {/* Small Task Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: '#FFB703' + '30',
                shadowColor: '#FFB703',
              },
            ]}
            onPress={() => handleSelect(onSelectSmall)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FFB703' + '15' }]}>
              <Ionicons name="construct-outline" size={48} color="#FFB703" />
            </View>
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {t('Small Task')}
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 20,
    paddingBottom: 40,
  },
  optionCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
});
