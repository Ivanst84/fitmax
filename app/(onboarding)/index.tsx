import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Dimensions
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Paso 1 — Objetivo
const OBJETIVOS = [
  { id: 1, icon: 'trending-down', label: 'Perder peso', desc: 'Quemar grasa y definir' },
  { id: 2, icon: 'barbell',       label: 'Ganar músculo', desc: 'Aumentar masa muscular' },
  { id: 3, icon: 'body',          label: 'Tonificar',    desc: 'Definir y fortalecer' },
  { id: 4, icon: 'heart',         label: 'Mantenerme',   desc: 'Conservar mi estado actual' },
];

// Paso 2 — Nivel
const NIVELES = [
  { id: 1, icon: 'star-outline',  label: 'Principiante', desc: 'Menos de 6 meses entrenando' },
  { id: 2, icon: 'star-half',     label: 'Intermedio',   desc: '6 meses a 2 años' },
  { id: 3, icon: 'star',          label: 'Avanzado',     desc: 'Más de 2 años' },
];

// Paso 3 — Días por semana
const DIAS = [
  { id: 2, label: '2', desc: 'días/semana' },
  { id: 3, label: '3', desc: 'días/semana' },
  { id: 4, label: '4', desc: 'días/semana' },
  { id: 5, label: '5', desc: 'días/semana' },
];

// Paso 4 — Género (para filtrar ejercicios en el futuro)
const GENEROS = [
  { id: 1, icon: 'female', label: 'Mujer' },
  { id: 2, icon: 'male',   label: 'Hombre' },
  { id: 3, icon: 'person', label: 'Prefiero no decir' },
];

const TOTAL_PASOS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [objetivo, setObjetivo] = useState<number | null>(null);
  const [nivel, setNivel]     = useState<number | null>(null);
  const [dias, setDias]       = useState<number | null>(null);
  const [genero, setGenero]   = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const puedeAvanzar = () => {
    if (paso === 1) return objetivo !== null;
    if (paso === 2) return nivel !== null;
    if (paso === 3) return dias !== null;
    if (paso === 4) return genero !== null;
    return false;
  };

  const avanzar = async () => {
    if (paso < TOTAL_PASOS) {
      setPaso(p => p + 1);
      return;
    }
    // Último paso — guardar
    await guardarPerfil();
  };

  const guardarPerfil = async () => {
    try {
      setGuardando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sin sesión');

      // Guardar en tabla USUARIOS
      const { error } = await supabase
        .from('USUARIOS')
        .upsert({
          id: user.id,
          email: user.email,
          nombre: user.user_metadata?.full_name?.split(' ')[0] || 'Usuario',
          apellido_p: user.user_metadata?.full_name?.split(' ')[1] || '',
          foto_url: user.user_metadata?.avatar_url || null,
          objetivo: objetivo,
          nivel: nivel,
          genero: genero,
          fecha_registro: new Date().toISOString(),
        });

      if (error) throw error;

      // Marcar onboarding como completado
      await AsyncStorage.setItem(`onboarding_${user.id}`, 'done');

      router.replace('/(tabs)/home');
    } catch (e: any) {
      console.error('Error guardando perfil:', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const titulos = [
    '¿Cuál es tu objetivo?',
    '¿Cuál es tu nivel?',
    '¿Cuántos días por semana?',
    '¿Cómo te identificas?',
  ];

  const subtitulos = [
    'Personalizamos tu rutina según tu meta',
    'Ajustamos la intensidad para ti',
    'Diseñamos tu programa semanal',
    'Para mostrarte el contenido más relevante',
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Barra de progreso */}
      <View style={s.progressBar}>
        {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
          <View key={i} style={[s.progressDot, i < paso && s.progressDotActive]} />
        ))}
      </View>

      {/* Paso y título */}
      <View style={s.headerArea}>
        <Text style={s.stepLabel}>PASO {paso} DE {TOTAL_PASOS}</Text>
        <Text style={s.titulo}>{titulos[paso - 1]}</Text>
        <Text style={s.subtitulo}>{subtitulos[paso - 1]}</Text>
      </View>

      {/* Opciones */}
      <ScrollView
        style={s.opcionesScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.opcionesContent}
      >
        {paso === 1 && OBJETIVOS.map(op => (
          <TouchableOpacity
            key={op.id}
            style={[s.opcion, objetivo === op.id && s.opcionActiva]}
            onPress={() => setObjetivo(op.id)}
            activeOpacity={0.8}
          >
            <View style={[s.opcionIcon, objetivo === op.id && s.opcionIconActivo]}>
              <Ionicons
                name={op.icon as any}
                size={24}
                color={objetivo === op.id ? '#fff' : colors.primary}
              />
            </View>
            <View style={s.opcionTexto}>
              <Text style={[s.opcionLabel, objetivo === op.id && s.opcionLabelActivo]}>
                {op.label}
              </Text>
              <Text style={s.opcionDesc}>{op.desc}</Text>
            </View>
            {objetivo === op.id && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        {paso === 2 && NIVELES.map(op => (
          <TouchableOpacity
            key={op.id}
            style={[s.opcion, nivel === op.id && s.opcionActiva]}
            onPress={() => setNivel(op.id)}
            activeOpacity={0.8}
          >
            <View style={[s.opcionIcon, nivel === op.id && s.opcionIconActivo]}>
              <Ionicons
                name={op.icon as any}
                size={24}
                color={nivel === op.id ? '#fff' : colors.primary}
              />
            </View>
            <View style={s.opcionTexto}>
              <Text style={[s.opcionLabel, nivel === op.id && s.opcionLabelActivo]}>
                {op.label}
              </Text>
              <Text style={s.opcionDesc}>{op.desc}</Text>
            </View>
            {nivel === op.id && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        {paso === 3 && (
          <View style={s.diasGrid}>
            {DIAS.map(op => (
              <TouchableOpacity
                key={op.id}
                style={[s.diaCard, dias === op.id && s.diaCardActivo]}
                onPress={() => setDias(op.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.diaNum, dias === op.id && s.diaNumActivo]}>
                  {op.label}
                </Text>
                <Text style={[s.diaDesc, dias === op.id && s.diaDescActivo]}>
                  {op.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {paso === 4 && GENEROS.map(op => (
          <TouchableOpacity
            key={op.id}
            style={[s.opcion, genero === op.id && s.opcionActiva]}
            onPress={() => setGenero(op.id)}
            activeOpacity={0.8}
          >
            <View style={[s.opcionIcon, genero === op.id && s.opcionIconActivo]}>
              <Ionicons
                name={op.icon as any}
                size={24}
                color={genero === op.id ? '#fff' : colors.primary}
              />
            </View>
            <View style={s.opcionTexto}>
              <Text style={[s.opcionLabel, genero === op.id && s.opcionLabelActivo]}>
                {op.label}
              </Text>
            </View>
            {genero === op.id && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Botones */}
      <View style={s.footer}>
        {paso > 1 && (
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => setPaso(p => p - 1)}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.nextBtn, !puedeAvanzar() && s.nextBtnDisabled]}
          onPress={avanzar}
          disabled={!puedeAvanzar() || guardando}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnText}>
            {guardando
              ? 'Guardando...'
              : paso < TOTAL_PASOS
                ? 'Siguiente'
                : '¡Empezar!'}
          </Text>
          {!guardando && (
            <Ionicons
              name={paso < TOTAL_PASOS ? 'arrow-forward' : 'rocket'}
              size={18}
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: 40,
  },
  progressBar: { flexDirection: 'row', gap: 6, marginBottom: spacing.xl },
  progressDot: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: colors.surface,
  },
  progressDotActive: { backgroundColor: colors.primary },

  headerArea: { marginBottom: spacing.xl },
  stepLabel: {
    fontSize: 11, color: colors.primary, fontWeight: '900',
    letterSpacing: 2, marginBottom: 8,
  },
  titulo: {
    fontSize: 30, fontWeight: '900', color: colors.textPrimary,
    marginBottom: 8, lineHeight: 34,
  },
  subtitulo: { fontSize: 15, color: colors.textSecondary },

  opcionesScroll: { flex: 1 },
  opcionesContent: { gap: 10, paddingBottom: 20 },

  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1.5, borderColor: 'transparent',
  },
  opcionActiva: { borderColor: colors.primary, backgroundColor: colors.primaryFaded },
  opcionIcon: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  opcionIconActivo: { backgroundColor: colors.primary },
  opcionTexto: { flex: 1 },
  opcionLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  opcionLabelActivo: { color: colors.textPrimary },
  opcionDesc: { fontSize: 13, color: colors.textSecondary },

  diasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  diaCard: {
    width: (width - spacing.lg * 2 - 12) / 2,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  diaCardActivo: { borderColor: colors.primary, backgroundColor: colors.primaryFaded },
  diaNum: { fontSize: 48, fontWeight: '900', color: colors.textSecondary },
  diaNumActivo: { color: colors.primary },
  diaDesc: { fontSize: 13, color: colors.textMuted },
  diaDescActivo: { color: colors.primary },

  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  backBtn: {
    width: 52, height: 52, borderRadius: radius.full,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  nextBtn: {
    flex: 1, height: 52, borderRadius: radius.full,
    backgroundColor: colors.primary,
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8,
  },
  nextBtnDisabled: { backgroundColor: colors.surface },
  nextBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});