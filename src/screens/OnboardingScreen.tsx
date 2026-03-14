import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  I18nManager,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import BonyadLogo from '../components/BonyadLogo';
import { AbsherLogoSvg } from '../assets/svg/AbsherLogo';
import { NafathLogoSvg } from '../assets/svg/NafathLogo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Brand colors (from iOS OnboardingView.swift)
const COLORS = {
  blue100: '#003867',
  blue90: '#004178',
  blue80: '#004A8A',
  blue70: '#00549B',
  blue60: '#005DAC',
  blue50: '#1A6DB4',
  blue40: '#4D8EC5',
  blue30: '#80AED6',
  blue20: '#B3CEE6',
  blue10: '#E6EFF7',
  amber100: '#916801',
  amber80: '#B68202',
  amber70: '#DA9C02',
  amber60: '#FFB703',
  amber50: '#FFD683',
  amber30: '#FFE9B6',
  green100: '#006A2D',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  textBody: '#383838',
  textSecond: '#A3A3A3',
  textDividers: '#D9D9D9',
  textBg: '#F0F0F0',
};

interface OnboardingScreenProps {
  onFinish: () => void;
  variant?: 'user' | 'technician';
}

// --- Dot Pattern Background ---
function DotPattern({ color = 'rgba(255,255,255,0.04)' }: { color?: string }) {
  const dots = [];
  const spacing = 28;
  const cols = Math.ceil(SCREEN_WIDTH / spacing);
  const rows = Math.ceil(SCREEN_HEIGHT / spacing);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <View
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            left: c * spacing,
            top: r * spacing,
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      );
    }
  }
  return <View style={StyleSheet.absoluteFill} pointerEvents="none">{dots}</View>;
}

// --- Page Indicator (capsule dots, iOS style) ---
function PageIndicator({
  total,
  current,
  activeColor = COLORS.amber60,
  inactiveColor = 'rgba(255,255,255,0.25)',
}: {
  total: number;
  current: number;
  activeColor?: string;
  inactiveColor?: string;
}) {
  return (
    <View style={styles.indicatorRow}>
      {Array.from({ length: total }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.indicatorDot,
            {
              width: i === current ? 22 : 7,
              backgroundColor: i === current ? activeColor : inactiveColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

// --- Task Row (checkmark + label, matches iOS TaskRow) ---
function TaskRow({ isDone, label }: { isDone: boolean; label: string }) {
  return (
    <View style={styles.taskRow}>
      <View
        style={[
          styles.taskCheck,
          { backgroundColor: isDone ? COLORS.blue60 : COLORS.blue10, borderColor: isDone ? 'transparent' : COLORS.blue20 },
        ]}
      >
        {isDone && <Text style={styles.taskCheckmark}>✓</Text>}
      </View>
      <Text
        style={[
          styles.taskLabel,
          isDone && { color: COLORS.textSecond, textDecorationLine: 'line-through' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// --- Pro Card (matches iOS ProCard) ---
function ProCard({
  initials,
  name,
  role,
  score,
  reviews,
  gradientColors,
  accentColor,
}: {
  initials: string;
  name: string;
  role: string;
  score: string;
  reviews: string;
  gradientColors: [string, string];
  accentColor: string;
}) {
  return (
    <View style={styles.proCard}>
      <View style={[styles.proAccent, { backgroundColor: accentColor }]} />
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.proAvatar}>
        <Text style={styles.proInitials}>{initials}</Text>
      </LinearGradient>
      <View style={styles.proInfo}>
        <Text style={styles.proName} numberOfLines={1}>{name}</Text>
        <Text style={styles.proRole} numberOfLines={1}>{role}</Text>
      </View>
      <View style={styles.proScore}>
        <Text style={styles.proScoreText}>{score}</Text>
        <Text style={styles.proReviews}>{reviews}</Text>
      </View>
    </View>
  );
}

// ================== SCREEN 1: WELCOME ==================
function WelcomeScreen() {
  const { t } = useTranslation();
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <DotPattern />
      <LinearGradient
        colors={[`${COLORS.blue60}66`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
      />
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeArabicTitle}>بُنْيَاد</Text>
        <Text style={styles.welcomeEnglishTitle}>Bonyad</Text>

        <View style={styles.welcomeLogoWrap}>
          <BonyadLogo size="large" variant="light" responsive={false} marginLeft={0} />
        </View>

        <Text style={styles.welcomeTagline}>
          {t('onboarding_tagline', { defaultValue: 'The premium construction management platform for Saudi Arabia & the Gulf.' })}
        </Text>

        <Text style={styles.welcomeTrustLabel}>
          {t('onboarding_trusted_integrations', { defaultValue: 'TRUSTED INTEGRATIONS' })}
        </Text>

        <View style={styles.trustLogosRow}>
          <View style={styles.trustLogoCard}>
            <SvgXml xml={AbsherLogoSvg} width={28} height={42} />
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustLogoCard}>
            <SvgXml xml={NafathLogoSvg} width={65} height={28} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ================== SCREEN 2: PROJECT TRACKING ==================
function ProjectTrackingScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue10 }]}>
      {/* Subtle decorative circle */}
      <View style={styles.decorativeCircle} />

      <Animated.View style={[styles.trackingContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.sectionBadge}>
          {t('onboarding_manage_projects', { defaultValue: 'MANAGE PROJECTS' })}
        </Text>
        <Text style={styles.trackingTitle}>
          {t('onboarding_track_detail_title', { defaultValue: 'Track every detail with ease' })}
        </Text>
        <Text style={styles.trackingSubtitle}>
          {t('onboarding_track_subtitle', { defaultValue: 'Monitor timelines, assign tasks, and keep projects perfectly on schedule.' })}
        </Text>

        {/* Project Card */}
        <View style={styles.projectCard}>
          <LinearGradient colors={[COLORS.blue60, COLORS.blue40]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.projectCardStripe} />
          <View style={styles.projectCardBody}>
            <View style={styles.projectCardHeader}>
              <Text style={styles.projectName} numberOfLines={1}>
                {t('onboarding_project_name', { defaultValue: 'Al-Nakheel Villa — Phase 2' })}
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {t('onboarding_project_status', { defaultValue: 'IN PROGRESS' })}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={[COLORS.blue70, COLORS.blue40]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: '68%' }]}
              />
            </View>

            <View style={styles.progressStats}>
              <Text style={styles.progressStatText}>68% {t('complete', { defaultValue: 'complete' })}</Text>
              <Text style={styles.progressStatBold}>12 {t('days_left', { defaultValue: 'days left' })}</Text>
            </View>

            <View style={styles.tasksList}>
              <TaskRow isDone label={t('onboarding_task_1', { defaultValue: 'Foundation inspection' })} />
              <TaskRow isDone label={t('onboarding_task_2', { defaultValue: 'Electrical rough-in' })} />
              <TaskRow isDone={false} label={t('onboarding_task_3', { defaultValue: 'Plumbing installation' })} />
            </View>
          </View>
        </View>

        {/* Map preview */}
        <View style={styles.mapPreview}>
          <View style={styles.mapGrid}>
            {/* Roads */}
            <View style={[styles.mapRoadH, { top: '50%' }]} />
            <View style={[styles.mapRoadV, { left: '32%' }]} />
            <View style={[styles.mapRoadH, { top: '27%', height: 3 }]} />
            <View style={[styles.mapRoadH, { top: '75%', height: 3 }]} />
            <View style={[styles.mapRoadV, { left: '67%', width: 3 }]} />
            {/* Blocks */}
            <View style={[styles.mapBlock, { top: '1%', left: '1%', width: '12%', height: '23%' }]} />
            <View style={[styles.mapBlock, { top: '1%', left: '17%', width: '12%', height: '23%' }]} />
            <View style={[styles.mapBlock, { top: '1%', left: '34%', width: '30%', height: '23%' }]} />
            <View style={[styles.mapBlock, { top: '1%', left: '69%', width: '30%', height: '23%' }]} />
            <View style={[styles.mapBlockAlt, { top: '29%', left: '1%', width: '12%', height: '18%' }]} />
            <View style={[styles.mapBlockAlt, { top: '29%', left: '69%', width: '30%', height: '18%' }]} />
            {/* Highlighted area */}
            <View style={styles.mapHighlight} />
            {/* Pin */}
            <View style={styles.mapPin}>
              <Ionicons name="location" size={22} color={COLORS.blue60} />
            </View>
            {/* Location label */}
            <View style={styles.mapLabel}>
              <Text style={styles.mapLabelText}>
                {t('onboarding_map_label', { defaultValue: 'Al-Nakheel Villa' })}
              </Text>
            </View>
            {/* Compass */}
            <View style={styles.mapCompass}>
              <Text style={styles.mapCompassN}>N</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ================== SCREEN 3: FIND PROFESSIONALS ==================
function FindProfessionalsScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue90 }]}>
      <LinearGradient
        colors={[`${COLORS.blue60}4D`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.15, y: 0.55 }}
      />
      <LinearGradient
        colors={[`${COLORS.amber60}1A`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0.6 }}
      />

      <Animated.View style={[styles.prosContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={[styles.sectionBadge, { color: COLORS.amber60 }]}>
          {t('onboarding_find_professionals', { defaultValue: 'FIND PROFESSIONALS' })}
        </Text>
        <Text style={styles.prosTitle}>
          {t('onboarding_hire_best_title', { defaultValue: 'Hire the best, build the rest' })}
        </Text>
        <Text style={styles.prosSubtitle}>
          {t('onboarding_connect_professionals', { defaultValue: 'Connect with verified contractors, engineers, and specialists across the Gulf.' })}
        </Text>

        <View style={styles.proCards}>
          <ProCard
            initials="AR"
            name={t('onboarding_pro_1_name', { defaultValue: 'Ahmed Al-Rashidi' })}
            role={t('onboarding_pro_1_role', { defaultValue: 'Structural Engineer · Riyadh' })}
            score="4.9"
            reviews={t('onboarding_reviews', { defaultValue: '32 reviews', count: 32 })}
            gradientColors={[COLORS.blue80, COLORS.blue50]}
            accentColor={COLORS.blue40}
          />
          <ProCard
            initials="KO"
            name={t('onboarding_pro_2_name', { defaultValue: 'Khalid Al-Otaibi' })}
            role={t('onboarding_pro_2_role', { defaultValue: 'General Contractor · Jeddah' })}
            score="4.8"
            reviews={t('onboarding_reviews', { defaultValue: '18 reviews', count: 18 })}
            gradientColors={[COLORS.amber100, COLORS.amber70]}
            accentColor={COLORS.amber60}
          />
          <ProCard
            initials="OG"
            name={t('onboarding_pro_3_name', { defaultValue: 'Omar Al-Ghamdi' })}
            role={t('onboarding_pro_3_role', { defaultValue: 'Electrical Specialist · Dammam' })}
            score="4.7"
            reviews={t('onboarding_reviews', { defaultValue: '25 reviews', count: 25 })}
            gradientColors={[COLORS.green100, COLORS.green60]}
            accentColor={COLORS.green60}
          />
        </View>

        {/* Trusted Integration Card */}
        <View style={styles.trustedCard}>
          <Text style={styles.trustedLabel}>
            {t('onboarding_verified_with', { defaultValue: 'DOCUMENTS SIGNED & VERIFIED WITH' })}
          </Text>
          <View style={styles.trustedLogos}>
            <View style={styles.trustedLogoBox}>
              <SvgXml xml={AbsherLogoSvg} width={28} height={42} />
            </View>
            <View style={styles.trustedLogoDivider} />
            <View style={styles.trustedLogoBox}>
              <SvgXml xml={NafathLogoSvg} width={65} height={28} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ================== TECHNICIAN SCREEN 1: WIN PROJECTS ==================
function TechWinProjectsScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue100 }]}>
      <DotPattern />
      <LinearGradient
        colors={[`${COLORS.green60}33`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.2, y: 0.6 }}
      />
      <LinearGradient
        colors={[`${COLORS.blue60}4D`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.8 }}
        end={{ x: 1, y: 0.3 }}
      />

      <Animated.View style={[techStyles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={[styles.sectionBadge, { color: COLORS.green60 }]}>
          {t('tech_onboarding_win_projects', { defaultValue: 'WIN PROJECTS' })}
        </Text>
        <Text style={techStyles.title}>
          {t('tech_onboarding_win_title', { defaultValue: 'Win the right projects faster' })}
        </Text>
        <Text style={techStyles.subtitle}>
          {t('tech_onboarding_win_subtitle', { defaultValue: 'Showcase your expertise and receive qualified leads as soon as they go live.' })}
        </Text>

        <View style={techStyles.projectCards}>
          <TechProjectCard
            category={t('tech_onboarding_cat_electrical', { defaultValue: 'Electrical' })}
            title={t('tech_onboarding_proj_1_title', { defaultValue: 'Office Rewiring — Al Olaya' })}
            budget={t('tech_onboarding_proj_1_budget', { defaultValue: 'SAR 45,000' })}
            location={t('tech_onboarding_proj_1_location', { defaultValue: 'Riyadh' })}
            urgency={t('tech_onboarding_proj_urgent', { defaultValue: 'Urgent' })}
            accentColor={COLORS.amber60}
            iconName="flash"
          />
          <TechProjectCard
            category={t('tech_onboarding_cat_plumbing', { defaultValue: 'Plumbing' })}
            title={t('tech_onboarding_proj_2_title', { defaultValue: 'Villa Water System — Al Hamra' })}
            budget={t('tech_onboarding_proj_2_budget', { defaultValue: 'SAR 28,000' })}
            location={t('tech_onboarding_proj_2_location', { defaultValue: 'Jeddah' })}
            urgency={null}
            accentColor={COLORS.blue40}
            iconName="water"
          />
          <TechProjectCard
            category={t('tech_onboarding_cat_construction', { defaultValue: 'General Construction' })}
            title={t('tech_onboarding_proj_3_title', { defaultValue: 'Warehouse Extension — Phase 1' })}
            budget={t('tech_onboarding_proj_3_budget', { defaultValue: 'SAR 120,000' })}
            location={t('tech_onboarding_proj_3_location', { defaultValue: 'Dammam' })}
            urgency={null}
            accentColor={COLORS.green60}
            iconName="construct"
          />
        </View>

        <View style={techStyles.statRow}>
          <View style={techStyles.statItem}>
            <Text style={techStyles.statNumber}>150+</Text>
            <Text style={techStyles.statLabel}>
              {t('tech_onboarding_active_projects', { defaultValue: 'Active Projects' })}
            </Text>
          </View>
          <View style={techStyles.statDivider} />
          <View style={techStyles.statItem}>
            <Text style={techStyles.statNumber}>24h</Text>
            <Text style={techStyles.statLabel}>
              {t('tech_onboarding_avg_response', { defaultValue: 'Avg. Response' })}
            </Text>
          </View>
          <View style={techStyles.statDivider} />
          <View style={techStyles.statItem}>
            <Text style={techStyles.statNumber}>98%</Text>
            <Text style={techStyles.statLabel}>
              {t('tech_onboarding_satisfaction', { defaultValue: 'Satisfaction' })}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function TechProjectCard({
  category,
  title,
  budget,
  location,
  urgency,
  accentColor,
  iconName,
}: {
  category: string;
  title: string;
  budget: string;
  location: string;
  urgency: string | null;
  accentColor: string;
  iconName: string;
}) {
  return (
    <View style={techStyles.projectCard}>
      <View style={[techStyles.projectCardAccent, { backgroundColor: accentColor }]} />
      <View style={techStyles.projectCardIcon}>
        <Ionicons name={iconName as any} size={18} color={accentColor} />
      </View>
      <View style={techStyles.projectCardInfo}>
        <Text style={techStyles.projectCardCategory}>{category}</Text>
        <Text style={techStyles.projectCardTitle} numberOfLines={1}>{title}</Text>
        <View style={techStyles.projectCardMeta}>
          <Text style={techStyles.projectCardBudget}>{budget}</Text>
          <View style={techStyles.projectCardDot} />
          <Ionicons name="location-outline" size={10} color={COLORS.blue30} />
          <Text style={techStyles.projectCardLocation}>{location}</Text>
        </View>
      </View>
      {urgency && (
        <View style={techStyles.urgencyBadge}>
          <Ionicons name="time-outline" size={9} color={COLORS.amber60} />
          <Text style={techStyles.urgencyText}>{urgency}</Text>
        </View>
      )}
    </View>
  );
}

// ================== TECHNICIAN SCREEN 2: MANAGE BIDS ==================
function TechManageBidsScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue10 }]}>
      <View style={styles.decorativeCircle} />

      <Animated.View style={[techStyles.lightContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.sectionBadge}>
          {t('tech_onboarding_manage_bids', { defaultValue: 'MANAGE BIDS' })}
        </Text>
        <Text style={styles.trackingTitle}>
          {t('tech_onboarding_manage_title', { defaultValue: 'Manage bids and phases with ease' })}
        </Text>
        <Text style={styles.trackingSubtitle}>
          {t('tech_onboarding_manage_subtitle', { defaultValue: 'Submit professional offers, negotiate milestones, and keep every phase on track.' })}
        </Text>

        {/* Bid Card */}
        <View style={techStyles.bidCard}>
          <View style={techStyles.bidCardHeader}>
            <View>
              <Text style={techStyles.bidCardLabel}>
                {t('tech_onboarding_your_bid', { defaultValue: 'Your Bid' })}
              </Text>
              <Text style={techStyles.bidCardProject}>
                {t('tech_onboarding_bid_project', { defaultValue: 'Al-Nakheel Villa — Electrical' })}
              </Text>
            </View>
            <View style={techStyles.bidStatusBadge}>
              <Text style={techStyles.bidStatusText}>
                {t('tech_onboarding_bid_status', { defaultValue: 'SUBMITTED' })}
              </Text>
            </View>
          </View>

          <View style={techStyles.bidAmountRow}>
            <Text style={techStyles.bidAmountLabel}>
              {t('tech_onboarding_bid_amount', { defaultValue: 'Bid Amount' })}
            </Text>
            <Text style={techStyles.bidAmountValue}>SAR 42,500</Text>
          </View>

          {/* Phases timeline */}
          <View style={techStyles.phasesContainer}>
            <Text style={techStyles.phasesTitle}>
              {t('tech_onboarding_milestones', { defaultValue: 'Milestones' })}
            </Text>
            <TechPhaseRow
              number="1"
              label={t('tech_onboarding_phase_1', { defaultValue: 'Rough-in wiring' })}
              amount="SAR 15,000"
              status="done"
            />
            <TechPhaseRow
              number="2"
              label={t('tech_onboarding_phase_2', { defaultValue: 'Panel installation' })}
              amount="SAR 12,500"
              status="active"
            />
            <TechPhaseRow
              number="3"
              label={t('tech_onboarding_phase_3', { defaultValue: 'Final fixtures & testing' })}
              amount="SAR 15,000"
              status="pending"
            />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={techStyles.lightStatRow}>
          <View style={techStyles.lightStatCard}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.blue60} />
            <Text style={techStyles.lightStatNumber}>12</Text>
            <Text style={techStyles.lightStatLabel}>
              {t('tech_onboarding_total_bids', { defaultValue: 'Bids Sent' })}
            </Text>
          </View>
          <View style={techStyles.lightStatCard}>
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.green60} />
            <Text style={techStyles.lightStatNumber}>8</Text>
            <Text style={techStyles.lightStatLabel}>
              {t('tech_onboarding_won_bids', { defaultValue: 'Won' })}
            </Text>
          </View>
          <View style={techStyles.lightStatCard}>
            <Ionicons name="trending-up-outline" size={18} color={COLORS.amber60} />
            <Text style={techStyles.lightStatNumber}>67%</Text>
            <Text style={techStyles.lightStatLabel}>
              {t('tech_onboarding_win_rate', { defaultValue: 'Win Rate' })}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function TechPhaseRow({
  number,
  label,
  amount,
  status,
}: {
  number: string;
  label: string;
  amount: string;
  status: 'done' | 'active' | 'pending';
}) {
  const bgColor = status === 'done' ? COLORS.green60 : status === 'active' ? COLORS.blue60 : COLORS.textBg;
  const textColor = status === 'pending' ? COLORS.textSecond : '#fff';
  const labelColor = status === 'pending' ? COLORS.textSecond : COLORS.textBody;
  const amountColor = status === 'done' ? COLORS.green60 : status === 'active' ? COLORS.blue60 : COLORS.textSecond;

  return (
    <View style={techStyles.phaseRow}>
      <View style={[techStyles.phaseCircle, { backgroundColor: bgColor }]}>
        {status === 'done' ? (
          <Ionicons name="checkmark" size={10} color="#fff" />
        ) : (
          <Text style={[techStyles.phaseNumber, { color: textColor }]}>{number}</Text>
        )}
      </View>
      <View style={[techStyles.phaseLine, status === 'pending' ? { backgroundColor: COLORS.textBg } : { backgroundColor: COLORS.blue20 }]} />
      <View style={techStyles.phaseInfo}>
        <Text style={[techStyles.phaseLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[techStyles.phaseAmount, { color: amountColor }]}>{amount}</Text>
      </View>
    </View>
  );
}

// ================== TECHNICIAN SCREEN 3: SECURE PAYMENTS ==================
function TechSecurePaymentsScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue90 }]}>
      <LinearGradient
        colors={[`${COLORS.amber60}26`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.2, y: 0.55 }}
      />
      <LinearGradient
        colors={[`${COLORS.green60}1A`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0.6 }}
      />

      <Animated.View style={[techStyles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={[styles.sectionBadge, { color: COLORS.amber60 }]}>
          {t('tech_onboarding_secure_payments', { defaultValue: 'SECURE PAYMENTS' })}
        </Text>
        <Text style={techStyles.title}>
          {t('tech_onboarding_secure_title', { defaultValue: 'Secure payments and continuous support' })}
        </Text>
        <Text style={techStyles.subtitle}>
          {t('tech_onboarding_secure_subtitle', { defaultValue: 'Protect your work with milestone payouts and dedicated support on every project.' })}
        </Text>

        {/* Payment Flow */}
        <View style={techStyles.paymentFlow}>
          <TechPaymentStep
            icon="shield-checkmark"
            iconColor={COLORS.green60}
            title={t('tech_onboarding_escrow_title', { defaultValue: 'Escrow Protection' })}
            description={t('tech_onboarding_escrow_desc', { defaultValue: 'Funds held securely until milestones are verified and approved.' })}
          />
          <View style={techStyles.paymentFlowLine} />
          <TechPaymentStep
            icon="wallet"
            iconColor={COLORS.blue40}
            title={t('tech_onboarding_milestone_pay_title', { defaultValue: 'Milestone Payouts' })}
            description={t('tech_onboarding_milestone_pay_desc', { defaultValue: 'Get paid as you complete each phase — no waiting until the end.' })}
          />
          <View style={techStyles.paymentFlowLine} />
          <TechPaymentStep
            icon="headset"
            iconColor={COLORS.amber60}
            title={t('tech_onboarding_support_title', { defaultValue: 'Dedicated Support' })}
            description={t('tech_onboarding_support_desc', { defaultValue: 'Resolve disputes quickly with our mediation and support team.' })}
          />
        </View>

        {/* Trusted Card */}
        <View style={styles.trustedCard}>
          <Text style={styles.trustedLabel}>
            {t('onboarding_verified_with', { defaultValue: 'DOCUMENTS SIGNED & VERIFIED WITH' })}
          </Text>
          <View style={styles.trustedLogos}>
            <View style={styles.trustedLogoBox}>
              <SvgXml xml={AbsherLogoSvg} width={28} height={42} />
            </View>
            <View style={styles.trustedLogoDivider} />
            <View style={styles.trustedLogoBox}>
              <SvgXml xml={NafathLogoSvg} width={65} height={28} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function TechPaymentStep({
  icon,
  iconColor,
  title,
  description,
}: {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <View style={techStyles.paymentStep}>
      <View style={[techStyles.paymentStepIcon, { borderColor: `${iconColor}40` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={techStyles.paymentStepInfo}>
        <Text style={techStyles.paymentStepTitle}>{title}</Text>
        <Text style={techStyles.paymentStepDesc}>{description}</Text>
      </View>
    </View>
  );
}

// ================== TECHNICIAN STYLES ==================
const techStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.085,
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  lightContent: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.08,
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  title: {
    fontSize: Math.min(SCREEN_WIDTH * 0.075, 32),
    fontWeight: '700',
    color: '#fff',
    lineHeight: Math.min(SCREEN_WIDTH * 0.095, 40),
    marginBottom: SCREEN_HEIGHT * 0.008,
  },
  subtitle: {
    fontSize: Math.max(SCREEN_WIDTH * 0.032, 12),
    color: COLORS.blue20,
    lineHeight: 19,
    marginBottom: SCREEN_HEIGHT * 0.025,
  },

  // Project cards (Tech Screen 1)
  projectCards: {
    gap: 8,
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 11,
    paddingRight: 12,
    overflow: 'hidden',
  },
  projectCardAccent: {
    width: 3,
    height: '100%',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  projectCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  projectCardInfo: {
    flex: 1,
  },
  projectCardCategory: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.blue30,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  projectCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  projectCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectCardBudget: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.amber60,
  },
  projectCardDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.blue30,
  },
  projectCardLocation: {
    fontSize: 10,
    color: COLORS.blue30,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${COLORS.amber60}1A`,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.amber60,
  },

  // Stats row (Tech Screen 1)
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.blue20,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Bid card (Tech Screen 2)
  bidCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.blue100,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    padding: 16,
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  bidCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bidCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textSecond,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  bidCardProject: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blue100,
  },
  bidStatusBadge: {
    backgroundColor: `${COLORS.green60}1A`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bidStatusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.green60,
  },
  bidAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textBg,
    marginBottom: 12,
  },
  bidAmountLabel: {
    fontSize: 11,
    color: COLORS.textSecond,
  },
  bidAmountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.blue100,
  },

  // Phases (Tech Screen 2)
  phasesContainer: {
    gap: 0,
  },
  phasesTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textSecond,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  phaseCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNumber: {
    fontSize: 10,
    fontWeight: '700',
  },
  phaseLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 6,
  },
  phaseInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  phaseAmount: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Light stat row (Tech Screen 2)
  lightStatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lightStatCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: COLORS.blue100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  lightStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.blue100,
    marginTop: 4,
  },
  lightStatLabel: {
    fontSize: 9,
    color: COLORS.textSecond,
    marginTop: 2,
  },

  // Payment flow (Tech Screen 3)
  paymentFlow: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  paymentStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentStepIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentStepInfo: {
    flex: 1,
  },
  paymentStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  paymentStepDesc: {
    fontSize: 11,
    color: COLORS.blue20,
    lineHeight: 15,
  },
  paymentFlowLine: {
    width: 2,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginLeft: 20,
    marginVertical: 4,
  },
});

// ================== MAIN ONBOARDING VIEW ==================
export default function OnboardingScreen({ onFinish, variant = 'user' }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const totalPages = 3;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / SCREEN_WIDTH);
      if (page !== currentPage && page >= 0 && page < totalPages) {
        setCurrentPage(page);
      }
    },
    [currentPage],
  );

  const goToPage = useCallback(
    (page: number) => {
      scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * page, animated: true });
      setCurrentPage(page);
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    } else {
      onFinish();
    }
  }, [currentPage, goToPage, onFinish]);

  const handleSkip = useCallback(() => {
    onFinish();
  }, [onFinish]);

  const isTech = variant === 'technician';
  const bgColor = isTech
    ? (currentPage === 0 ? COLORS.blue100 : currentPage === 1 ? COLORS.blue10 : COLORS.blue90)
    : (currentPage === 0 ? COLORS.blue100 : currentPage === 1 ? COLORS.blue10 : COLORS.blue90);
  const isDarkBg = currentPage !== 1;
  const indicatorInactive = isDarkBg ? 'rgba(255,255,255,0.25)' : `${COLORS.blue100}33`;

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkBg ? 'light-content' : 'dark-content'} backgroundColor={bgColor} translucent />

      {/* Pages */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={StyleSheet.absoluteFill}
      >
        {isTech ? (
          <>
            <TechWinProjectsScreen />
            <TechManageBidsScreen />
            <TechSecurePaymentsScreen />
          </>
        ) : (
          <>
            <WelcomeScreen />
            <ProjectTrackingScreen />
            <FindProfessionalsScreen />
          </>
        )}
      </ScrollView>

      {/* Bottom gradient fade */}
      <View style={[styles.bottomGradientWrap, { height: 80 + 56 + insets.bottom + 16 }]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', `${bgColor}CC`, bgColor]}
          style={{ flex: 1 }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
            </View>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {/* Skip */}
        {currentPage < totalPages - 1 ? (
          <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.skipText, { color: isDarkBg ? COLORS.blue30 : COLORS.textSecond }]}>
              {t('Skip', { defaultValue: 'Skip' })}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}

        {/* Page Indicator */}
        <PageIndicator
          total={totalPages}
          current={currentPage}
          activeColor={COLORS.amber60}
          inactiveColor={indicatorInactive}
        />

        {/* Next / Get Started */}
          {currentPage === totalPages - 1 ? (
          <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
            <LinearGradient
              colors={[COLORS.amber70, COLORS.amber60]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.getStartedBtn}
            >
              <Text style={[styles.btnLabel, { color: COLORS.blue100 }]}>
                {t('Get Started', { defaultValue: "Let's Start" })}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.blue100} style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.nextBtn}>
            <Text style={styles.btnLabel}>{t('Next', { defaultValue: 'Next' })}</Text>
            <View style={styles.nextChevronCircle}>
              <Ionicons name="chevron-forward" size={11} color="#fff" />
            </View>
        </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ================== STYLES ==================
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // --- Pages ---
  page: {
    flex: 1,
    height: SCREEN_HEIGHT,
  },

  // --- Indicator ---
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  indicatorDot: {
    height: 7,
    borderRadius: 3.5,
  },

  // --- Bottom ---
  bottomGradientWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 56,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blue60,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 28,
    shadowColor: COLORS.blue60,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 28,
    shadowColor: COLORS.amber60,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  nextChevronCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // ============ WELCOME SCREEN ============
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.06,
    paddingTop: SCREEN_HEIGHT * 0.12,
  },
  welcomeArabicTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.09, 36),
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeEnglishTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.06, 28),
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  welcomeLogoWrap: {
    backgroundColor: COLORS.blue80,
    borderRadius: SCREEN_WIDTH * 0.07,
    padding: SCREEN_WIDTH * 0.05,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  welcomeTagline: {
    fontSize: Math.max(SCREEN_WIDTH * 0.035, 13),
    color: COLORS.blue20,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: Math.min(SCREEN_WIDTH * 0.85, 300),
    marginBottom: SCREEN_HEIGHT * 0.04,
  },
  welcomeTrustLabel: {
    fontSize: Math.max(SCREEN_WIDTH * 0.025, 9),
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.blue30,
    textTransform: 'uppercase',
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  trustLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trustLogoCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  trustLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  trustDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // ============ PROJECT TRACKING SCREEN ============
  decorativeCircle: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.25,
    right: -SCREEN_WIDTH * 0.2,
    width: Math.min(400, SCREEN_WIDTH * 1.1),
    height: Math.min(400, SCREEN_WIDTH * 1.1),
    borderRadius: 200,
    borderWidth: 70,
    borderColor: `${COLORS.blue100}0D`,
  },
  trackingContent: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.08,
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  sectionBadge: {
    fontSize: Math.max(SCREEN_WIDTH * 0.027, 10),
    fontWeight: '700',
    letterSpacing: 3,
    color: COLORS.blue60,
    textTransform: 'uppercase',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  trackingTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.075, 32),
    fontWeight: '700',
    color: COLORS.blue100,
    lineHeight: Math.min(SCREEN_WIDTH * 0.095, 40),
    marginBottom: SCREEN_HEIGHT * 0.008,
  },
  trackingSubtitle: {
    fontSize: Math.max(SCREEN_WIDTH * 0.033, 13),
    color: COLORS.textBody,
    lineHeight: 20,
    marginBottom: SCREEN_HEIGHT * 0.018,
  },

  // Project Card
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.blue100,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: SCREEN_HEIGHT * 0.018,
  },
  projectCardStripe: {
    height: 3,
  },
  projectCardBody: {
    padding: 14,
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  projectName: {
    fontSize: Math.max(SCREEN_WIDTH * 0.033, 13),
    fontWeight: '700',
    color: COLORS.blue100,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: `${COLORS.blue60}1A`,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: Math.max(SCREEN_WIDTH * 0.024, 9),
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.blue60,
  },

  // Progress bar
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.textBg,
    marginBottom: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 5,
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SCREEN_HEIGHT * 0.012,
  },
  progressStatText: {
    fontSize: Math.max(SCREEN_WIDTH * 0.028, 11),
    color: COLORS.textSecond,
  },
  progressStatBold: {
    fontSize: Math.max(SCREEN_WIDTH * 0.028, 11),
    fontWeight: '600',
    color: COLORS.textBody,
  },

  // Tasks
  tasksList: {
    gap: 7,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  taskCheck: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckmark: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
  taskLabel: {
    fontSize: 11,
    color: COLORS.textBody,
  },

  // Map
  mapPreview: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.blue20,
    backgroundColor: '#E8F0F8',
    height: Math.max(SCREEN_HEIGHT * 0.22, 140),
    shadowColor: COLORS.blue100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  mapGrid: {
    flex: 1,
    position: 'relative',
  },
  mapRoadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#fff',
  },
  mapRoadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#fff',
  },
  mapBlock: {
    position: 'absolute',
    backgroundColor: '#D0DDE8',
    borderRadius: 4,
  },
  mapBlockAlt: {
    position: 'absolute',
    backgroundColor: '#D8D4EE',
    borderRadius: 4,
  },
  mapHighlight: {
    position: 'absolute',
    top: '30%',
    left: '34%',
    width: '31%',
    height: '17%',
    backgroundColor: COLORS.blue20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.blue60,
  },
  mapPin: {
    position: 'absolute',
    top: '22%',
    left: '46%',
  },
  mapLabel: {
    position: 'absolute',
    top: '10%',
    left: '35%',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.blue100,
  },
  mapCompass: {
    position: 'absolute',
    top: '5%',
    right: '5%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCompassN: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.blue100,
  },

  // ============ FIND PROFESSIONALS SCREEN ============
  prosContent: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.085,
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  prosTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.08, 32),
    fontWeight: '700',
    color: '#fff',
    lineHeight: Math.min(SCREEN_WIDTH * 0.1, 40),
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  prosSubtitle: {
    fontSize: Math.max(SCREEN_WIDTH * 0.032, 12),
    color: COLORS.blue20,
    lineHeight: 19,
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  proCards: {
    gap: 8,
    marginBottom: SCREEN_HEIGHT * 0.02,
  },

  // Pro Card
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingRight: 12,
    overflow: 'hidden',
  },
  proAccent: {
    width: 3,
    height: '100%',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  proAvatar: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  proInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  proInfo: {
    flex: 1,
  },
  proName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  proRole: {
    fontSize: 10,
    color: COLORS.blue20,
    marginTop: 1,
  },
  proScore: {
    alignItems: 'flex-end',
  },
  proScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.amber60,
  },
  proReviews: {
    fontSize: 9,
    color: COLORS.blue20,
    marginTop: 1,
  },

  // Trusted Integration Card
  trustedCard: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trustedLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.blue20,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  trustedLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trustedLogoBox: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustedLogoIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  trustedLogoDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
