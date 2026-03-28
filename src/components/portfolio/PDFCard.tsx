import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  pdfTitle: string;
  dateLine: string;
  readyLabel: string;
  hasPdf: boolean;
  isBusy: boolean;
  boldFontFamily?: string;
  fontFamily?: string;
  onQr: () => void;
  onDownload: () => void;
  onEdit: () => void;
  qrLabel: string;
  downloadLabel: string;
  editLabel: string;
};

function FileIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke="#5bb4ff"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 2v6h6" stroke="#5bb4ff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PDFCard({
  pdfTitle,
  dateLine,
  readyLabel,
  hasPdf,
  isBusy,
  boldFontFamily,
  fontFamily,
  onQr,
  onDownload,
  onEdit,
  qrLabel,
  downloadLabel,
  editLabel,
}: Props) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.toLowerCase().startsWith('ar');
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const headerColors = useMemo(
    () =>
      isDark
        ? (['rgba(0,61,115,0.8)', 'rgba(0,119,204,0.4)'] as const)
        : (['rgba(0,84,155,0.14)', 'rgba(0,119,204,0.08)'] as const),
    [isDark],
  );
  const outerBorder = isDark ? 'rgba(255,255,255,0.1)' : colors.border;
  const headerBorder = isDark ? 'rgba(255,255,255,0.1)' : colors.border;

  return (
    <View style={[styles.outer, { backgroundColor: colors.cardBackground, borderColor: outerBorder }]}>
      <LinearGradient colors={[...headerColors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.headerStrip, { borderBottomColor: headerBorder }]}>
        <View style={[styles.headerRow, { flexDirection: 'row' }]}>
          <View style={[styles.leftMeta, { flexDirection: 'row', gap: isArabic ? 16 : 12 }]}>
            <View style={styles.fileIconBox}>
              <FileIcon />
            </View>
            <View style={styles.metaText}>
              <Text style={[styles.pdfTitle, { fontFamily: boldFontFamily, color: colors.text }]}>{pdfTitle}</Text>
              <Text style={[styles.pdfDate, { fontFamily, color: colors.textSecondary }]}>{dateLine}</Text>
            </View>
          </View>
          {hasPdf ? (
            <View style={[styles.statusPill, { flexDirection: 'row' }, isArabic ? styles.statusPillAr : null]}>
              <View style={styles.statusDot} />
              <Text style={[styles.statusText, { fontFamily: boldFontFamily }]}>{readyLabel}</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
      <View style={[styles.btnRow, { flexDirection: 'row' }, isArabic ? styles.btnRowAr : null]}>
        <TouchableOpacity
          style={[styles.btnQr, isArabic ? styles.btnActionRowAr : null]}
          onPress={onQr}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          {isBusy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="qr-code-outline" size={13} color="#FFFFFF" />
              <Text style={[styles.btnQrText, isArabic ? styles.btnQrTextAr : null, { fontFamily: boldFontFamily }]}>{qrLabel}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnMuted, isArabic ? styles.btnActionRowAr : null, { backgroundColor: isDark ? '#2C2C2E' : colors.gray200 }]}
          onPress={onDownload}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.btnMutedText, isArabic ? styles.btnMutedTextAr : null, { fontFamily: boldFontFamily, color: colors.textSecondary }]}>{downloadLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnMuted, styles.btnEditFlex, isArabic ? styles.btnActionRowAr : null, { backgroundColor: isDark ? '#2C2C2E' : colors.gray200 }]}
          onPress={onEdit}
          activeOpacity={0.85}
        >
          <Ionicons name="pencil-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.btnMutedText, isArabic ? styles.btnMutedTextAr : null, { fontFamily: boldFontFamily, color: colors.textSecondary }]}>{editLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerStrip: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftMeta: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  fileIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0,84,155,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(0,84,155,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    flex: 1,
    minWidth: 0,
  },
  pdfTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pdfDate: {
    fontSize: 11,
    color: '#B0B0B0',
    marginTop: 1,
  },
  statusPill: {
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.3)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusPillAr: {
    gap: 8,
    paddingHorizontal: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
  },
  btnRow: {
    gap: 10,
    padding: 12,
  },
  btnRowAr: {
    gap: 12,
  },
  btnActionRowAr: {
    gap: 8,
  },
  btnQr: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#00549B',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnQrText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  btnQrTextAr: {
    marginLeft: 12,
  },
  btnMuted: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnEditFlex: {
    flex: 0.7,
  },
  btnMutedText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  btnMutedTextAr: {
    marginLeft: 12,
  },
});
