/**
 * useRTL Hook
 * Provides RTL (Right-to-Left) support based on current language (Arabic = RTL).
 */

import { useTranslation } from 'react-i18next';

export const useRTL = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.toLowerCase() ?? '';
  const isRTL = lang === 'ar' || lang.startsWith('ar-');

  return {
    isRTL,
    rowDirection: isRTL ? ('row-reverse' as const) : ('row' as const),
    backIcon: 'chevron-back' as const,
    arrowBackIcon: 'arrow-back' as const,
    forwardIcon: 'chevron-forward' as const,
    arrowForwardIcon: 'arrow-forward' as const,
    textAlign: isRTL ? ('right' as const) : ('left' as const),
    oppositeTextAlign: isRTL ? ('left' as const) : ('right' as const),
    marginStart: (value: number) => (isRTL ? { marginRight: value } : { marginLeft: value }),
    marginEnd: (value: number) => (isRTL ? { marginLeft: value } : { marginRight: value }),
    paddingStart: (value: number) => (isRTL ? { paddingRight: value } : { paddingLeft: value }),
    paddingEnd: (value: number) => (isRTL ? { paddingLeft: value } : { paddingRight: value }),
  };
};
