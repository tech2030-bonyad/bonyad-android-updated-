/**
 * InteractiveDemoOverlay — Full-screen interactive demo guide.
 *
 * Flow:
 *   1. Info button tap → overlay opens in MENU mode
 *   2. User picks a demo card → switches to PLAYER mode
 *   3. Chatbot mascot narrates each step with animated eyes
 *   4. User taps Next / swipes to walk through the demo
 *   5. On finish → back to menu or close overlay
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatbotRobotFace } from '../ChatbotFab';
import RialIcon from '../RialIcon';
import type { DemoDefinition, DemoStep } from './demoDefinitions';

const BLUR_INTENSITY = Platform.OS === 'ios' ? 60 : 35;
const ROBOT_SIZE = 52;

interface InteractiveDemoOverlayProps {
  visible: boolean;
  demos: DemoDefinition[];
  primaryColor: string;
  textColor: string;
  secondaryTextColor: string;
  bgColor: string;
  cardBgColor: string;
  borderColor: string;
  isRTL: boolean;
  isDark: boolean;
  fontFamily?: string;
  boldFontFamily?: string;
  onClose: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

type OverlayMode = 'menu' | 'player';

// ─── DemoActionCard ─────────────────────────────────────────────────────────
function DemoActionCard({
  demo, onPress, textColor, secondaryTextColor, cardBgColor, borderColor,
  isRTL, isDark, fontFamily, boldFontFamily, t, index, enterAnim,
}: {
  demo: DemoDefinition; onPress: () => void; textColor: string;
  secondaryTextColor: string; cardBgColor: string; borderColor: string;
  isRTL: boolean; isDark: boolean; fontFamily?: string; boldFontFamily?: string;
  t: (key: string) => string; index: number; enterAnim: Animated.Value;
}) {
  const ff = fontFamily || undefined;
  const bff = boldFontFamily || ff;

  // Staggered card entrance
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    cardAnim.setValue(0);
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: index * 80,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: cardAnim,
        transform: [
          { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
          { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={[cardStyles.card, { backgroundColor: cardBgColor, borderColor }]}
      >
        <View style={[cardStyles.iconCircle, { backgroundColor: `${demo.color}18` }]}>
          <Ionicons name={demo.icon as any} size={26} color={demo.color} />
        </View>
        <View style={[cardStyles.textWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[cardStyles.title, { color: textColor, fontFamily: bff, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {t(demo.titleKey)}
          </Text>
          <Text style={[cardStyles.desc, { color: secondaryTextColor, fontFamily: ff, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {t(demo.descriptionKey)}
          </Text>
        </View>
        <View style={[cardStyles.badge, { backgroundColor: `${demo.color}15` }]}>
          <Text style={[cardStyles.badgeText, { color: demo.color, fontFamily: ff }]}>
            {demo.steps.length} {t('demo.steps')}
          </Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color={demo.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, flexDirection: 'column', gap: 12 },
  iconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  desc: { fontSize: 12.5, lineHeight: 18, opacity: 0.8 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});

// ─── DemoStepVisual ─────────────────────────────────────────────────────────
function DemoStepVisual({
  step, stepIndex, totalSteps, demoColor, textColor, secondaryTextColor,
  cardBgColor, isDark, isRTL, fontFamily, boldFontFamily, t,
}: {
  step: DemoStep; stepIndex: number; totalSteps: number; demoColor: string;
  textColor: string; secondaryTextColor: string; cardBgColor: string;
  isDark: boolean; isRTL: boolean; fontFamily?: string; boldFontFamily?: string;
  t: (key: string) => string;
}) {
  const ff = fontFamily || undefined;
  const bff = boldFontFamily || ff;
  const dummyData = step.dummyData;

  return (
    <View style={[visualStyles.container, { backgroundColor: isDark ? '#222240' : '#f0f4f8' }]}>
      <View style={[visualStyles.mockupCard, { backgroundColor: cardBgColor, borderColor: `${demoColor}20` }]}>
        <LinearGradient colors={[demoColor, `${demoColor}CC`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={visualStyles.accentStrip} />
        <View style={[visualStyles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[visualStyles.cardIconCircle, { backgroundColor: `${demoColor}15` }]}>
            <Ionicons name={step.icon as any} size={24} color={demoColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[visualStyles.cardTitle, { color: textColor, fontFamily: bff, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
              {t(step.titleKey)}
            </Text>
            <Text style={[visualStyles.cardSubtitle, { color: secondaryTextColor, fontFamily: ff, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('demo.stepOf').replace('{current}', String(stepIndex + 1)).replace('{total}', String(totalSteps))}
            </Text>
          </View>
        </View>

        {dummyData && Object.keys(dummyData).length > 0 && (
          <View style={visualStyles.fieldsContainer}>
            {Object.entries(dummyData).map(([key, value], idx) => {
              const label = key.replace(/([A-Z])/g, ' $1').trim();
              const isBoolean = typeof value === 'boolean';
              const isMoney = key.toLowerCase().includes('price') || key.toLowerCase().includes('budget') || key.toLowerCase().includes('amount');
              return (
                <View key={key} style={[visualStyles.fieldRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }, idx < Object.keys(dummyData).length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? '#ffffff10' : '#00000008' }]}>
                  <View style={[visualStyles.fieldIcon, { backgroundColor: `${demoColor}10` }]}>
                    {isMoney ? (
                      <RialIcon size={14} variant={isDark ? 'light' : 'dark'} color={demoColor} />
                    ) : (
                      <Ionicons name={
                        isBoolean ? (value ? 'checkmark-circle' : 'close-circle') as any :
                        key.toLowerCase().includes('name') ? ('person' as any) :
                        key.toLowerCase().includes('location') ? ('location' as any) :
                        key.toLowerCase().includes('date') || key.toLowerCase().includes('time') ? ('calendar' as any) :
                        key.toLowerCase().includes('rating') ? ('star' as any) :
                        key.toLowerCase().includes('status') ? ('pulse' as any) :
                        key.toLowerCase().includes('photo') ? ('image' as any) :
                        ('ellipse' as any)
                      } size={14} color={demoColor} />
                    )}
                  </View>
                  <Text style={[visualStyles.fieldLabel, { color: secondaryTextColor, fontFamily: ff, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    {isBoolean ? (
                      <View style={[visualStyles.boolBadge, { backgroundColor: value ? '#22C55E20' : '#EF444420' }]}>
                        <Ionicons name={value ? 'checkmark' : 'close'} size={12} color={value ? '#22C55E' : '#EF4444'} />
                        <Text style={[visualStyles.boolText, { color: value ? '#22C55E' : '#EF4444', fontFamily: ff }]}>{value ? 'Yes' : 'No'}</Text>
                      </View>
                    ) : (
                      <Text style={[visualStyles.fieldValue, { color: textColor, fontFamily: bff }]} numberOfLines={1}>{String(value)}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={[visualStyles.mockupButton, { backgroundColor: `${demoColor}12`, borderColor: `${demoColor}30` }]}>
          <Ionicons name={step.icon as any} size={16} color={demoColor} />
          <Text style={[visualStyles.mockupButtonText, { color: demoColor, fontFamily: bff }]}>{t(step.titleKey)}</Text>
        </View>
      </View>

      {/* Progress dots */}
      <View style={visualStyles.flowRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <React.Fragment key={i}>
            <View style={{ backgroundColor: i <= stepIndex ? demoColor : `${demoColor}30`, width: i === stepIndex ? 16 : 8, height: 6, borderRadius: 3 }} />
            {i < totalSteps - 1 && <View style={{ width: 6, height: 2, borderRadius: 1, backgroundColor: i < stepIndex ? demoColor : `${demoColor}20` }} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const visualStyles = StyleSheet.create({
  container: { borderRadius: 20, padding: 16, alignItems: 'center', gap: 14, marginBottom: 8 },
  mockupCard: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  accentStrip: { height: 4, width: '100%' },
  cardHeader: { padding: 14, gap: 12, alignItems: 'center' },
  cardIconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardSubtitle: { fontSize: 11, marginTop: 2, opacity: 0.6 },
  fieldsContainer: { paddingHorizontal: 14 },
  fieldRow: { alignItems: 'center', gap: 10, paddingVertical: 10 },
  fieldIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 12, textTransform: 'capitalize', opacity: 0.7, minWidth: 60 },
  fieldValue: { fontSize: 13, fontWeight: '600' },
  boolBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  boolText: { fontSize: 11, fontWeight: '600' },
  mockupButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 14, paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
  mockupButtonText: { fontSize: 13, fontWeight: '600' },
  flowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
});

// ─── Main Component ─────────────────────────────────────────────────────────

export default function InteractiveDemoOverlay({
  visible, demos, primaryColor, textColor, secondaryTextColor, bgColor,
  cardBgColor, borderColor, isRTL, isDark, fontFamily, boldFontFamily, onClose, t,
}: InteractiveDemoOverlayProps) {
  const [mode, setMode] = useState<OverlayMode>('menu');
  const [selectedDemo, setSelectedDemo] = useState<DemoDefinition | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const ff = fontFamily || undefined;
  const bff = boldFontFamily || ff;

  // Animations
  const menuEnter = useRef(new Animated.Value(0)).current;
  const playerEnter = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;
  const isTransitioning = useRef(false); // prevents double-tap

  // Reset on open
  useEffect(() => {
    if (visible) {
      setMode('menu');
      setSelectedDemo(null);
      setCurrentStep(0);
      menuEnter.setValue(0);
      Animated.spring(menuEnter, { toValue: 1, tension: 50, friction: 8, useNativeDriver: false }).start();
    }
  }, [visible]);

  // Animate step entrance
  useEffect(() => {
    if (mode === 'player') {
      stepAnim.setValue(0);
      Animated.spring(stepAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: false }).start();
    }
  }, [currentStep, mode]);

  const handleSelectDemo = useCallback((demo: DemoDefinition) => {
    setSelectedDemo(demo);
    setCurrentStep(0);
    setMode('player');
    playerEnter.setValue(0);
    Animated.spring(playerEnter, { toValue: 1, tension: 50, friction: 8, useNativeDriver: false }).start();
  }, [playerEnter]);

  const handleBackToMenu = useCallback(() => {
    Animated.timing(playerEnter, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => {
      setMode('menu');
      setSelectedDemo(null);
      setCurrentStep(0);
      menuEnter.setValue(0);
      Animated.spring(menuEnter, { toValue: 1, tension: 50, friction: 8, useNativeDriver: false }).start();
    });
  }, [playerEnter, menuEnter]);

  const handleNext = useCallback(() => {
    if (!selectedDemo) return;
    if (currentStep < selectedDemo.steps.length - 1) {
      if (isTransitioning.current) return;
      isTransitioning.current = true;
      setCurrentStep(s => s + 1);
      setTimeout(() => { isTransitioning.current = false; }, 350);
    } else {
      handleBackToMenu();
    }
  }, [selectedDemo, currentStep, handleBackToMenu]);

  const handlePrev = useCallback(() => {
    if (!selectedDemo || currentStep <= 0) return;
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    setCurrentStep(s => s - 1);
    setTimeout(() => { isTransitioning.current = false; }, 350);
  }, [selectedDemo, currentStep]);

  if (!visible) return null;

  const step = selectedDemo?.steps[currentStep];
  const pageBg = isDark ? '#1a1a2e' : '#ffffff';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFillObject}>
        {/* Background blur */}
        <BlurView intensity={BLUR_INTENSITY} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)' }]} />
        </BlurView>

        {/* ─── MENU MODE ──────────────────────────────────────────────────── */}
        {mode === 'menu' && (
          <Animated.View style={[styles.menuContainer, {
            backgroundColor: pageBg,
            opacity: menuEnter,
            transform: [{ translateY: menuEnter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          }]}>
            {/* Header */}
            <View style={[styles.menuHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.robotCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : `${primaryColor}10` }]}>
                <ChatbotRobotFace primaryColor={primaryColor} primaryDark={isDark ? '#0078E0' : '#0068C8'} diameter={ROBOT_SIZE} enableBlink />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.menuTitle, { color: textColor, fontFamily: bff, textAlign: isRTL ? 'right' : 'left' }]}>{t('demo.menuTitle')}</Text>
                <Text style={[styles.menuSubtitle, { color: secondaryTextColor, fontFamily: ff, textAlign: isRTL ? 'right' : 'left' }]}>{t('demo.menuSubtitle')}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={22} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.cardsContainer} showsVerticalScrollIndicator={false}>
              {demos.map((demo, i) => (
                <DemoActionCard key={demo.id} demo={demo} index={i} onPress={() => handleSelectDemo(demo)}
                  textColor={textColor} secondaryTextColor={secondaryTextColor} cardBgColor={cardBgColor}
                  borderColor={borderColor} isRTL={isRTL} isDark={isDark} fontFamily={fontFamily}
                  boldFontFamily={boldFontFamily} t={t} enterAnim={menuEnter} />
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        )}

        {/* ─── PLAYER MODE ────────────────────────────────────────────────── */}
        {mode === 'player' && selectedDemo && step && (
          <Animated.View style={[styles.playerContainer, {
            backgroundColor: pageBg,
            opacity: playerEnter,
            transform: [{ translateY: playerEnter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
          }]}>
            {/* Header */}
            <View style={[styles.playerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={handleBackToMenu} style={[styles.backBtn, { backgroundColor: `${primaryColor}12` }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={primaryColor} />
              </TouchableOpacity>
              <Text style={[styles.playerTitle, { color: textColor, fontFamily: bff, textAlign: 'center', flex: 1 }]} numberOfLines={1}>
                {t(selectedDemo.titleKey)}
              </Text>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={22} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Step counter */}
            <Animated.Text style={[styles.stepCounter, {
              color: secondaryTextColor, fontFamily: ff,
              opacity: stepAnim,
            }]}>
              {t('demo.stepOf').replace('{current}', String(currentStep + 1)).replace('{total}', String(selectedDemo.steps.length))}
            </Animated.Text>

            {/* Step content */}
            <ScrollView contentContainerStyle={styles.playerContent} showsVerticalScrollIndicator={false}>
              {/* Speech bubble — fades on step change */}
              <Animated.View style={[styles.speechBubbleWrap, {
                opacity: stepAnim,
                transform: [{ scale: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
              }]}>
                <View style={[styles.speechBubble, { backgroundColor: isDark ? '#262650' : '#f8f9fc', borderColor: `${selectedDemo.color}25`, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.speechRobot, { backgroundColor: `${selectedDemo.color}12` }]}>
                    <ChatbotRobotFace primaryColor={selectedDemo.color} primaryDark={selectedDemo.color} diameter={42} enableBlink />
                  </View>
                  <View style={[styles.speechText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.narrationText, { color: textColor, fontFamily: ff, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t(step.narrationKey)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.speechArrow, { borderTopColor: isDark ? '#262650' : '#f8f9fc', alignSelf: isRTL ? 'flex-end' : 'flex-start', marginLeft: isRTL ? 0 : 36, marginRight: isRTL ? 36 : 0 }]} />
              </Animated.View>

              {/* Step card */}
              <Animated.View style={{ opacity: stepAnim }}>
                <DemoStepVisual
                  step={step} stepIndex={currentStep} totalSteps={selectedDemo.steps.length}
                  demoColor={selectedDemo.color} textColor={textColor} secondaryTextColor={secondaryTextColor}
                  cardBgColor={cardBgColor} isDark={isDark} isRTL={isRTL}
                  fontFamily={fontFamily} boldFontFamily={boldFontFamily} t={t}
                />
              </Animated.View>
            </ScrollView>

            {/* Bottom nav bar */}
            <View style={[styles.playerNav, { backgroundColor: pageBg, borderTopColor: borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={handlePrev} disabled={currentStep === 0}
                style={[styles.navBtn, styles.navBtnOutline, {
                  borderColor: currentStep === 0 ? `${primaryColor}20` : `${primaryColor}40`,
                  opacity: currentStep === 0 ? 0.35 : 1,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }]}
              >
                <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={16} color={primaryColor} />
                <Text style={[styles.navBtnText, { color: primaryColor, fontFamily: bff }]}>{t('demo.previous')}</Text>
              </TouchableOpacity>

              <View style={styles.dotsRow}>
                {selectedDemo.steps.map((_, i) => (
                  <Animated.View key={i} style={[styles.dot, {
                    width: i === currentStep ? 18 : 6,
                    backgroundColor: i === currentStep ? selectedDemo.color : `${selectedDemo.color}30`,
                  }]} />
                ))}
              </View>

              <TouchableOpacity
                onPress={handleNext}
                style={[styles.navBtn, styles.navBtnFilled, { backgroundColor: selectedDemo.color, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={[styles.navBtnText, { color: '#fff', fontFamily: bff }]}>
                  {currentStep === selectedDemo.steps.length - 1 ? t('demo.finish') : t('demo.next')}
                </Text>
                {currentStep < selectedDemo.steps.length - 1 && (
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: Platform.OS === 'ios' ? 0 : 8,
    overflow: 'hidden',
  },
  menuHeader: { alignItems: 'center', gap: 14, marginBottom: 20, paddingHorizontal: 4 },
  robotCircle: {
    width: ROBOT_SIZE + 8, height: ROBOT_SIZE + 8, borderRadius: (ROBOT_SIZE + 8) / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  menuTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  menuSubtitle: { fontSize: 13, lineHeight: 18, opacity: 0.7 },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  cardsContainer: { paddingBottom: 20 },

  playerContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: Platform.OS === 'ios' ? 0 : 8,
    overflow: 'hidden',
  },
  playerHeader: { alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  playerTitle: { fontSize: 16, fontWeight: '700' },
  stepCounter: { fontSize: 12, textAlign: 'center', marginBottom: 10, opacity: 0.6 },
  playerContent: { paddingHorizontal: 16, paddingBottom: 16 },

  speechBubbleWrap: { marginBottom: 12 },
  speechBubble: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12, alignItems: 'flex-start' },
  speechRobot: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  speechText: { flex: 1, justifyContent: 'center' },
  narrationText: { fontSize: 14, lineHeight: 22 },
  speechArrow: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent' },

  playerNav: {
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 14,
    borderTopWidth: 1, gap: 10,
  },
  navBtn: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, minWidth: 90 },
  navBtnOutline: { borderWidth: 1.5 },
  navBtnFilled: { elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  navBtnText: { fontSize: 13, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' },
  dot: { height: 6, borderRadius: 3 },
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, marginBottom: 8, opacity: 0.4 },
  swipeHintText: { fontSize: 11 },
});
