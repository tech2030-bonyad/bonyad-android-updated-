import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useRTL } from '../hooks/useRTL';
import onboardingStorage from '../services/onboardingStorage';
import {
  markOnboardingComplete,
  fetchServices,
  fetchSubscriptionPlans,
  saveServices,
  subscribeToPlan,
  Service,
  SubscriptionPlan,
} from '../services/onboardingApi';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import RialIcon from '../components/RialIcon';
import { getTopPadding } from '../utils/statusBarHelper';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4;

interface TaskType {
  id: number;
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  isActive: boolean;
}

export interface TechnicianOnboardingScreenProps {
  token: string;
  userId: number;
  onFinished: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const P = '#005DAC';
const P_LIGHT = '#E8F4FF';
const P_MID   = '#B3D1F5';
const SCREEN_W = Dimensions.get('window').width;


// ─── Step progress bar ────────────────────────────────────────────────────────
const STEP_META = [
  { icon: 'construct-outline'     as const, labelKey: 'onboarding.steps.services'         },
  { icon: 'flash-outline'         as const, labelKey: 'onboarding.steps.specializations'  },
  { icon: 'card-outline'          as const, labelKey: 'onboarding.steps.subscription'     },
  { icon: 'checkmark-done-outline'as const, labelKey: 'onboarding.steps.summary'          },
];

function StepProgressBar({ current, t, isDark, isRTL }: { current: Step; t: TFunction; isDark: boolean; isRTL?: boolean }) {
  const lineAnims = useRef(STEP_META.slice(0, -1).map(() => new Animated.Value(0))).current;

  useEffect(() => {
    lineAnims.forEach((anim, idx) => {
      Animated.timing(anim, {
        toValue: current > idx + 1 ? 1 : 0,
        duration: 350,
        useNativeDriver: false,
      }).start();
    });
  }, [current]);

  return (
    <View style={[pb.wrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {STEP_META.map((meta, idx) => {
        const stepNum = (idx + 1) as Step;
        const done    = current > stepNum;
        const active  = current === stepNum;
        const dotBg   = done || active ? P : (isDark ? '#2A2A3A' : '#E0E0E0');
        const dotBorder = done || active ? P : (isDark ? '#3A3A4A' : '#D0D0D0');
        const labelColor = active ? P : done ? (isDark ? '#AAC8F0' : P) : (isDark ? '#555577' : '#AAAAAA');

        return (
          <React.Fragment key={idx}>
            <View style={pb.stepCol}>
              <View style={[pb.dot, { backgroundColor: dotBg, borderColor: dotBorder }]}>
                {done
                  ? <Ionicons name="checkmark" size={13} color="#fff" />
                  : active
                    ? <Ionicons name={meta.icon} size={13} color="#fff" />
                    : <Text style={pb.dotNum}>{stepNum}</Text>}
              </View>
              <Text style={[pb.label, { color: labelColor }]} numberOfLines={1}>
                {t(meta.labelKey)}
              </Text>
            </View>

            {idx < STEP_META.length - 1 && (
              <View style={[pb.lineTrack, { backgroundColor: isDark ? '#2A2A3A' : '#E0E0E0' }]}>
                <Animated.View
                  style={[
                    pb.lineFill,
                    {
                      backgroundColor: P,
                      width: lineAnims[idx].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    },
                  ]}
                />
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const pb = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 24, marginTop: 8 },
  stepCol:  { alignItems: 'center', width: 60 },
  dot:      { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  dotNum:   { fontSize: 13, fontWeight: '600', color: '#999' },
  label:    { fontSize: 10, fontWeight: '600', textAlign: 'center', maxWidth: 56 },
  lineTrack:{ flex: 1, height: 2, marginTop: 15, marginHorizontal: 2, overflow: 'hidden' },
  lineFill: { height: '100%' },
});

// ─── Reusable small components ────────────────────────────────────────────────
const SectionHeader = ({ icon, title, subtitle, colors, isRTL }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string; colors: any; isRTL?: boolean }) => (
  <View style={[sh.wrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    <View style={[sh.iconWrap, { backgroundColor: 'transparent' }]}>
      <Ionicons name={icon} size={22} color={P} />
    </View>
    <View style={sh.text}>
      <Text style={[sh.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
      <Text style={[sh.subtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>
    </View>
  </View>
);

const sh = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text:     { flex: 1 },
  title:    { fontSize: 18, fontWeight: '700', marginBottom: 3 },
  subtitle: { fontSize: 13, lineHeight: 18 },
});

const PrimaryBtn = ({ label, onPress, disabled, loading, colors }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; colors: any }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
    style={[btn.primary, { backgroundColor: disabled || loading ? '#9E9E9E' : P }]}
  >
    {loading
      ? <ActivityIndicator color="#fff" size="small" />
      : <Text style={btn.primaryTxt}>{label}</Text>}
  </TouchableOpacity>
);

const BackBtn = ({ label, onPress, colors }: { label: string; onPress: () => void; colors: any }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[btn.back, { borderColor: P }]}>
    <BackArrowIonicons variant="chevron" size={16} color={P}/>
    <Text style={[btn.backTxt, { color: P }]}>{label}</Text>
  </TouchableOpacity>
);

const btn = StyleSheet.create({
  primary:    { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  back:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5, gap: 4 },
  backTxt:    { fontSize: 15, fontWeight: '600' },
});

const BtnRow = ({ children, isRTL }: { children: React.ReactNode; isRTL?: boolean }) => (
  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 28, paddingHorizontal: 20, paddingBottom: 20 }}>{children}</View>
);

// ─── Services Step ────────────────────────────────────────────────────────────
interface ServicesStepProps {
  services: Service[];
  selectedServiceIds: number[];
  onToggleService: (id: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onNext: () => void;
  onBack?: () => void;
  colors: any;
  t: TFunction;
  language: string;
}

const ServicesStep: React.FC<ServicesStepProps> = ({ services, selectedServiceIds, onToggleService, refreshing, onRefresh, onNext, onBack, colors, t, language }) => {
  const isRTL = language === 'ar';
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SectionHeader icon="construct-outline" title={t('onboarding.services.title')} subtitle={t('onboarding.services.subtitle')} colors={colors} isRTL={isRTL} />

      {refreshing && services.length === 0
        ? <ActivityIndicator style={{ marginVertical: 32 }} color={P} size="large" />
        : services.length === 0
          ? (
            <View style={sv.empty}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
              <Text style={[sv.emptyTxt, { color: colors.textSecondary }]}>{t('onboarding.services.noServices')}</Text>
              <TouchableOpacity onPress={onRefresh} style={[sv.retryBtn, { backgroundColor: 'transparent', borderColor: P_MID }]}>
                <Text style={[sv.retryTxt, { color: P }]}>{t('onboarding.services.retry')}</Text>
              </TouchableOpacity>
            </View>
          )
          : (
            <View style={sv.grid}>
              {services.map(item => {
                const active = selectedServiceIds.includes(item.id);
                const name = language === 'ar' && item.nameAr ? item.nameAr : item.nameEn;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => onToggleService(item.id)}
                    activeOpacity={0.75}
                    style={[
                      sv.card,
                      { backgroundColor: colors.cardBackground, borderColor: active ? P : (colors.border || '#E4E7EC') },
                    ]}
                  >
                    <View style={[sv.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[sv.cardName, { color: active ? P : colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{name}</Text>
                      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={active ? P : colors.textSecondary} />
                    </View>
                    {item.description
                      ? <Text style={[sv.cardDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{item.description}</Text>
                      : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )
      }

      {selectedServiceIds.length > 0 && (
        <View style={[sv.badge, { backgroundColor: 'transparent', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="checkmark-circle" size={15} color={P} />
          <Text style={[sv.badgeTxt, { color: P }]}>
            {t('onboarding.services.selectedCount', { count: selectedServiceIds.length })}
          </Text>
        </View>
      )}

      <BtnRow isRTL={isRTL}>
        {onBack && <BackBtn label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />}
        <PrimaryBtn label={t('onboarding.buttons.next')} onPress={onNext} disabled={selectedServiceIds.length === 0} colors={colors} />
      </BtnRow>
    </View>
  );
};

const sv = StyleSheet.create({
  grid:     { gap: 10, marginBottom: 4 },
  card:     { borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 2 },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  cardName: { fontSize: 14, fontWeight: '600', flex: 1 },
  cardDesc: { fontSize: 12, lineHeight: 17 },
  empty:    { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTxt: { fontSize: 14 },
  retryBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryTxt: { fontSize: 14, fontWeight: '600' },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginTop: 8 },
  badgeTxt: { fontSize: 13, fontWeight: '600' },
});

// ─── Specializations Step ────────────────────────────────────────────────────
interface SpecializationsStepProps {
  taskTypes: TaskType[];
  selectedTaskTypeIds: number[];
  onToggle: (id: number) => void;
  loading: boolean;
  onRefresh: () => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  colors: any;
  t: TFunction;
  language: string;
}

const SpecializationsStep: React.FC<SpecializationsStepProps> = ({
  taskTypes, selectedTaskTypeIds, onToggle, loading, onRefresh, onNext, onBack, onSkip, colors, t, language,
}) => {
  const isRTL = language === 'ar';
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SectionHeader
        icon="flash-outline"
        title={t('onboarding.specializations.title', { defaultValue: 'Specializations' })}
        subtitle={t('onboarding.specializations.subtitle', { defaultValue: 'Select task types you specialize in. You can skip this step.' })}
        colors={colors}
        isRTL={isRTL}
      />

      {loading && taskTypes.length === 0 ? (
        <ActivityIndicator style={{ marginVertical: 32 }} color={P} size="large" />
      ) : taskTypes.length === 0 ? (
        <View style={sv.empty}>
          <Ionicons name="construct-outline" size={48} color={colors.textSecondary} />
          <Text style={[sv.emptyTxt, { color: colors.textSecondary }]}>
            {t('onboarding.specializations.noTypes', { defaultValue: 'No task types available' })}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={[sv.retryBtn, { backgroundColor: 'transparent', borderColor: P_MID }]}>
            <Text style={[sv.retryTxt, { color: P }]}>{t('onboarding.services.retry', { defaultValue: 'Retry' })}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={sv.grid}>
          {taskTypes.map(item => {
            const active = selectedTaskTypeIds.includes(item.id);
            const name = language === 'ar' && item.nameAr ? item.nameAr : item.nameEn;
            const desc = language === 'ar' && item.descriptionAr ? item.descriptionAr : item.descriptionEn;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => onToggle(item.id)}
                activeOpacity={0.75}
                style={[sv.card, { backgroundColor: colors.cardBackground, borderColor: active ? P : (colors.border || '#E4E7EC') }]}
              >
                <View style={[sv.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[sv.cardName, { color: active ? P : colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{name}</Text>
                  <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={active ? P : colors.textSecondary} />
                </View>
                {desc ? (
                  <Text style={[sv.cardDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{desc}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {selectedTaskTypeIds.length > 0 && (
        <View style={[sv.badge, { backgroundColor: 'transparent', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="checkmark-circle" size={15} color={P} />
          <Text style={[sv.badgeTxt, { color: P }]}>
            {t('onboarding.specializations.selectedCount', { count: selectedTaskTypeIds.length, defaultValue: `${selectedTaskTypeIds.length} selected` })}
          </Text>
        </View>
      )}

      <BtnRow isRTL={isRTL}>
        <BackBtn label={t('onboarding.buttons.back', { defaultValue: 'Back' })} onPress={onBack} colors={colors} />
        <TouchableOpacity onPress={onSkip} activeOpacity={0.75} style={[sp.skipBtn, { borderColor: P_MID }]}>
          <Text style={[sp.skipTxt, { color: P }]}>{t('onboarding.buttons.skip', { defaultValue: 'Skip' })}</Text>
        </TouchableOpacity>
        <PrimaryBtn label={t('onboarding.buttons.next', { defaultValue: 'Next' })} onPress={onNext} colors={colors} />
      </BtnRow>
    </View>
  );
};

const sp = StyleSheet.create({
  skipBtn: { paddingVertical: 15, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  skipTxt: { fontSize: 15, fontWeight: '600' },
});

// ─── Subscription Step ────────────────────────────────────────────────────────
interface SubscriptionStepProps {
  plans: SubscriptionPlan[];
  selectedPlanId: number | null;
  onSelectPlan: (id: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onNext: () => void;
  onBack: () => void;
  colors: any;
  t: TFunction;
  language: string;
}

const SubscriptionStep: React.FC<SubscriptionStepProps> = ({ plans, selectedPlanId, onSelectPlan, refreshing, onRefresh, onNext, onBack, colors, t, language }) => {
  const isRTL = language === 'ar';
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SectionHeader icon="card-outline" title={t('onboarding.subscription.title')} subtitle={t('onboarding.subscription.subtitle')} colors={colors} isRTL={isRTL} />

      {refreshing && plans.length === 0
        ? <ActivityIndicator style={{ marginVertical: 32 }} color={P} size="large" />
        : plans.map(plan => {
          const active = selectedPlanId === plan.id;
          const name = language === 'ar' && plan.nameAr ? plan.nameAr : plan.nameEn;
          const desc = language === 'ar' && plan.descriptionAr ? plan.descriptionAr : plan.descriptionEn;
          return (
            <TouchableOpacity
              key={plan.id}
              onPress={() => onSelectPlan(plan.id)}
              activeOpacity={0.8}
              style={[sub.card, { backgroundColor: colors.cardBackground, borderColor: active ? P : (colors.border || '#E4E7EC') }]}
            >
              {/* Top row: name + check */}
              <View style={[sub.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[sub.planName, { color: active ? P : colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{name}</Text>
                  {desc ? <Text style={[sub.planDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{desc}</Text> : null}
                </View>
                <View style={[sub.radioOuter, { borderColor: active ? P : (colors.border || '#D0D5DD') }]}>
                  {active && <View style={sub.radioInner} />}
                </View>
              </View>
              {/* Price row */}
              <View style={[sub.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[sub.priceMain, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <RialIcon size={18} variant="primary" color={P} />
                  <Text style={[sub.price, { color: P }]}>{plan.finalPrice.toFixed(2)}</Text>
                </View>
                {plan.hasActiveDiscount && plan.price > plan.finalPrice && (
                  <View style={[sub.strikeWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <RialIcon size={12} variant="dark" />
                    <Text style={sub.strikePrice}>{plan.price.toFixed(2)}</Text>
                  </View>
                )}
                {plan.hasLimitedTimeDiscount && plan.discountTimeRemainingSeconds ? (
                  <View style={[sub.badge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="alarm-outline" size={12} color="#F28A00" />
                    <Text style={sub.badgeTxt}>
                      {t('onboarding.subscription.limitedOffer', { hours: Math.ceil(plan.discountTimeRemainingSeconds / 3600) })}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })
      }

      {plans.length === 0 && !refreshing && (
        <TouchableOpacity onPress={onRefresh} style={[sub.retryBtn, { borderColor: P_MID, backgroundColor: 'transparent' }]}>
          <Ionicons name="refresh-outline" size={16} color={P} />
          <Text style={[sub.retryTxt, { color: P }]}>{t('onboarding.subscription.reloadPlans')}</Text>
        </TouchableOpacity>
      )}

      <BtnRow isRTL={isRTL}>
        <BackBtn label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />
        <PrimaryBtn label={t('onboarding.buttons.next')} onPress={onNext} disabled={!selectedPlanId} colors={colors} />
      </BtnRow>
    </View>
  );
};

const sub = StyleSheet.create({
  card:       { borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 12 },
  row:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  planName:   { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  planDesc:   { fontSize: 12, lineHeight: 17 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: P },
  priceRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  priceMain:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price:      { fontSize: 24, fontWeight: '800' },
  strikeWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  strikePrice:{ fontSize: 14, color: '#F44336', textDecorationLine: 'line-through' },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFD180' },
  badgeTxt:   { fontSize: 11, fontWeight: '600', color: '#F28A00' },
  retryBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  retryTxt:   { fontSize: 14, fontWeight: '600' },
});

// ─── Confirmation Step ────────────────────────────────────────────────────────
interface ConfirmationStepProps {
  services: Service[];
  specializations: TaskType[];
  subscription: SubscriptionPlan | null;
  onEditStep: (s: Step) => void;
  onBack: () => void;
  onFinish: () => void;
  loading: boolean;
  colors: any;
  t: TFunction;
  language: string;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({ services, specializations, subscription, onEditStep, onBack, onFinish, loading, colors, t, language }) => {
  const isRTL = language === 'ar';

  const SummaryCard = ({ icon, title, sub: subtitle, children, onEdit, step }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string; children?: React.ReactNode; onEdit: () => void; step: Step }) => (
    <View style={[cf.card, { backgroundColor: colors.cardBackground, borderColor: colors.border || '#E4E7EC' }]}>
      <View style={[cf.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[cf.iconWrap, { backgroundColor: 'transparent' }]}>
          <Ionicons name={icon} size={16} color={P} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[cf.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
          <Text style={[cf.cardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={[cf.editBtn, { borderColor: P_MID, backgroundColor: 'transparent', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="create-outline" size={13} color={P} />
          <Text style={[cf.editTxt, { color: P }]}>{t('onboarding.summary.edit')}</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SectionHeader icon="checkmark-done-outline" title={t('onboarding.summary.title')} subtitle={t('onboarding.summary.subtitle')} colors={colors} isRTL={isRTL} />

      {/* Services card */}
      <SummaryCard
        icon="construct-outline"
        title={t('onboarding.summary.servicesTitle')}
        sub={services.length === 0
          ? t('onboarding.summary.servicesEmpty')
          : t('onboarding.summary.servicesDescription', { count: services.length })}
        onEdit={() => onEditStep(1)}
        step={1}
      >
        {services.length > 0 && (
          <View style={[cf.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {services.map(s => {
              const name = language === 'ar' && s.nameAr ? s.nameAr : s.nameEn;
              return (
                <View key={s.id} style={[cf.chip, { backgroundColor: 'transparent', borderColor: P_MID }]}>
                  <Text style={[cf.chipTxt, { color: P }]}>{name}</Text>
                </View>
              );
            })}
          </View>
        )}
      </SummaryCard>

      {/* Specializations card */}
      <SummaryCard
        icon="flash-outline"
        title={t('onboarding.summary.specializationsTitle', { defaultValue: 'Specializations' })}
        sub={specializations.length === 0
          ? t('onboarding.summary.specializationsEmpty', { defaultValue: 'None selected (optional)' })
          : t('onboarding.summary.specializationsDescription', { count: specializations.length, defaultValue: `${specializations.length} selected` })}
        onEdit={() => onEditStep(2)}
        step={2}
      >
        {specializations.length > 0 && (
          <View style={[cf.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {specializations.map(s => {
              const name = language === 'ar' && s.nameAr ? s.nameAr : s.nameEn;
              return (
                <View key={s.id} style={[cf.chip, { backgroundColor: 'transparent', borderColor: P_MID }]}>
                  <Text style={[cf.chipTxt, { color: P }]}>{name}</Text>
                </View>
              );
            })}
          </View>
        )}
      </SummaryCard>

      {/* Subscription card */}
      <SummaryCard
        icon="card-outline"
        title={t('onboarding.summary.subscriptionTitle')}
        sub={subscription
          ? (language === 'ar' && subscription.nameAr ? subscription.nameAr : subscription.nameEn)
          : t('onboarding.summary.subscriptionEmpty')}
        onEdit={() => onEditStep(3)}
        step={3}
      >
        {subscription && (
          <View style={[cf.priceStrip, { backgroundColor: 'transparent', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <RialIcon size={14} variant="primary" color={P} />
            <Text style={[cf.priceStripTxt, { color: P }]}>{subscription.finalPrice.toFixed(2)}</Text>
            <Text style={[cf.perTxt, { color: colors.textSecondary }]}>{t('onboarding.summary.subscriptionPrice', { price: '' }).replace(subscription.finalPrice.toFixed(2), '').trim() || '/ yr'}</Text>
          </View>
        )}
      </SummaryCard>

      <BtnRow isRTL={isRTL}>
        <BackBtn label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />
        <PrimaryBtn label={loading ? t('onboarding.buttons.finishing') : t('onboarding.buttons.finish')} onPress={onFinish} disabled={loading || !subscription} loading={loading} colors={colors} />
      </BtnRow>
    </View>
  );
};

const cf = StyleSheet.create({
  card:       { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  iconWrap:   { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  cardTitle:  { fontSize: 14, fontWeight: '700' },
  cardSub:    { fontSize: 12, lineHeight: 17, marginTop: 1 },
  editBtn:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  editTxt:    { fontSize: 11, fontWeight: '600' },
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipTxt:    { fontSize: 11, fontWeight: '500' },
  priceStrip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, padding: 10, borderRadius: 10 },
  priceStripTxt: { fontSize: 20, fontWeight: '800' },
  perTxt:     { fontSize: 12, marginLeft: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
const TechnicianOnboardingScreen: React.FC<TechnicianOnboardingScreenProps> = ({ token, userId, onFinished }) => {
  const { colors, theme } = useTheme();
  const { scaledSize } = useFontFamily();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const { isRTL } = useRTL();

  // ── business state ─────────────────────────────────────────────────────────
  const [step, setStep]                           = useState<Step>(1);
  const [stateInitialized, setStateInitialized]   = useState(false);
  const [isLoadingStep, setIsLoadingStep]         = useState(false);
  const [isCompleting, setIsCompleting]           = useState(false);

  const [services,              setServices]             = useState<Service[]>([]);
  const [selectedServiceIds,    setSelectedServiceIds]   = useState<number[]>([]);
  const [taskTypes,             setTaskTypes]            = useState<TaskType[]>([]);
  const [selectedTaskTypeIds,   setSelectedTaskTypeIds]  = useState<number[]>([]);
  const [plans,                 setPlans]                = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId,        setSelectedPlanId]       = useState<number | null>(null);

  const selectedServices      = useMemo(() => services.filter(s => selectedServiceIds.includes(s.id)),       [services, selectedServiceIds]);
  const selectedSpecializations = useMemo(() => taskTypes.filter(t => selectedTaskTypeIds.includes(t.id)),   [taskTypes, selectedTaskTypeIds]);
  const selectedPlan            = useMemo(() => plans.find(p => p.id === selectedPlanId) || null,            [plans, selectedPlanId]);

  // ── step-transition animation ──────────────────────────────────────────────
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateToStep = useCallback((next: Step, dir: 'fwd' | 'back') => {
    const sign = isRTL ? -1 : 1;
    const EXIT  = dir === 'fwd' ? -SCREEN_W * 0.35 * sign : SCREEN_W * 0.35 * sign;
    const ENTER = dir === 'fwd' ?  SCREEN_W * 0.35 * sign : -SCREEN_W * 0.35 * sign;
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim,   { toValue: EXIT, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      onboardingStorage.set('currentStep', String(next));
      slideAnim.setValue(ENTER);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim,   { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  }, [slideAnim, opacityAnim]);

  // ── persistence ────────────────────────────────────────────────────────────
  const loadPersistedState = useCallback(async () => {
    try {
      const [storedStep, storedServices, storedPlan] = await Promise.all([
        onboardingStorage.get('currentStep'),
        onboardingStorage.get('selectedServices'),
        onboardingStorage.get('selectedPlan'),
      ]);
      if (storedStep) {
        const p = parseInt(storedStep, 10);
        if (p >= 1 && p <= 4) setStep(p as Step);
      }
      if (storedServices) { try { const p = JSON.parse(storedServices) as number[]; if (Array.isArray(p)) setSelectedServiceIds(p); } catch {} }
      if (storedPlan) { const n = parseInt(storedPlan, 10); if (!Number.isNaN(n)) setSelectedPlanId(n); }
      const storedTaskTypes = await onboardingStorage.get('selectedTaskTypes');
      if (storedTaskTypes) { try { const p = JSON.parse(storedTaskTypes) as number[]; if (Array.isArray(p)) setSelectedTaskTypeIds(p); } catch {} }
    } catch {}
    finally { setStateInitialized(true); }
  }, []);

  useEffect(() => { loadPersistedState(); }, [loadPersistedState]);
  useEffect(() => { if (stateInitialized) onboardingStorage.set('selectedServices', JSON.stringify(selectedServiceIds)); }, [selectedServiceIds, stateInitialized]);
  useEffect(() => { if (stateInitialized) onboardingStorage.set('selectedTaskTypes', JSON.stringify(selectedTaskTypeIds)); }, [selectedTaskTypeIds, stateInitialized]);
  useEffect(() => { if (stateInitialized) onboardingStorage.set('selectedPlan', selectedPlanId !== null ? String(selectedPlanId) : ''); }, [selectedPlanId, stateInitialized]);

  // ── data loading ────────────────────────────────────────────────────────────
  const loadServices = useCallback(async () => {
    setIsLoadingStep(true);
    try { setServices(await fetchServices(token)); }
    catch (e: any) { Alert.alert(t('Error'), e?.message || t('onboarding.errors.loadServices')); }
    finally { setIsLoadingStep(false); }
  }, [token]);

  const loadTaskTypes = useCallback(async () => {
    setIsLoadingStep(true);
    try {
      const res = await fetch(buildApiUrl(API_ENDPOINTS.SMALL_TASKS.TYPES), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data: TaskType[] = await res.json();
      setTaskTypes(data.filter(tt => tt.isActive));
    } catch (e: any) {
      Alert.alert(t('Error'), e?.message || 'Could not load task types');
    } finally { setIsLoadingStep(false); }
  }, [token]);

  const loadPlans = useCallback(async () => {
    setIsLoadingStep(true);
    try { setPlans(await fetchSubscriptionPlans(token)); }
    catch (e: any) { Alert.alert(t('Error'), e?.message || t('onboarding.errors.loadPlans')); }
    finally { setIsLoadingStep(false); }
  }, [token]);

  useEffect(() => {
    if (step === 1 && services.length === 0)   loadServices();
    if (step === 2 && taskTypes.length === 0)   loadTaskTypes();
    if (step === 3 && plans.length === 0)        loadPlans();
  }, [step]);

  // ── navigation handlers ────────────────────────────────────────────────────
  const handleServicesNext = () => {
    if (selectedServiceIds.length === 0) {
      Alert.alert(t('onboarding.alerts.servicesTitle'), t('onboarding.alerts.selectService')); return;
    }
    animateToStep(2, 'fwd');
  };

  const handlePlanNext = () => {
    if (!selectedPlanId) {
      Alert.alert(t('onboarding.alerts.subscriptionTitle'), t('onboarding.alerts.selectSubscription')); return;
    }
    animateToStep(4, 'fwd');
  };

  // ── finish ─────────────────────────────────────────────────────────────────
  const handleFinishOnboarding = async () => {
    if (selectedServiceIds.length === 0) {
      Alert.alert(t('onboarding.alerts.servicesTitle'), t('onboarding.alerts.selectService'));
      animateToStep(1, 'back'); return;
    }
    if (!selectedPlanId) {
      Alert.alert(t('onboarding.alerts.subscriptionTitle'), t('onboarding.alerts.selectSubscription'));
      animateToStep(3, 'back'); return;
    }
    setIsCompleting(true);
    try {
      if (selectedTaskTypeIds.length > 0) {
        await fetch(buildApiUrl(API_ENDPOINTS.SMALL_TASKS.BULK_SUBSCRIBE), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ taskTypeIds: selectedTaskTypeIds }),
        });
      }
      await saveServices(token, selectedServiceIds);
      await subscribeToPlan(token, selectedPlanId, 1);
      await markOnboardingComplete(token, userId);
      await onboardingStorage.clear();
      onFinished();
    } catch (e: any) {
      Alert.alert(t('Error'), e?.message || t('onboarding.errors.finalize'));
    } finally {
      setIsCompleting(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1: return (
        <ServicesStep services={services} selectedServiceIds={selectedServiceIds}
          onToggleService={id => setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
          refreshing={isLoadingStep && services.length === 0} onRefresh={loadServices}
          onNext={handleServicesNext}
          colors={colors} t={t} language={i18n.language} />
      );
      case 2: return (
        <SpecializationsStep
          taskTypes={taskTypes} selectedTaskTypeIds={selectedTaskTypeIds}
          onToggle={id => setSelectedTaskTypeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
          loading={isLoadingStep && taskTypes.length === 0} onRefresh={loadTaskTypes}
          onNext={() => animateToStep(3, 'fwd')}
          onBack={() => animateToStep(1, 'back')}
          onSkip={() => animateToStep(3, 'fwd')}
          colors={colors} t={t} language={i18n.language} />
      );
      case 3: return (
        <SubscriptionStep plans={plans} selectedPlanId={selectedPlanId} onSelectPlan={setSelectedPlanId}
          refreshing={isLoadingStep && plans.length === 0} onRefresh={loadPlans}
          onNext={handlePlanNext} onBack={() => animateToStep(2, 'back')}
          colors={colors} t={t} language={i18n.language} />
      );
      case 4: default: return (
        <ConfirmationStep services={selectedServices} specializations={selectedSpecializations} subscription={selectedPlan}
          onEditStep={s => animateToStep(s as Step, 'back')}
          onBack={() => animateToStep(3, 'back')}
          onFinish={handleFinishOnboarding} loading={isCompleting}
          colors={colors} t={t} language={i18n.language} />
      );
    }
  };

  return (
    <View style={[ms.root, { backgroundColor: colors.background, paddingTop: getTopPadding(insets, 16) }]}>
      {/* Header */}
      <View style={[ms.headerBlock, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[ms.screenTitle, { color: colors.text, fontSize: scaledSize(22), textAlign: isRTL ? 'right' : 'left' }]}>{t('onboarding.technicianTitle')}</Text>
        <Text style={[ms.screenSub, { color: colors.textSecondary, fontSize: scaledSize(13), textAlign: isRTL ? 'right' : 'left' }]}>{t('onboarding.subtitle')}</Text>
      </View>

      {/* Animated progress bar */}
      <StepProgressBar current={step} t={t} isDark={isDark} isRTL={isRTL} />

      {/* Animated step content */}
      <Animated.ScrollView
        style={{ flex: 1, opacity: opacityAnim, transform: [{ translateX: slideAnim }] }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </Animated.ScrollView>
    </View>
  );
};

const ms = StyleSheet.create({
  root:        { flex: 1, overflow: 'hidden' },
  headerBlock: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  screenTitle: { fontWeight: '800', marginBottom: 3 },
  screenSub:   { lineHeight: 18 },
});

export default TechnicianOnboardingScreen;
