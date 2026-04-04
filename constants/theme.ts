export const colors = {
  // Fondos
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceLight: '#252525',

  // Marca
  primary: '#FF4D00',
  primaryFaded: 'rgba(255, 77, 0, 0.15)',

  // Textos
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',

  // Bordes
  border: '#2A2A2A',

  // Estado
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

// 📏 RESPIRACIÓN Y ESPACIADOS
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32, // Para separar secciones grandes
  xxl: 48, // Para vacíos intencionales o padding de pantallas
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// ✍️ TIPOGRAFÍA (Estricta a 6 tamaños Apple-like)
export const typography = {
  h1: { fontSize: 30, fontWeight: '900' as const, color: colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '800' as const, color: colors.textPrimary },
  label: { fontSize: 17, fontWeight: '700' as const, color: colors.textPrimary }, // Para botones y títulos de tarjetas
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.textSecondary }, // Para descripciones largas
  small: { fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary }, // Para subtítulos
  caption: { fontSize: 11, fontWeight: '800' as const, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 1 }, // Para tags o labels pequeños
};

// 🔘 SISTEMA DE BOTONES (CTAs) - 3 Únicas Variantes
export const buttons = {
  // 1. Primary (Acción principal, Naranja)
  primary: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    paddingHorizontal: spacing.xl,
  },
  primaryText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
  
  // 2. Secondary (Acción secundaria, Fondo oscuro con borde)
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    paddingHorizontal: spacing.xl,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700' as const,
  },

  // 3. Ghost (Solo texto, para cancelar o acciones sutiles)
  ghost: {
    backgroundColor: 'transparent',
    height: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
  },
  ghostText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  }
};