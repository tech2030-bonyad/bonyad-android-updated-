import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { AvatarRing } from './AvatarRing';
import { StatTile } from './StatTile';

type Props = {
  initials: string;
  displayName: string;
  roleLabel: string;
  bioText: string;
  projectsCount: string;
  ratingText: string;
  activeText: string;
  labels: { projects: string; rating: string; active: string };
  boldFontFamily?: string;
  fontFamily?: string;
  avatarUrl?: string | null;
  onEditProfile: () => void;
  onShare: () => void;
  onMenu: () => void;
  editProfileLabel: string;
  shareLabel: string;
};

export function ProfileSection({
  initials,
  displayName,
  roleLabel,
  bioText,
  projectsCount,
  ratingText,
  activeText,
  labels,
  boldFontFamily,
  fontFamily,
  avatarUrl,
  onEditProfile,
  onShare,
  onMenu,
  editProfileLabel,
  shareLabel,
}: Props) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const rolePillStyle = useMemo(
    () => ({
      backgroundColor: isDark ? 'rgba(0,84,155,0.2)' : 'rgba(0,84,155,0.12)',
      borderColor: isDark ? 'rgba(0,150,255,0.4)' : 'rgba(0,84,155,0.25)',
    }),
    [isDark],
  );
  const secondaryBtn = useMemo(
    () => ({
      backgroundColor: isDark ? '#1C1C1E' : colors.gray100,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
    }),
    [colors.border, colors.gray100, isDark],
  );

  return (
    <>
      <View style={[styles.profileOuter, { flexDirection: 'row' }]}>
        <AvatarRing avatarUrl={avatarUrl}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '800',
              color: colors.white,
              fontFamily: boldFontFamily,
            }}
          >
            {initials}
          </Text>
        </AvatarRing>
        <View style={styles.statsCol}>
          <View style={[styles.statsRow, { flexDirection: 'row' }]}>
            <StatTile value={projectsCount} label={labels.projects} boldFontFamily={boldFontFamily} fontFamily={fontFamily} />
            <StatTile
              value={ratingText}
              label={labels.rating}
              boldFontFamily={boldFontFamily}
              fontFamily={fontFamily}
              showRatingStar
            />
            <StatTile value={activeText} label={labels.active} boldFontFamily={boldFontFamily} fontFamily={fontFamily} />
          </View>
        </View>
      </View>

      <View style={styles.bioOuter}>
        <Text style={[styles.nameText, { fontFamily: boldFontFamily, color: colors.text }]}>{displayName}</Text>
        <View style={[styles.rolePill, rolePillStyle, { flexDirection: 'row' }]}>
          <Text style={[styles.roleText, { fontFamily: boldFontFamily }]}>{roleLabel}</Text>
        </View>
        {bioText ? (
          <Text style={[styles.bioText, { fontFamily, color: colors.textSecondary }]}>{bioText}</Text>
        ) : null}
      </View>

      <View style={[styles.actionRow, { flexDirection: 'row' }]}>
        <TouchableOpacity style={styles.btnEdit} onPress={onEditProfile} activeOpacity={0.85}>
          <Text style={[styles.btnEditText, { fontFamily: boldFontFamily }]}>{editProfileLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnShare, secondaryBtn]} onPress={onShare} activeOpacity={0.85}>
          <Text style={[styles.btnShareText, { fontFamily: boldFontFamily, color: colors.text }]}>{shareLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnMore, secondaryBtn]} onPress={onMenu} activeOpacity={0.85}>
          <Text style={[styles.dots, { color: colors.textTertiary }]}>•••</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  profileOuter: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 18,
  },
  statsCol: {
    flex: 1,
    minWidth: 0,
  },
  statsRow: {
    gap: 2,
  },
  bioOuter: {
    paddingHorizontal: 0,
    paddingBottom: 14,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  rolePill: {
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5bb4ff',
  },
  bioText: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  actionRow: {
    gap: 8,
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 16,
  },
  btnEdit: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#00549B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnShare: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnShareText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnMore: {
    width: 42,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
