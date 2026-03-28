import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  label: string;
  onPress: () => void;
  boldFontFamily?: string;
};

function PlusIcon({ stroke }: { stroke: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={stroke} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function AddProjectButton({ label, onPress, boldFontFamily }: Props) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const dashedBorder = isDark ? 'rgba(0,150,255,0.3)' : 'rgba(0, 84, 155, 0.35)';
  return (
    <View style={[styles.dashedWrap, { borderColor: dashedBorder }]}>
      <TouchableOpacity style={[styles.inner, { backgroundColor: colors.cardBackground }]} onPress={onPress} activeOpacity={0.85}>
        <PlusIcon stroke={colors.primary} />
        <Text style={[styles.label, { fontFamily: boldFontFamily, color: colors.primary }]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  dashedWrap: {
    marginHorizontal: 0,
    marginBottom: 80,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    overflow: 'hidden',
  },
  inner: {
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
