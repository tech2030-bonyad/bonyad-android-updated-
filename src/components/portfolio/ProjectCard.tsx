import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const COVER_A = ['#0a1628', '#003d73', '#0077cc'] as const;
const COVER_B = ['#0f1a28', '#0d2a45', '#1a4a6b'] as const;

type Props = {
  index: number;
  title: string;
  description: string;
  ownerName: string;
  initials: string;
  imageUri: string | null;
  categoryTag: string;
  emoji: string;
  coverDate: string;
  headerDate: string;
  boldFontFamily?: string;
  fontFamily?: string;
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
  noImageLabel: string;
};

function MiniAvatar({ initials, boldFontFamily }: { initials: string; boldFontFamily?: string }) {
  return (
    <LinearGradient colors={['#003d73', '#00549B']} style={styles.miniAv} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Text style={[styles.miniAvText, { fontFamily: boldFontFamily }]}>{initials}</Text>
    </LinearGradient>
  );
}

export function ProjectCard({
  index,
  title,
  description,
  ownerName,
  initials,
  imageUri,
  categoryTag,
  emoji,
  coverDate,
  headerDate,
  boldFontFamily,
  fontFamily,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  noImageLabel,
}: Props) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const coverColors = index % 2 === 0 ? COVER_A : COVER_B;
  // Keep LTR/neutral layout (no mirroring in RTL)
  const catLeft = { left: 10 };
  const dateRight = { right: 10 };
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const hasImageUri = Boolean(imageUri?.trim());
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : colors.border;
  const headerRule = isDark ? 'rgba(255,255,255,0.06)' : colors.border;
  const placeholderBg = isDark ? '#3A3A3C' : colors.gray200;
  const accentBlue = useMemo(() => (isDark ? '#5bb4ff' : colors.primary), [colors.primary, isDark]);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [imageUri]);

  const showImage = hasImageUri && !imageLoadFailed;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: cardBorder }]}>
      <View style={styles.cover}>
        {showImage ? (
          <>
            <Image
              source={{ uri: imageUri! }}
              style={styles.coverImg}
              resizeMode="cover"
              onError={() => setImageLoadFailed(true)}
            />
            <LinearGradient colors={[...coverColors]} style={styles.coverTint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.coverFade} pointerEvents="none" />
          </>
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: placeholderBg }]}>
            <Text style={[styles.coverNoImageText, { fontFamily, color: colors.textSecondary }]}>{noImageLabel}</Text>
          </View>
        )}
        {showImage ? (
          <View style={styles.coverCenter}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.coverTitle, { fontFamily: boldFontFamily }]} numberOfLines={2}>
              {title}
            </Text>
          </View>
        ) : null}
        <View style={[styles.catTag, catLeft]}>
          <Text style={[styles.catTagText, { fontFamily: boldFontFamily }]}>{categoryTag}</Text>
        </View>
        <Text style={[styles.coverDate, dateRight, { fontFamily }]}>{coverDate}</Text>
      </View>

      <View style={[styles.cardHeader, { flexDirection: 'row', borderTopColor: headerRule }]}>
        <View style={[styles.headerLeft, { flexDirection: 'row', gap: 12 }]}>
          <MiniAvatar initials={initials} boldFontFamily={boldFontFamily} />
          <View style={styles.headerNames}>
            <Text style={[styles.ownerName, { fontFamily: boldFontFamily, color: colors.text }]}>{ownerName}</Text>
            <Text style={[styles.headerDate, { fontFamily, color: colors.textSecondary }]}>{headerDate}</Text>
          </View>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={[styles.desc, { fontFamily, color: colors.textSecondary }]} numberOfLines={5}>
          {description || '—'}
        </Text>
        <View style={[styles.btnRow, { flexDirection: 'row' }]}>
          <TouchableOpacity style={styles.btnEdit} onPress={onEdit} activeOpacity={0.85}>
            <Svg width={11} height={11} viewBox="0 0 24 24">
              <Path
                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                stroke={accentBlue}
                strokeWidth={2.5}
                fill="none"
              />
              <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={accentBlue} strokeWidth={2.5} fill="none" />
            </Svg>
            <Text style={[styles.btnEditText, { fontFamily: boldFontFamily, color: accentBlue }]}>{editLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnDel} onPress={onDelete} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={11} color={colors.error} />
            <Text style={[styles.btnDelText, { fontFamily: boldFontFamily, color: colors.error }]}>{deleteLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    alignItems: 'center',
    flex: 1,
  },
  miniAv: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(0,84,155,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerNames: {
    flex: 1,
    minWidth: 0,
  },
  ownerName: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerDate: {
    fontSize: 10,
  },
  cover: {
    width: '100%',
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImg: {
    ...StyleSheet.absoluteFillObject,
  },
  coverTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
  },
  coverPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  coverNoImageText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  coverFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  coverCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  emoji: {
    fontSize: 36,
  },
  coverTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  catTag: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  catTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  coverDate: {
    position: 'absolute',
    bottom: 8,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  titleRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  bodyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  desc: {
    fontSize: 12,
    lineHeight: 18,
    color: '#B0B0B0',
    marginBottom: 12,
  },
  btnRow: {
    gap: 10,
  },
  btnEdit: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(0,84,155,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0,84,155,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnEditText: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnDel: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDelText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
