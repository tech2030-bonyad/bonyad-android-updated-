import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

type Mode = 'grid' | 'list';

type Props = {
  mode: Mode;
  onChange: (m: Mode) => void;
};

function GridIcon({ active, activeColor, inactiveColor }: { active: boolean; activeColor: string; inactiveColor: string }) {
  const c = active ? activeColor : inactiveColor;
  const sw = 1.8;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Rect x="3" y="3" width="7" height="7" stroke={c} strokeWidth={sw} fill="none" rx="1" />
      <Rect x="14" y="3" width="7" height="7" stroke={c} strokeWidth={sw} fill="none" rx="1" />
      <Rect x="3" y="14" width="7" height="7" stroke={c} strokeWidth={sw} fill="none" rx="1" />
      <Rect x="14" y="14" width="7" height="7" stroke={c} strokeWidth={sw} fill="none" rx="1" />
    </Svg>
  );
}

function ListIcon({ active, activeColor, inactiveColor }: { active: boolean; activeColor: string; inactiveColor: string }) {
  const c = active ? activeColor : inactiveColor;
  const sw = 1.8;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M8 6h13M8 12h13M8 18h13" stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <Path d="M3 6h.01M3 12h.01M3 18h.01" stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function PortfolioViewToggle({ mode, onChange }: Props) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : colors.border;
  const activeColor = colors.text;
  const inactiveColor = colors.textTertiary;

  return (
    <View style={[styles.container, { borderTopColor: borderColor, borderBottomColor: borderColor }]}>
      <TouchableOpacity style={styles.tab} onPress={() => onChange('grid')} activeOpacity={0.85}>
        <GridIcon active={mode === 'grid'} activeColor={activeColor} inactiveColor={inactiveColor} />
        {mode === 'grid' ? <View style={[styles.indicator, { backgroundColor: activeColor }]} /> : <View style={styles.indicatorSpacer} />}
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={() => onChange('list')} activeOpacity={0.85}>
        <ListIcon active={mode === 'list'} activeColor={activeColor} inactiveColor={inactiveColor} />
        {mode === 'list' ? <View style={[styles.indicator, { backgroundColor: activeColor }]} /> : <View style={styles.indicatorSpacer} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: 18,
    height: 1.5,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  indicatorSpacer: {
    height: 1.5,
  },
});
