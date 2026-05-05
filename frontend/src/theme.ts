// PAYO theme tokens — keep consistent across screens
export const COLORS = {
  primary: '#2EBFA5',
  primaryDark: '#1FA68C',
  primaryGradientStart: '#2EBFA5',
  primaryGradientEnd: '#4ACFB5',
  primaryText: '#00B392',
  cardBorder: '#C8EAE0',
  cardBorderSoft: '#E3F4EE',
  bgLight: '#F5FFFB',
  bgWhite: '#FFFFFF',
  textPrimary: '#0F2A26',
  textSecondary: '#6A7B78',
  textMuted: '#9AABA7',
  accent: '#56D6BA',
  danger: '#E5484D',
  warning: '#F5A623',
  divider: '#EAF5F1',
  overlay: 'rgba(15, 42, 38, 0.55)',
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const TYPO = {
  h1: { fontSize: 28, fontWeight: '800' as const, color: COLORS.textPrimary },
  h2: { fontSize: 22, fontWeight: '700' as const, color: COLORS.textPrimary },
  h3: { fontSize: 18, fontWeight: '700' as const, color: COLORS.textPrimary },
  body: { fontSize: 14, color: COLORS.textPrimary },
  small: { fontSize: 12, color: COLORS.textSecondary },
};
