import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  title: string;
  onBack: () => void;
  boldFontFamily?: string;
};

// Get status bar height for Android to prevent overlap
function useHeaderTopPadding(): number {
  // This screen already has its own top layout/safe-area handling.
  // Forcefully remove extra padding so the header sits flush under the top bar.
  return 0;
}

function BackChevron({ stroke }: { stroke: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M15 18l-6-6 6-6" stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PortfolioHeader({ title, onBack, boldFontFamily }: Props) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith('ar');
  const { colors } = useTheme();
  const topPadding = useHeaderTopPadding();
  // Force header to remain LTR even if the rest of the app is RTL.
  // (On React Native Web, `direction` is respected by layout.)
  const ltrStyle = Platform.OS === 'web' ? ({ direction: 'ltr', textAlign: 'left' } as any) : null;
  return (
    <View style={[styles.container, { paddingTop: topPadding, backgroundColor: colors.background }, ltrStyle]}>
      <View style={[styles.leftGroup, ltrStyle]}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backHit}>
          <View style={isArabic ? styles.chevronFlip : undefined}>
            <BackChevron stroke={colors.textSecondary} />
          </View>
        </Pressable>
        <Text style={[styles.title, { fontFamily: boldFontFamily, color: colors.text, textAlign: 'left' }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  backHit: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronFlip: {
    // Mirror the back chevron in Arabic mode.
    transform: [{ scaleX: -1 }],
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
    flexShrink: 1,
  },
});
