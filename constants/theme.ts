export const colors = {
  // Fondos
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceLight: '#252525',

  // Marca
  primary: '#FF4D00',
  primaryFaded: '#FF4D0022',

  // Textos
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#555555',

  // Bordes
  border: '#333333',

  // Estado
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: 'bold' as const, color: colors.textPrimary },
  h2: { fontSize: 22, fontWeight: 'bold' as const, color: colors.textPrimary },
  h3: { fontSize: 18, fontWeight: 'bold' as const, color: colors.textPrimary },
  body: { fontSize: 14, color: colors.textSecondary },
  caption: { fontSize: 12, color: colors.textMuted },
};