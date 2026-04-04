// app/(onboarding)/index.tsx — Versión 2.0
// Flujo de 10 pasos con inputs de peso/estatura + integración useGeminiRoutine

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, StatusBar, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useGeminiRoutine } from '../../hooks/useGeminiRoutine';

// ─── Definición de los 10 pasos ───────────────────────────────────────────────

const PASOS_SELECCION = [
  {
    id: 'genero',
    titulo: '¿Cuál es tu género?',
    subtitulo: 'Ajustamos tu metabolismo basal y patrones de recuperación.',
    opciones: [
      { id: 'hombre', label: 'Hombre', desc: 'Prioridad en tren superior e inferior', icon: 'man-outline' },
      { id: 'mujer', label: 'Mujer', desc: 'Mayor énfasis en glúteos y recuperación', icon: 'woman-outline' },
      { id: 'otro', label: 'Prefiero no decirlo', desc: 'Plan neutral y balanceado', icon: 'person-outline' },
    ],
  },
  {
    id: 'edad',
    titulo: '¿Cuántos años tienes?',
    subtitulo: 'Calibramos recuperación, intensidad y carga articular.',
    opciones: [
      { id: '18_25', label: '18–25 años', desc: 'Recuperación máxima, alta tolerancia', icon: 'battery-full-outline' },
      { id: '26_35', label: '26–35 años', desc: 'Metabolismo activo, pico de fuerza', icon: 'battery-half-outline' },
      { id: '36_45', label: '36–45 años', desc: 'Fuerza + movilidad activa', icon: 'shield-checkmark-outline' },
      { id: '46_mas', label: '46+ años', desc: 'Longevidad y cuidado articular', icon: 'heart-outline' },
    ],
  },
  {
    id: 'nivel',
    titulo: '¿Cuál es tu nivel actual?',
    subtitulo: 'Adaptamos complejidad técnica y volumen de carga.',
    opciones: [
      { id: 'principiante', label: 'Principiante', desc: 'Menos de 6 meses entrenando', icon: 'leaf-outline' },
      { id: 'intermedio', label: 'Intermedio', desc: '6 meses a 2 años constantes', icon: 'barbell-outline' },
      { id: 'avanzado', label: 'Avanzado', desc: 'Más de 2 años, técnica sólida', icon: 'skull-outline' },
    ],
  },
  {
    id: 'objetivo',
    titulo: '¿Cuál es tu meta principal?',
    subtitulo: 'Define rangos de rep, volumen y sistemas energéticos.',
    opciones: [
      { id: 'perder_peso', label: 'Perder Grasa', desc: 'Cardio integrado, rep alto', icon: 'flame-outline' },
      { id: 'hipertrofia', label: 'Ganar Músculo', desc: '8–12 reps, volumen alto', icon: 'trending-up-outline' },
      { id: 'fuerza', label: 'Fuerza Pura', desc: '3–6 reps, carga máxima', icon: 'fitness-outline' },
    ],
  },
  {
    id: 'enfoque',
    titulo: '¿Qué zona quieres priorizar?',
    subtitulo: 'Le daremos volumen extra a esta área del cuerpo.',
    opciones: [
      { id: 'fullbody', label: 'Cuerpo Completo', desc: 'Desarrollo armónico general', icon: 'body-outline' },
      { id: 'superior', label: 'Tren Superior', desc: 'Pecho, espalda, hombros y brazos', icon: 'shirt-outline' },
      { id: 'inferior', label: 'Tren Inferior', desc: 'Piernas y glúteos de acero', icon: 'walk-outline' },
    ],
  },
  {
    id: 'frecuencia',
    titulo: '¿Cuántos días por semana?',
    subtitulo: 'Construimos tu split semanal perfecto.',
    opciones: [
      { id: 2, label: '2 días', desc: 'Fullbody intenso', icon: 'calendar-clear-outline' },
      { id: 3, label: '3 días', desc: 'Ideal para la mayoría', icon: 'calendar-outline' },
      { id: 4, label: '4 días', desc: 'Split Upper/Lower', icon: 'calendar-number-outline' },
      { id: 5, label: '5 días', desc: 'Alta frecuencia (PPL)', icon: 'flash-outline' },
    ],
  },
  {
    id: 'duracion',
    titulo: '¿Cuánto tiempo por sesión?',
    subtitulo: 'Ajustamos número de ejercicios y series al tiempo real.',
    opciones: [
      { id: 30, label: '30 Minutos', desc: 'Intenso, sin descansos largos', icon: 'timer-outline' },
      { id: 45, label: '45 Minutos', desc: 'Equilibrio perfecto (recomendado)', icon: 'hourglass-outline' },
      { id: 60, label: '60+ Minutos', desc: 'Entrenamiento completo y pesado', icon: 'stopwatch-outline' },
    ],
  },
  {
    id: 'equipo',
    titulo: '¿Dónde vas a entrenar?',
    subtitulo: 'Solo usamos ejercicios disponibles para tu contexto.',
    opciones: [
      { id: 'casa', label: 'En Casa', desc: 'Peso corporal y artículos del hogar', icon: 'home-outline' },
      { id: 'mancuernas', label: 'Mancuernas', desc: 'Casa equipada o gym básico', icon: 'disc-outline' },
      { id: 'gym', label: 'Gym Completo', desc: 'Máquinas, racks y barras', icon: 'business-outline' },
    ],
  },
];

// Los 2 pasos de inputs numéricos (peso y estatura)
const PASO_PESO     = { id: 'peso',     titulo: '¿Cuánto pesas?',  subtitulo: 'Calculamos tu IMC para adaptar el impacto articular.' };
const PASO_ESTATURA = { id: 'estatura', titulo: '¿Cuánto mides?', subtitulo: 'Optimizamos la longitud de palancas en ejercicios compuestos.' };

// Orden final: 0-2 selección, luego peso, estatura, luego 3-7 selección
const ORDEN_PASOS = [
  ...PASOS_SELECCION.slice(0, 2),  // género, edad
  PASO_PESO,
  PASO_ESTATURA,
  ...PASOS_SELECCION.slice(2),     // nivel, objetivo, enfoque, frecuencia, duración, equipo
];

const TOTAL_PASOS = ORDEN_PASOS.length; // 10

// ─── Mensajes de carga rotativos ──────────────────────────────────────────────

const MENSAJES_CARGA = [
  'Analizando tu perfil biométrico...',
  'Calculando IMC y recuperación muscular...',
  'Seleccionando ejercicios para tu nivel...',
  'Construyendo tu split semanal...',
  'Ajustando series y descansos al objetivo...',
  'Revisando seguridad articular...',
  'Finalizando tu ADN Fitness...',
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OnboardingAIScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { generateRoutine } = useGeminiRoutine();

  const [pasoActual, setPasoActual] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [generando, setGenerando] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Estados para los inputs numéricos
  const [pesoInput, setPesoInput] = useState('75');
  const [pesoUnidad, setPesoUnidad] = useState<'kg' | 'lbs'>('kg');
  const [estaturaInputCm, setEstaturaInputCm] = useState('170');
  const [estaturaInputFt, setEstaturaInputFt] = useState('5');
  const [estaturaInputIn, setEstaturaInputIn] = useState('7');
  const [estaturaUnidad, setEstaturaUnidad] = useState<'cm' | 'ft'>('cm');

  const infoPaso = ORDEN_PASOS[pasoActual];
  const progreso = ((pasoActual + 1) / TOTAL_PASOS) * 100;

  // Rotación de mensajes durante la carga
  useEffect(() => {
    if (!generando) return;
    const t = setInterval(
      () => setMensajeCarga(p => (p + 1) % MENSAJES_CARGA.length),
      1800
    );
    return () => clearInterval(t);
  }, [generando]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const avanzar = (valor?: any) => {
    const nuevasRespuestas = valor !== undefined
      ? { ...respuestas, [infoPaso.id]: valor }
      : respuestas;

    setRespuestas(nuevasRespuestas);

    setTimeout(() => {
      if (pasoActual < TOTAL_PASOS - 1) {
        setPasoActual(p => p + 1);
      } else {
        finalizarOnboarding(nuevasRespuestas);
      }
    }, 200);
  };

  const handleSeleccion = (optionId: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    avanzar(optionId);
  };

  const handlePeso = () => {
    const valor = parseFloat(pesoInput);
    if (isNaN(valor) || valor < 30 || valor > 300) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pesoKg = pesoUnidad === 'lbs' ? Math.round(valor * 0.453592) : Math.round(valor);
    avanzar(pesoKg); // guardamos directo como número en respuestas.peso / peso_kg
  };

  const handleEstatura = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let altCm: number;
    if (estaturaUnidad === 'cm') {
      altCm = Math.round(parseFloat(estaturaInputCm));
    } else {
      altCm = Math.round(
        (parseFloat(estaturaInputFt) || 0) * 30.48 +
        (parseFloat(estaturaInputIn) || 0) * 2.54
      );
    }
    if (isNaN(altCm) || altCm < 100 || altCm > 250) return;
    avanzar(altCm);
  };

  const volverAtras = () => {
    if (pasoActual === 0) { router.back(); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPasoActual(p => p - 1);
  };

  // ── Finalización ────────────────────────────────────────────────────────────

  const finalizarOnboarding = async (todasLasRespuestas: Record<string, any>) => {
    setGenerando(true);
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión expirada, vuelve a iniciar sesión');

      // --- NUEVO: DESCARGAR EL CATÁLOGO PRIMERO ---
      const { data: catalogoDB, error: errorCat } = await supabase
        .from('EJERCICIOS')
        .select('id, nombre');

      if (errorCat || !catalogoDB) throw new Error('No pudimos leer tus ejercicios de la base de datos');
      // --------------------------------------------

      const perfil = {
        genero: todasLasRespuestas.genero,
        edad: todasLasRespuestas.edad,
        peso_kg: todasLasRespuestas.peso,
        altura_cm: todasLasRespuestas.estatura,
        nivel: todasLasRespuestas.nivel,
        objetivo: todasLasRespuestas.objetivo,
        enfoque: todasLasRespuestas.enfoque,
        frecuencia: todasLasRespuestas.frecuencia,
        duracion: todasLasRespuestas.duracion,
        equipo: todasLasRespuestas.equipo,
      };

      // 🔥 AHORA SÍ LE PASAMOS LOS DOS ARGUMENTOS
      const planFinal = await generateRoutine(perfil, catalogoDB);

      // --- AQUÍ DEBES INSERTAR EL CÓDIGO DE GUARDADO EN TABLAS (RUTINAS, RUTINA_EJERCICIOS) ---
      // Si no guardas planFinal en Supabase aquí, la IA trabajará pero no verás nada en la BD.

      await AsyncStorage.setItem(`onboarding_${user.id}`, 'done');
      router.replace('/(tabs)/home');

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      console.error('Onboarding error:', msg);
      setError(msg);
      setGenerando(false);
    }
  };
  // ─── Pantalla de carga ──────────────────────────────────────────────────────

  if (generando) {
    return (
      <View style={s.loaderContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#000000', '#0F0F0F']} style={StyleSheet.absoluteFill} />

        {/* Logo */}
        <View style={s.loaderLogo}>
          <Text style={s.loaderLogoText}>F</Text>
        </View>

        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginBottom: 28 }}
        />

        <Text style={s.loaderTitle}>CREANDO TU PLAN</Text>
        <Text style={s.loaderSub}>{MENSAJES_CARGA[mensajeCarga]}</Text>

        {/* Barra de progreso animada visual */}
        <View style={s.loaderBar}>
          <View style={[s.loaderBarFill, { width: `${((mensajeCarga + 1) / MENSAJES_CARGA.length) * 100}%` }]} />
        </View>

        <Text style={s.loaderDisclaimer}>
          estamos seleccionando los mejores ejercicios{'\n'}para tu perfil exacto. Puede tardar 10-15 segundos.
        </Text>
      </View>
    );
  }

  // ─── Pantalla de error ──────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={s.loaderContainer}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[s.loaderTitle, { color: colors.error, marginTop: 16 }]}>Algo salió mal</Text>
        <Text style={[s.loaderSub, { textAlign: 'center', marginTop: 8 }]}>{error}</Text>
        <TouchableOpacity
          style={[s.continueBtn, { marginTop: 32 }]}
          onPress={() => {
            setError(null);
            finalizarOnboarding(respuestas);
          }}
        >
          <Text style={s.continueBtnText}>Intentar de nuevo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render del paso actual ──────────────────────────────────────────────────

  const esPesoPaso     = infoPaso.id === 'peso';
  const esEstaturaPaso = infoPaso.id === 'estatura';
  const esInputNumerico = esPesoPaso || esEstaturaPaso;

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Header con barra de progreso */}
      <View style={s.header}>
        <TouchableOpacity onPress={volverAtras} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progreso}%` }]} />
        </View>
        <Text style={s.stepCounter}>{pasoActual + 1}/{TOTAL_PASOS}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Título del paso */}
        <View style={s.titleArea}>
          <Text style={s.titulo}>{infoPaso.titulo}</Text>
          <Text style={s.subtitulo}>{(infoPaso as any).subtitulo}</Text>
        </View>

        {/* Paso de PESO */}
        {esPesoPaso && (
          <View style={s.inputArea}>
            <View style={s.unitToggle}>
              {(['kg', 'lbs'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  style={[s.unitBtn, pesoUnidad === u && s.unitBtnActive]}
                  onPress={() => { setPesoUnidad(u); Haptics.selectionAsync(); }}
                >
                  <Text style={[s.unitBtnText, pesoUnidad === u && s.unitBtnTextActive]}>
                    {u.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.numericRow}>
              <TextInput
                style={s.bigNumInput}
                keyboardType="decimal-pad"
                value={pesoInput}
                onChangeText={setPesoInput}
                maxLength={5}
                autoFocus
                selectTextOnFocus
              />
              <Text style={s.numericUnit}>{pesoUnidad}</Text>
            </View>
            <TouchableOpacity style={s.continueBtn} onPress={handlePeso}>
              <Text style={s.continueBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* Paso de ESTATURA */}
        {esEstaturaPaso && (
          <View style={s.inputArea}>
            <View style={s.unitToggle}>
              {(['cm', 'ft'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  style={[s.unitBtn, estaturaUnidad === u && s.unitBtnActive]}
                  onPress={() => { setEstaturaUnidad(u); Haptics.selectionAsync(); }}
                >
                  <Text style={[s.unitBtnText, estaturaUnidad === u && s.unitBtnTextActive]}>
                    {u === 'ft' ? 'FT / IN' : 'CM'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {estaturaUnidad === 'cm' ? (
              <View style={s.numericRow}>
                <TextInput
                  style={s.bigNumInput}
                  keyboardType="number-pad"
                  value={estaturaInputCm}
                  onChangeText={setEstaturaInputCm}
                  maxLength={3}
                  autoFocus
                  selectTextOnFocus
                />
                <Text style={s.numericUnit}>cm</Text>
              </View>
            ) : (
              <View style={s.numericRow}>
                <TextInput
                  style={[s.bigNumInput, { width: 80 }]}
                  keyboardType="number-pad"
                  value={estaturaInputFt}
                  onChangeText={setEstaturaInputFt}
                  maxLength={1}
                  autoFocus
                  selectTextOnFocus
                />
                <Text style={[s.numericUnit, { marginRight: 12 }]}>ft</Text>
                <TextInput
                  style={[s.bigNumInput, { width: 80 }]}
                  keyboardType="number-pad"
                  value={estaturaInputIn}
                  onChangeText={setEstaturaInputIn}
                  maxLength={2}
                  selectTextOnFocus
                />
                <Text style={s.numericUnit}>in</Text>
              </View>
            )}

            <TouchableOpacity style={s.continueBtn} onPress={handleEstatura}>
              <Text style={s.continueBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* Pasos de selección múltiple */}
        {!esInputNumerico && (
          <View style={s.optionsList}>
            {(infoPaso as any).opciones?.map((op: any) => {
              const selected = respuestas[infoPaso.id] === op.id;
              return (
                <TouchableOpacity
                  key={op.id}
                  style={[s.card, selected && s.cardSelected]}
                  onPress={() => handleSeleccion(op.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.iconBox, selected && s.iconBoxSelected]}>
                    <Ionicons
                      name={op.icon}
                      size={26}
                      color={selected ? '#000' : colors.primary}
                    />
                  </View>
                  <View style={s.cardText}>
                    <Text style={[s.cardLabel, selected && s.cardLabelSelected]}>
                      {op.label}
                    </Text>
                    <Text style={s.cardDesc}>{op.desc}</Text>
                  </View>
                  <View style={[s.checkCircle, selected && s.checkCircleSelected]}>
                    {selected && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, height: 56, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: radius.full,
    backgroundColor: '#111', justifyContent: 'center', alignItems: 'center',
  },
  progressTrack: {
    flex: 1, height: 5, backgroundColor: '#1A1A1A',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.primary,
    borderRadius: 3,
  },
  stepCounter: {
    fontSize: 12, fontWeight: '700',
    color: colors.textMuted, width: 36, textAlign: 'right',
  },

  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: 60 },

  titleArea: { marginBottom: spacing.xl },
  titulo: { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 8, lineHeight: 36 },
  subtitulo: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },

  // Opciones de selección
  optionsList: { gap: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0C0C0C', padding: 18,
    borderRadius: radius.lg, borderWidth: 1, borderColor: '#1E1E1E',
  },
  cardSelected: {
    borderColor: colors.primary, borderWidth: 1.5,
    backgroundColor: 'rgba(255,77,0,0.04)',
  },
  iconBox: {
    width: 52, height: 52, borderRadius: radius.md,
    backgroundColor: '#141414', justifyContent: 'center', alignItems: 'center',
    marginRight: 16, borderWidth: 1, borderColor: '#222',
  },
  iconBoxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardLabelSelected: { color: colors.primary },
  cardDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#2A2A2A',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  checkCircleSelected: { backgroundColor: colors.primary, borderColor: colors.primary },

  // Inputs numéricos (peso y estatura)
  inputArea: { alignItems: 'center', paddingTop: spacing.md },
  unitToggle: {
    flexDirection: 'row', backgroundColor: '#111',
    borderRadius: radius.full, padding: 3, marginBottom: 40, gap: 2,
  },
  unitBtn: {
    paddingVertical: 9, paddingHorizontal: 28,
    borderRadius: radius.full,
  },
  unitBtnActive: { backgroundColor: '#2A2A2A' },
  unitBtnText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  unitBtnTextActive: { color: colors.primary },

  numericRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'center', marginBottom: 48, gap: 8,
  },
  bigNumInput: {
    fontSize: 68, fontWeight: '900', color: '#fff',
    borderBottomWidth: 2, borderBottomColor: colors.primary,
    minWidth: 110, textAlign: 'center', paddingBottom: 4,
  },
  numericUnit: {
    fontSize: 22, fontWeight: '700',
    color: colors.textMuted, marginBottom: 12,
  },
  continueBtn: {
    flexDirection: 'row', backgroundColor: colors.primary,
    borderRadius: radius.full, height: 56,
    width: '100%', justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  continueBtnText: { fontSize: 17, fontWeight: '900', color: '#000', letterSpacing: 0.5 },

  // Loader
  loaderContainer: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loaderLogo: {
    width: 72, height: 72, borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32,
  },
  loaderLogoText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  loaderTitle: {
    fontSize: 18, fontWeight: '900', color: '#fff',
    letterSpacing: 2, marginBottom: 12,
  },
  loaderSub: {
    fontSize: 13, color: colors.textMuted,
    textAlign: 'center', marginBottom: 24,
  },
  loaderBar: {
    width: '100%', height: 4,
    backgroundColor: '#1A1A1A', borderRadius: 2,
    overflow: 'hidden', marginBottom: 24,
  },
  loaderBarFill: {
    height: '100%', backgroundColor: colors.primary,
    borderRadius: 2,
  },
  loaderDisclaimer: {
    fontSize: 12, color: '#333',
    textAlign: 'center', lineHeight: 18,
  },
});