import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import BonyadLogo from '../components/BonyadLogo';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onFinish: () => void;
}

// Page data for the 3 onboarding pages
const getPages = (t: (key: string) => string) => [
  {
    id: 1,
    title: t('Welcome to Bonyad'),
    subtitle: t('onboarding.page1.subtitle'),
    description: t('onboarding.page1.description'),
    icon: 'home',
  },
  {
    id: 2,
    title: t('Find Expert Technicians'),
    subtitle: t('onboarding.page2.subtitle'),
    description: t('onboarding.page2.description'),
    icon: 'users',
  },
  {
    id: 3,
    title: t("Let's Get Started!"),
    subtitle: t('onboarding.page3.subtitle'),
    description: t('onboarding.page3.description'),
    icon: 'rocket',
  },
];

export default function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const pages = getPages(t);
  const totalPages = pages.length;

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      const nextPage = currentPage + 1;
      scrollViewRef.current?.scrollTo({ x: width * nextPage, animated: true });
      setCurrentPage(nextPage);
    } else {
      onFinish();
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(contentOffsetX / width);
    setCurrentPage(pageIndex);
  };

  const scrollToPage = (pageIndex: number) => {
    scrollViewRef.current?.scrollTo({ x: width * pageIndex, animated: true });
    setCurrentPage(pageIndex);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>{t('Skip')}</Text>
      </TouchableOpacity>

      {/* Bonyad Logo - Centered at top */}
      <View style={styles.logoContainer}>
        <BonyadLogo size="large" variant="dark" responsive />
      </View>

      {/* Scrollable Pages */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {pages.map((page, index) => (
          <View key={page.id} style={styles.pageContainer}>
            {/* Icon Circle */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Feather 
                  name={page.icon as any} 
                  size={40} 
                  color="#00549B" 
                />
              </View>
            </View>

            {/* Text Content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{page.title}</Text>
              <Text style={styles.subtitle}>{page.subtitle}</Text>
              <Text style={styles.description}>{page.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Section - Dots and Button */}
      <View style={styles.bottomContainer}>
        {/* Page Indicators */}
        <View style={styles.dotsContainer}>
          {pages.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToPage(index)}
              style={[
                styles.dot,
                currentPage === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* Next/Get Started Button */}
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={handleNext}
          activeOpacity={0.8}
        >
          {currentPage === totalPages - 1 ? (
            <>
              <Text style={styles.buttonText}>{t('Get Started')}</Text>
              <MaterialIcons name="check" size={20} color="#fff" />
            </>
          ) : (
            <>
              <Text style={styles.buttonText}>{t('Next')}</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: height * 0.02,
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    width: width,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: height * 0.04,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: width < 375 ? 24 : 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: width < 375 ? 16 : 18,
    fontWeight: '600',
    color: '#00549B',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: width < 375 ? 14 : 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  bottomContainer: {
    paddingHorizontal: 32,
    paddingBottom: height * 0.05,
    paddingTop: height * 0.02,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d1d5db',
  },
  activeDot: {
    width: 28,
    backgroundColor: '#00549B',
  },
  nextButton: {
    backgroundColor: '#00549B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#00549B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
