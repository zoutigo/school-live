export const colors = {
  primary: "#0C5FA8",
  primaryDark: "#08467D",
  primaryLight: "#3B82C4",
  background: "#F7F1E8",
  surface: "#FFFDFC",
  textPrimary: "#1F2933",
  textSecondary: "#5F5A52",
  border: "#E7D8C8",
  notification: "#DC3545",
  accentTeal: "#247C72",
  warmIvory: "#F7F1E8",
  warmSurface: "#FFF8F0",
  warmBorder: "#E8CCAE",
  warmAccent: "#D89B5B",
  warmAccentDark: "#B7793A",
  warmHighlight: "#F3DFC7",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const gradients = {
  heroBlue: [colors.primaryDark, colors.primary, "#1A74C0"] as const,
  heroFade: [colors.primary, "#1E6DB5", colors.background] as const,
  cardWarm: [colors.surface, colors.warmSurface] as const,
} as const;

export const shadows = {
  card: {
    shadowColor: "#4D3820",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardStrong: {
    shadowColor: "#0C5FA8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  button: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
