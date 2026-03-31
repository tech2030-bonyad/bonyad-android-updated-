import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import onboardingStorage from '../services/onboardingStorage';
import {
  markOnboardingComplete,
  fetchServices,
  fetchSubscriptionPlans,
  saveAvailability,
  saveServices,
  subscribeToPlan,
  Service,
  SubscriptionPlan,
} from '../services/onboardingApi';
import RialIcon from '../components/RialIcon';
import { getTopPadding } from '../utils/statusBarHelper';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4;
type AvailabilityStatus = 'AVAILABLE_ANYTIME' | 'FIXED_TIMES';

interface AvailabilitySlot {
  day: string;
  start: string;
  end: string;
}

export interface TechnicianOnboardingScreenProps {
  token: string;
  userId: number;
  onFinished: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const WEEK_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const dayKey = (day: string) => day.toLowerCase();
const DEFAULT_SLOTS: AvailabilitySlot[] = [];

const P = '#005DAC';
const P_LIGHT = '#E8F4FF';
const P_MID   = '#B3D1F5';
const SCREEN_W = Dimensions.get('window').width;

// Enable LayoutAnimation on Android (once)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Step progress bar ────────────────────────────────────────────────────────
const STEP_META = [
  { icon: 'calendar-outline'      as const, labelKey: 'onboarding.steps.availability' },
  { icon: 'construct-outline'     as const, labelKey: 'onboarding.steps.services'    },
  { icon: 'card-outline'          as const, labelKey: 'onboarding.steps.subscription'},
  { icon: 'checkmark-done-outline'as const, labelKey: 'onboarding.steps.summary'     },
];

function StepProgressBar({ current, t, isDark }: { current: Step; t: TFunction; isDark: boolean }) {
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
    <View style={pb.wrap}>
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
const SectionHeader = ({ icon, title, subtitle, colors }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string; colors: any }) => (
  <View style={sh.wrap}>
    <View style={[sh.iconWrap, { backgroundColor: P_LIGHT }]}>
      <Ionicons name={icon} size={22} color={P} />
    </View>
    <View style={sh.text}>
      <Text style={[sh.title, { color: colors.text }]}>{title}</Text>
      <Text style={[sh.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
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
    <Ionicons name="chevron-back" size={16} color={P} />
    <Text style={[btn.backTxt, { color: P }]}>{label}</Text>
  </TouchableOpacity>
);

const btn = StyleSheet.create({
  primary:    { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  back:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5, gap: 4 },
  backTxt:    { fontSize: 15, fontWeight: '600' },
});

const BtnRow = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: 10, marginTop: 28, paddingHorizontal: 20, paddingBottom: 20 }}>{children}</View>
);

// ─── Availability Step ────────────────────────────────────────────────────────
interface AvailabilityStepProps {
  status: AvailabilityStatus;
  slots: AvailabilitySlot[];
  onChangeStatus: (v: AvailabilityStatus) => void;
  onAddSlot: (day: string) => void;
  onUpdateSlot: (day: string, i: number, f: 'start' | 'end', v: string) => void;
  onRemoveSlot: (day: string, i: number) => void;
  onNext: () => void;
  colors: any;
  t: TFunction;
  language: string;
}

const AvailabilityStep: React.FC<AvailabilityStepProps> = ({ status, slots, onChangeStatus, onAddSlot, onUpdateSlot, onRemoveSlot, onNext, colors, t }) => {
  const canProceed = status === 'AVAILABLE_ANYTIME' || (slots.length > 0 && slots.every(s => s.start.length === 5 && s.end.length === 5));
  const groupedSlots = useMemo(() => WEEK_DAYS.map(day => ({ day, slots: slots.filter(s => dayKey(s.day) === dayKey(day)) })), [slots]);

  const isDark = colors.background === '#0D1117' || colors.background?.includes('0D');
  const toggleAnim = useRef(new Animated.Value(status === 'AVAILABLE_ANYTIME' ? 0 : 1)).current;
  const [toggleWidth, setToggleWidth] = useState(0);

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: status === 'AVAILABLE_ANYTIME' ? 0 : 1,
      tension: 140,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [status, toggleAnim]);

  const animateListChange = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SectionHeader icon="calendar-outline" title={t('onboarding.steps.availability')} subtitle={t('onboarding.availability.description')} colors={colors} />

      {/* Mode toggle */}
      <View
        style={[av.toggleWrap, { backgroundColor: isDark ? '#1E1E2E' : '#F3F6FA' }]}
        onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
      >
        {/* Animated sliding pill */}
        {toggleWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              av.togglePill,
              {
                width: (toggleWidth - 8) / 2,
                transform: [
                  {
                    translateX: toggleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, (toggleWidth - 8) / 2],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        {(['AVAILABLE_ANYTIME', 'FIXED_TIMES'] as AvailabilityStatus[]).map(mode => {
          const isActive = status === mode;
          const label = mode === 'AVAILABLE_ANYTIME' ? t('onboarding.availability.anytimeTitle') : t('onboarding.availability.fixedTitle');
          const icon = mode === 'AVAILABLE_ANYTIME' ? 'infinite-outline' : 'time-outline';
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => onChangeStatus(mode)}
              activeOpacity={0.8}
              style={[av.toggleBtn]}
            >
              <Ionicons name={icon as any} size={16} color={isActive ? '#fff' : colors.textSecondary} />
              <Text style={[av.toggleTxt, { color: isActive ? '#fff' : colors.textSecondary }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content switch animation */}
      <Animated.View
        style={{
          opacity: toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateY: toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }],
          display: status === 'AVAILABLE_ANYTIME' ? 'flex' : 'none',
        }}
      >
        <View style={[av.anytimeCard, { backgroundColor: P_LIGHT, borderColor: P_MID }]}>
          <Ionicons name="checkmark-circle" size={28} color={P} />
          <View style={{ flex: 1 }}>
            <Text style={[av.anytimeTitle, { color: P }]}>{t('onboarding.availability.anytimeTitle')}</Text>
            <Text style={[av.anytimeDesc, { color: colors.textSecondary }]}>{t('onboarding.availability.anytimeDescription')}</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          transform: [{ translateY: toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          display: status === 'FIXED_TIMES' ? 'flex' : 'none',
        }}
      >
        <Text style={[av.slotHeading, { color: colors.text }]}>{t('onboarding.availability.weeklyLabel')}</Text>
        {groupedSlots.map(({ day, slots: ds }) => (
          <View key={day} style={[av.dayBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border || '#E4E7EC' }]}>
            <View style={av.dayRow}>
              <Text style={[av.dayLabel, { color: colors.text }]}>{t(`days.${dayKey(day)}`, day)}</Text>
              <TouchableOpacity
                onPress={() => {
                  animateListChange();
                  onAddSlot(day);
                }}
                style={[av.addBtn, { backgroundColor: P_LIGHT }]}
              >
                <Ionicons name="add" size={16} color={P} />
                <Text style={[av.addBtnTxt, { color: P }]}>{t('onboarding.availability.addSlot')}</Text>
              </TouchableOpacity>
            </View>
            {ds.length === 0
              ? <Text style={[av.emptyDay, { color: colors.textSecondary }]}>{t('onboarding.availability.noSlots')}</Text>
              : ds.map((slot, i) => (
                <View key={i} style={[av.slotRow, { borderColor: colors.border || '#E4E7EC', backgroundColor: isDark ? '#1E1E2E' : '#F9FAFB' }]}>
                  <TextInput value={slot.start} onChangeText={v => onUpdateSlot(day, i, 'start', v.replace(/[^0-9:]/g, '').slice(0, 5))}
                    style={[av.timeIn, { color: colors.text, borderColor: P_MID, backgroundColor: colors.cardBackground }]} keyboardType="numeric" maxLength={5} placeholder="09:00" placeholderTextColor={colors.textSecondary} />
                  <Text style={[av.dash, { color: colors.textSecondary }]}>–</Text>
                  <TextInput value={slot.end}   onChangeText={v => onUpdateSlot(day, i, 'end',   v.replace(/[^0-9:]/g, '').slice(0, 5))}
                    style={[av.timeIn, { color: colors.text, borderColor: P_MID, backgroundColor: colors.cardBackground }]} keyboardType="numeric" maxLength={5} placeholder="17:00" placeholderTextColor={colors.textSecondary} />
                  <TouchableOpacity
                    onPress={() => {
                      animateListChange();
                      onRemoveSlot(day, i);
                    }}
                    style={av.delBtn}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.error || '#F44336'} />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        ))}
      </Animated.View>

      <BtnRow>
        <PrimaryBtn label={t('onboarding.buttons.next')} onPress={onNext} disabled={!canProceed} colors={colors} />
      </BtnRow>
    </View>
  );
};

const av = StyleSheet.create({
  toggleWrap:    { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 18, gap: 4 },
  togglePill:    { position: 'absolute', left: 4, top: 4, bottom: 4, borderRadius: 10, backgroundColor: P },
  toggleBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  toggleTxt:     { fontSize: 13, fontWeight: '600' },
  anytimeCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  anytimeTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  anytimeDesc:   { fontSize: 12, lineHeight: 18 },
  slotHeading:   { fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayBlock:      { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  dayRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayLabel:      { fontSize: 15, fontWeight: '600' },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addBtnTxt:     { fontSize: 12, fontWeight: '600' },
  emptyDay:      { fontSize: 12, fontStyle: 'italic', paddingBottom: 4 },
  slotRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, gap: 8 },
  timeIn:        { width: 72, height: 38, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, fontSize: 14, fontWeight: '500' },
  dash:          { fontSize: 16, fontWeight: '600' },
  delBtn:        { marginLeft: 'auto' as any, padding: 4 },
});

// ─── Services Step ────────────────────────────────────────────────────────────
interface ServicesStepProps {
  services: Service[];
  selectedServiceIds: number[];
  onToggleService: (id: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onNext: () => void;
  onBack: () => void;
  colors: any;
  t: TFunction;
  language: string;
}

const ServicesStep: React.FC<ServicesStepProps> = ({ services, selectedServiceIds, onToggleService, refreshing, onRefresh, onNext, onBack, colors, t, language }) => (
  <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
    <SectionHeader icon="construct-outline" title={t('onboarding.services.title')} subtitle={t('onboarding.services.subtitle')} colors={colors} />

    {refreshing && services.length === 0
      ? <ActivityIndicator style={{ marginVertical: 32 }} color={P} size="large" />
      : services.length === 0
        ? (
          <View style={sv.empty}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={[sv.emptyTxt, { color: colors.textSecondary }]}>{t('onboarding.services.noServices')}</Text>
            <TouchableOpacity onPress={onRefresh} style={[sv.retryBtn, { backgroundColor: P_LIGHT, borderColor: P_MID }]}>
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
                    { backgroundColor: active ? P_LIGHT : colors.cardBackground, borderColor: active ? P : (colors.border || '#E4E7EC') },
                  ]}
                >
                  <View style={sv.cardTop}>
                    <Text style={[sv.cardName, { color: active ? P : colors.text }]} numberOfLines={2}>{name}</Text>
                    <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={active ? P : colors.textSecondary} />
                  </View>
                  {item.description
                    ? <Text style={[sv.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                    : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )
    }

    {selectedServiceIds.length > 0 && (
      <View style={[sv.badge, { backgroundColor: P_LIGHT }]}>
        <Ionicons name="checkmark-circle" size={15} color={P} />
        <Text style={[sv.badgeTxt, { color: P }]}>
          {selectedServiceIds.length} {t('onboarding.services.title')} selected
        </Text>
      </View>
    )}

    <BtnRow>
      <BackBtn label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />
      <PrimaryBtn label={t('onboarding.buttons.next')} onPress={onNext} disabled={selectedServiceIds.length === 0} colors={colors} />
    </BtnRow>
  </View>
);

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

const SubscriptionStep: React.FC<SubscriptionStepProps> = ({ plans, selectedPlanId, onSelectPlan, refreshing, onRefresh, onNext, onBack, colors, t, language }) => (
  <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
    <SectionHeader icon="card-outline" title={t('onboarding.subscription.title')} subtitle={t('onboarding.subscription.subtitle')} colors={colors} />

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
            style={[sub.card, { backgroundColor: active ? P_LIGHT : colors.cardBackground, borderColor: active ? P : (colors.border || '#E4E7EC') }]}
          >
            {/* Top row: name + check */}
            <View style={sub.row}>
              <View style={{ flex: 1 }}>
                <Text style={[sub.planName, { color: active ? P : colors.text }]}>{name}</Text>
                {desc ? <Text style={[sub.planDesc, { color: colors.textSecondary }]} numberOfLines={2}>{desc}</Text> : null}
              </View>
              <View style={[sub.radioOuter, { borderColor: active ? P : (colors.border || '#D0D5DD') }]}>
                {active && <View style={sub.radioInner} />}
              </View>
            </View>
            {/* Price row */}
            <View style={sub.priceRow}>
              <View style={sub.priceMain}>
                <RialIcon size={18} variant="primary" color={P} />
                <Text style={[sub.price, { color: P }]}>{plan.finalPrice.toFixed(2)}</Text>
              </View>
              {plan.hasActiveDiscount && plan.price > plan.finalPrice && (
                <View style={sub.strikeWrap}>
                  <RialIcon size={12} variant="dark" />
                  <Text style={sub.strikePrice}>{plan.price.toFixed(2)}</Text>
                </View>
              )}
              {plan.hasLimitedTimeDiscount && plan.discountTimeRemainingSeconds ? (
                <View style={sub.badge}>
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
      <TouchableOpacity onPress={onRefresh} style={[sub.retryBtn, { borderColor: P_MID, backgroundColor: P_LIGHT }]}>
        <Ionicons name="refresh-outline" size={16} color={P} />
        <Text style={[sub.retryTxt, { color: P }]}>{t('onboarding.subscription.reloadPlans')}</Text>
      </TouchableOpacity>
    )}

    <BtnRow>
      <BackBtn label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />
      <PrimaryBtn label={t('onboarding.buttons.next')} onPress={onNext} disabled={!selectedPlanId} colors={colors} />
    </BtnRow>
  </View>
);

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
  availabilityStatus: AvailabilityStatus;
  slots: AvailabilitySlot[];
  services: Service[];
  subscription: SubscriptionPlan | null;
  onEditStep: (s: Step) => void;
  onBack: () => void;
  onFinish: () => void;
  loading: boolean;
  colors: any;
  t: TFunction;
  language: string;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({ availabilityStatus, slots, services, subscription, onEditStep, onBack, onFinish, loading, colors, t, language }) => {
  const groupedSlots = useMemo(() =>
    WEEK_DAYS.map(day => ({ day, slots: slots.filter(s => dayKey(s.day) === dayKey(day)).sort((a, b) => a.start.localeCompare(b.start)) })).filter(g => g.slots.length > 0)
  , [slots]);

  const SummaryCard = ({ icon, title, sub: subtitle, children, onEdit, step }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string; children?: React.ReactNode; onEdit: () => void; step: Step }) => (
    <View style={[cf.card, { backgroundColor: colors.cardBackground, borderColor: colors.border || '#E4E7EC' }]}>
      <View style={cf.cardHeader}>
        <View style={[cf.iconWrap, { backgroundColor: P_LIGHT }]}>
          <Ionicons name={icon} size={16} color={P} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[cf.cardTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[cf.cardSub, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={[cf.editBtn, { borderColor: P_MID, backgroundColor: P_LIGHT }]}>
          <Ionicons name="create-outline" size={13} color={P} />
          <Text style={[cf.editTxt, { color: P }]}>{t('onboarding.summary.edit')}</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SectionHeader icon="checkmark-done-outline" title={t('onboarding.summary.title')} subtitle={t('onboarding.summary.subtitle')} colors={colors} />

      {/* Availability card */}
      <SummaryCard
        icon="calendar-outline"
        title={t('onboarding.summary.availabilityTitle')}
        sub={availabilityStatus === 'AVAILABLE_ANYTIME'
          ? t('onboarding.summary.availabilityDescriptionAnytime')
          : t('onboarding.summary.availabilityDescriptionFixed', { count: slots.length })}
        onEdit={() => onEditStep(1)}
        step={1}
      >
        {availabilityStatus === 'FIXED_TIMES' && groupedSlots.length > 0 && (
          <View style={cf.chipRow}>
            {groupedSlots.map(g => (
              <View key={g.day} style={[cf.chip, { backgroundColor: P_LIGHT, borderColor: P_MID }]}>
                <Text style={[cf.chipTxt, { color: P }]}>
                  {t(`days.${dayKey(g.day)}`, g.day)} · {g.slots.map(s => `${s.start}–${s.end}`).join(', ')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </SummaryCard>

      {/* Services card */}
      <SummaryCard
        icon="construct-outline"
        title={t('onboarding.summary.servicesTitle')}
        sub={services.length === 0
          ? (t('onboarding.summary.servicesEmpty') || 'No services selected')
          : (t('onboarding.summary.servicesDescription', { count: services.length }) || `${services.length} selected`)}
        onEdit={() => onEditStep(2)}
        step={2}
      >
        {services.length > 0 && (
          <View style={cf.chipRow}>
            {services.map(s => {
              const name = language === 'ar' && s.nameAr ? s.nameAr : s.nameEn;
              return (
                <View key={s.id} style={[cf.chip, { backgroundColor: P_LIGHT, borderColor: P_MID }]}>
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
          : (t('onboarding.summary.subscriptionEmpty') || 'No plan selected')}
        onEdit={() => onEditStep(3)}
        step={3}
      >
        {subscription && (
          <View style={[cf.priceStrip, { backgroundColor: P_LIGHT }]}>
            <RialIcon size={14} variant="primary" color={P} />
            <Text style={[cf.priceStripTxt, { color: P }]}>{subscription.finalPrice.toFixed(2)}</Text>
            <Text style={[cf.perTxt, { color: colors.textSecondary }]}>{t('onboarding.summary.subscriptionPrice', { price: '' }).replace(subscription.finalPrice.toFixed(2), '').trim() || '/ yr'}</Text>
          </View>
        )}
      </SummaryCard>

      <BtnRow>
        <BackBtn label={t('onboarding.buttons.back')} onPress={onBack} colors={colors} />
        <PrimaryBtn label={loading ? (t('onboarding.buttons.finishing') || 'Finishing…') : t('onboarding.buttons.finish')} onPress={onFinish} disabled={loading || !subscription} loading={loading} colors={colors} />
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

  // ── business state ─────────────────────────────────────────────────────────
  const [step, setStep]                           = useState<Step>(1);
  const [stateInitialized, setStateInitialized]   = useState(false);
  const [isLoadingStep, setIsLoadingStep]         = useState(false);
  const [isCompleting, setIsCompleting]           = useState(false);

  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('FIXED_TIMES');
  const [availabilitySlots,  setAvailabilitySlots]  = useState<AvailabilitySlot[]>(DEFAULT_SLOTS);
  const [services,           setServices]            = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds]  = useState<number[]>([]);
  const [plans,              setPlans]               = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId,     setSelectedPlanId]      = useState<number | null>(null);

  const selectedServices = useMemo(() => services.filter(s => selectedServiceIds.includes(s.id)), [services, selectedServiceIds]);
  const selectedPlan     = useMemo(() => plans.find(p => p.id === selectedPlanId) || null,        [plans, selectedPlanId]);

  // ── step-transition animation ──────────────────────────────────────────────
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateToStep = useCallback((next: Step, dir: 'fwd' | 'back') => {
    const EXIT  = dir === 'fwd' ? -SCREEN_W * 0.35 : SCREEN_W * 0.35;
    const ENTER = dir === 'fwd' ?  SCREEN_W * 0.35 : -SCREEN_W * 0.35;
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim,   { toValue: EXIT, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      onboardingStorage.set('currentStep', String(next));
      slideAnim.setValue(ENTER);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim,   { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
      ]).start();
    });
  }, [slideAnim, opacityAnim]);

  // ── persistence ────────────────────────────────────────────────────────────
  const loadPersistedState = useCallback(async () => {
    try {
      const [storedStep, storedStatus, storedSlots, storedServices, storedPlan] = await Promise.all([
        onboardingStorage.get('currentStep'), onboardingStorage.get('availabilityStatus'),
        onboardingStorage.get('availabilitySlots'), onboardingStorage.get('selectedServices'),
        onboardingStorage.get('selectedPlan'),
      ]);
      if (storedStep) {
        const p = parseInt(storedStep, 10);
        if (p >= 1 && p <= 4) setStep(p as Step);
      }
      if (storedStatus === 'AVAILABLE_ANYTIME' || storedStatus === 'FIXED_TIMES') setAvailabilityStatus(storedStatus);
      if (storedSlots) { try { const p = JSON.parse(storedSlots) as AvailabilitySlot[]; if (Array.isArray(p) && p.length > 0) setAvailabilitySlots(p); } catch {} }
      if (storedServices) { try { const p = JSON.parse(storedServices) as number[]; if (Array.isArray(p)) setSelectedServiceIds(p); } catch {} }
      if (storedPlan) { const n = parseInt(storedPlan, 10); if (!Number.isNaN(n)) setSelectedPlanId(n); }
    } catch {}
    finally { setStateInitialized(true); }
  }, []);

  useEffect(() => { loadPersistedState(); }, [loadPersistedState]);
  useEffect(() => { if (stateInitialized) onboardingStorage.set('availabilityStatus', availabilityStatus); }, [availabilityStatus, stateInitialized]);
  useEffect(() => { if (stateInitialized) onboardingStorage.set('availabilitySlots', JSON.stringify(availabilitySlots)); }, [availabilitySlots, stateInitialized]);
  useEffect(() => { if (stateInitialized) onboardingStorage.set('selectedServices', JSON.stringify(selectedServiceIds)); }, [selectedServiceIds, stateInitialized]);
  useEffect(() => { if (stateInitialized) onboardingStorage.set('selectedPlan', selectedPlanId !== null ? String(selectedPlanId) : ''); }, [selectedPlanId, stateInitialized]);

  // ── slot helpers (unchanged logic) ─────────────────────────────────────────
  const addAvailabilitySlot    = useCallback((day: string) => setAvailabilitySlots(prev => [...prev, { day, start: '09:00', end: '17:00' }]), []);
  const updateAvailabilitySlot = useCallback((day: string, idx: number, field: 'start' | 'end', val: string) => {
    setAvailabilitySlots(prev => { let occ = -1; return prev.map(s => { if (dayKey(s.day) === dayKey(day)) { occ++; if (occ === idx) return { ...s, [field]: val }; } return s; }); });
  }, []);
  const removeAvailabilitySlot = useCallback((day: string, idx: number) => {
    setAvailabilitySlots(prev => { let occ = -1; return prev.filter(s => { if (dayKey(s.day) === dayKey(day)) { occ++; return occ !== idx; } return true; }); });
  }, []);

  // ── data loading ────────────────────────────────────────────────────────────
  const loadServices = useCallback(async () => {
    setIsLoadingStep(true);
    try { setServices(await fetchServices(token)); }
    catch (e: any) { Alert.alert(t('Error'), e?.message || t('onboarding.errors.loadServices')); }
    finally { setIsLoadingStep(false); }
  }, [token]);

  const loadPlans = useCallback(async () => {
    setIsLoadingStep(true);
    try { setPlans(await fetchSubscriptionPlans(token)); }
    catch (e: any) { Alert.alert(t('Error'), e?.message || t('onboarding.errors.loadPlans')); }
    finally { setIsLoadingStep(false); }
  }, [token]);

  useEffect(() => {
    if (step === 2 && services.length === 0) loadServices();
    if (step === 3 && plans.length === 0)    loadPlans();
  }, [step]);

  // ── navigation handlers ────────────────────────────────────────────────────
  const handleAvailabilityNext = () => {
    if (availabilityStatus === 'FIXED_TIMES' && availabilitySlots.length === 0) {
      Alert.alert(t('onboarding.alerts.availabilityTitle'), t('onboarding.alerts.addSlot')); return;
    }
    animateToStep(2, 'fwd');
  };

  const handleServicesNext = () => {
    if (selectedServiceIds.length === 0) {
      Alert.alert(t('onboarding.alerts.servicesTitle'), t('onboarding.alerts.selectService')); return;
    }
    animateToStep(3, 'fwd');
  };

  const handlePlanNext = () => {
    if (!selectedPlanId) {
      Alert.alert(t('onboarding.alerts.subscriptionTitle'), t('onboarding.alerts.selectSubscription')); return;
    }
    animateToStep(4, 'fwd');
  };

  // ── time validation helpers (unchanged) ─────────────────────────────────────
  const parseTime = (t: string): number | null => {
    if (!/^\d{2}:\d{2}$/.test(t)) return null;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  };
  const fmt = (n: number) => `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;

  const hasValidAvailability = () => {
    if (availabilityStatus === 'AVAILABLE_ANYTIME') return true;
    if (availabilitySlots.length === 0) return false;
    return availabilitySlots.every(s => {
      const d = (WEEK_DAYS.find(w => dayKey(w) === dayKey(s.day)) || s.day || '').replace(/\s+/g,'').toUpperCase();
      const st = parseTime(s.start), en = parseTime(s.end);
      return Boolean(d) && st !== null && en !== null && st < en;
    });
  };

  const buildAvailabilityPayload = () => {
    if (availabilityStatus === 'AVAILABLE_ANYTIME') return [];
    const ord = new Map<string, number>(); WEEK_DAYS.forEach((d, i) => ord.set(dayKey(d), i));
    return availabilitySlots.map(s => {
      const d = (WEEK_DAYS.find(w => dayKey(w) === dayKey(s.day)) || s.day || '').replace(/\s+/g,'').toUpperCase();
      const st = parseTime(s.start), en = parseTime(s.end);
      if (!d || st === null || en === null || st >= en) return null;
      return { dayOfWeek: d, startTime: fmt(st), endTime: fmt(en) };
    }).filter((x): x is { dayOfWeek: string; startTime: string; endTime: string } => Boolean(x))
      .sort((a, b) => { const dd = (ord.get(dayKey(a.dayOfWeek))??0) - (ord.get(dayKey(b.dayOfWeek))??0); if (dd !== 0) return dd; return (parseTime(a.startTime)??0) - (parseTime(b.startTime)??0); });
  };

  // ── finish ─────────────────────────────────────────────────────────────────
  const handleFinishOnboarding = async () => {
    if (availabilityStatus === 'FIXED_TIMES' && !hasValidAvailability()) {
      Alert.alert(t('onboarding.alerts.availabilityTitle'), t('onboarding.alerts.invalidTimes'));
      animateToStep(1, 'back'); return;
    }
    if (selectedServiceIds.length === 0) {
      Alert.alert(t('onboarding.alerts.servicesTitle'), t('onboarding.alerts.selectService'));
      animateToStep(2, 'back'); return;
    }
    if (!selectedPlanId) {
      Alert.alert(t('onboarding.alerts.subscriptionTitle'), t('onboarding.alerts.selectSubscription'));
      animateToStep(3, 'back'); return;
    }
    setIsCompleting(true);
    try {
      await saveAvailability(token, availabilityStatus === 'AVAILABLE_ANYTIME' ? { status: availabilityStatus } : { status: availabilityStatus, slots: buildAvailabilityPayload() });
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
        <AvailabilityStep status={availabilityStatus} slots={availabilitySlots}
          onChangeStatus={setAvailabilityStatus} onAddSlot={addAvailabilitySlot}
          onUpdateSlot={updateAvailabilitySlot} onRemoveSlot={removeAvailabilitySlot}
          onNext={handleAvailabilityNext} colors={colors} t={t} language={i18n.language} />
      );
      case 2: return (
        <ServicesStep services={services} selectedServiceIds={selectedServiceIds}
          onToggleService={id => setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
          refreshing={isLoadingStep && services.length === 0} onRefresh={loadServices}
          onNext={handleServicesNext} onBack={() => animateToStep(1, 'back')}
          colors={colors} t={t} language={i18n.language} />
      );
      case 3: return (
        <SubscriptionStep plans={plans} selectedPlanId={selectedPlanId} onSelectPlan={setSelectedPlanId}
          refreshing={isLoadingStep && plans.length === 0} onRefresh={loadPlans}
          onNext={handlePlanNext} onBack={() => animateToStep(2, 'back')}
          colors={colors} t={t} language={i18n.language} />
      );
      case 4: default: return (
        <ConfirmationStep availabilityStatus={availabilityStatus} slots={availabilitySlots}
          services={selectedServices} subscription={selectedPlan}
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
      <View style={ms.headerBlock}>
        <Text style={[ms.screenTitle, { color: colors.text, fontSize: scaledSize(22) }]}>{t('onboarding.technicianTitle')}</Text>
        <Text style={[ms.screenSub, { color: colors.textSecondary, fontSize: scaledSize(13) }]}>{t('onboarding.subtitle')}</Text>
      </View>

      {/* Animated progress bar */}
      <StepProgressBar current={step} t={t} isDark={isDark} />

      {/* Animated step content */}
      <Animated.ScrollView
        style={{ flex: 1, opacity: opacityAnim, transform: [{ translateX: slideAnim }] }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </Animated.ScrollView>
    </View>
  );
};

const ms = StyleSheet.create({
  root:        { flex: 1 },
  headerBlock: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  screenTitle: { fontWeight: '800', marginBottom: 3 },
  screenSub:   { lineHeight: 18 },
});

export default TechnicianOnboardingScreen;
