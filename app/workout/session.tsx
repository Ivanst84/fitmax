// Ruta: app/workout/session.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, StatusBar, ActivityIndicator, StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics'; // 🚀 IMPORTACIÓN NUEVA

import { colors, spacing, radius } from '../../constants/theme';
import { useRoutineDetail } from '../../hooks/useRoutineDetail';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';

export default function WorkoutSessionScreen() {
  const { rutinaId } = useLocalSearchParams<{ rutinaId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { rutina, ejercicios, cargando } = useRoutineDetail(rutinaId as string);
  const {
    currentExercise,
    currentExerciseIndex,
    completedSets,
    completeNextSet,
    skipRest,
    allSetsDone,
    totalExercises,
    restSeconds,
    isResting,
    goToNextExercise,
    goToPrevExercise,
    finishAndSaveWorkout,
    isSaving,
  } = useWorkoutSession(ejercicios);

  // 🚀 ARQUITECTURA SENIOR: Cronómetro a prueba de Background
  const startTimeRef = useRef(Date.now());
  const [totalSeconds, setTotalSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      // Calculamos el tiempo real basándonos en el reloj del sistema, no en los ciclos de React
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const setElapsedSeconds = (seconds: number) => {
    setTotalSeconds(seconds);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 🚀 Toque Premium: Vibración al completar serie
  const handleCompleteSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (currentExercise) {
      completeNextSet(currentExercise.id);
    }
  };

  const handleFinish = () => {
    Alert.alert(
      '¡Misión Cumplida!',
      '¿Deseas finalizar y guardar este entrenamiento?',
      [
        { text: 'Seguir entrenando', style: 'cancel' },
        {
          text: 'Terminar y Guardar',
          onPress: async () => {
            const ok = await finishAndSaveWorkout(
              rutinaId as string,
              rutina?.nombre || 'Rutina',
              totalSeconds
            );
            if (ok) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace('/(tabs)/history'); // O donde sea tu historial
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    Alert.alert(
      'Salir del entrenamiento',
      'Tu progreso no se guardará si sales ahora.',
      [
        { text: 'Continuar entrenando', style: 'cancel' },
        { 
          text: 'Salir', 
          style: 'destructive', 
          onPress: () => router.back() 
        },
      ]
    );
  };

  if (cargando || !currentExercise) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const setsDelEjercicio = completedSets[currentExercise.id] || [];
  const seriesHechas = setsDelEjercicio.filter(Boolean).length;
  const totalSeries = setsDelEjercicio.length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#111111', 'transparent']}
        style={[s.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity style={s.closeBtn} onPress={handleClose} disabled={isSaving}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={s.timerBox}>
          <Text style={s.timerLabel}>SESIÓN ACTIVA</Text>
          <Text style={s.timerValue}>{formatTime(totalSeconds)}</Text>
        </View>

        <TouchableOpacity style={s.finishBtn} onPress={handleFinish} disabled={isSaving}>
          <Text style={s.finishBtnText}>FIN</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: insets.bottom + 160 }
        ]}
      >
        {/* ── BARRA DE PROGRESO ── */}
        <View style={s.progressRow}>
          {ejercicios.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i < currentExerciseIndex && s.dotDone,
                i === currentExerciseIndex && s.dotActive,
              ]}
            />
          ))}
        </View>
        <Text style={s.progressLabel}>
          Ejercicio {currentExerciseIndex + 1} de {totalExercises}
        </Text>

        {/* ── NOMBRE DEL EJERCICIO ── */}
        <View style={s.exerciseHeader}>
          <Text style={s.exerciseSub}>AHORA</Text>
          <Text style={s.exerciseName}>{currentExercise.ejercicio.nombre}</Text>
          <Text style={s.exerciseMeta}>
            {totalSeries} series · {currentExercise.repeticiones} reps · {currentExercise.descanso_seg || 60}s descanso
          </Text>
        </View>

        {/* ── CÍRCULOS DE SERIES ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>SERIES</Text>
          <View style={s.circlesRow}>
            {setsDelEjercicio.map((done, i) => (
              <View key={i} style={[s.circle, done && s.circleDone]}>
                <Text style={[s.circleText, done && s.circleTextDone]}>
                  {done ? '✓' : i + 1}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.seriesStatus}>
            {seriesHechas < totalSeries
              ? `Serie ${seriesHechas + 1} de ${totalSeries}`
              : '¡Todas las series completadas!'}
          </Text>
        </View>

        {/* ── ZONA DE ACCIÓN PRINCIPAL ── */}
        {isResting ? (
          /* DESCANSANDO */
          <View style={s.restCard}>
            <Text style={s.restTitle}>DESCANSA</Text>
            <Text style={s.restTimer}>{restSeconds}s</Text>
            <View style={s.restBarTrack}>
              <View
                style={[
                  s.restBarFill,
                  {
                    width: `${(restSeconds / (currentExercise.descanso_seg || 60)) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={s.restSub}>
              {seriesHechas < totalSeries
                ? `Prepárate para la serie ${seriesHechas + 1}`
                : 'Listo para el siguiente ejercicio'}
            </Text>
            <TouchableOpacity 
              style={s.skipBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                skipRest();
              }}
            >
              <Text style={s.skipText}>Saltar descanso →</Text>
            </TouchableOpacity>
          </View>
        ) : allSetsDone ? (
          /* TODAS LAS SERIES HECHAS → SIGUIENTE */
          <View style={s.nextCard}>
            <Text style={s.nextCardTitle}>
              {currentExerciseIndex < totalExercises - 1
                ? '¡Ejercicio completado!'
                : '¡Último ejercicio! 🏆'}
            </Text>
            <TouchableOpacity
              style={s.nextBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                currentExerciseIndex < totalExercises - 1 ? goToNextExercise() : handleFinish();
              }}
            >
              <Text style={s.nextBtnText}>
                {currentExerciseIndex < totalExercises - 1
                  ? 'Siguiente ejercicio →'
                  : 'Terminar y guardar 🏆'}
              </Text>
            </TouchableOpacity>
            {currentExerciseIndex > 0 && (
              <TouchableOpacity style={s.prevLink} onPress={goToPrevExercise}>
                <Text style={s.prevLinkText}>← Ejercicio anterior</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* HACIENDO SERIES → BOTÓN PRINCIPAL */
          <View style={s.actionCard}>
            <Text style={s.actionHint}>
              Cuando termines la serie, toca el botón
            </Text>
            <TouchableOpacity
              style={s.completeBtn}
              onPress={handleCompleteSet} // 🚀 Usamos la función con vibración
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={28} color="#fff" />
              <Text style={s.completeBtnText}>
                Serie {seriesHechas + 1} completada
              </Text>
            </TouchableOpacity>
            {currentExerciseIndex > 0 && (
              <TouchableOpacity style={s.prevLink} onPress={goToPrevExercise}>
                <Text style={s.prevLinkText}>← Ejercicio anterior</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── LISTA DE EJERCICIOS RESTANTES ── */}
        {currentExerciseIndex < totalExercises - 1 && (
          <View style={s.upNextCard}>
            <Text style={s.upNextLabel}>DESPUÉS</Text>
            {ejercicios.slice(currentExerciseIndex + 1).map((ej, i) => (
              <View key={ej.id} style={s.upNextRow}>
                <View style={s.upNextNum}>
                  <Text style={s.upNextNumText}>{currentExerciseIndex + i + 2}</Text>
                </View>
                <Text style={s.upNextName}>{ej.ejercicio.nombre}</Text>
                <Text style={s.upNextMeta}>{ej.series}×{ej.repeticiones}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── OVERLAY GUARDANDO ── */}
      {isSaving && (
        <View style={s.savingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.savingText}>GUARDANDO SESIÓN...</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  timerBox: { alignItems: 'center' },
  timerLabel: { color: '#636366', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  timerValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  finishBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: radius.md,
  },
  finishBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },

  // Scroll
  scroll: { paddingHorizontal: spacing.lg },

  // Progreso
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  dot: { height: 4, flex: 1, borderRadius: 2, backgroundColor: '#1c1c1e' },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: '#fff' },
  progressLabel: { fontSize: 12, color: '#636366', marginBottom: spacing.lg },

  // Ejercicio
  exerciseHeader: { marginBottom: spacing.lg },
  exerciseSub: {
    color: colors.primary, fontWeight: '900', fontSize: 11,
    letterSpacing: 2, marginBottom: 4,
  },
  exerciseName: {
    color: '#fff', fontSize: 36, fontWeight: '900',
    fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 38,
    marginBottom: 6,
  },
  exerciseMeta: { color: '#636366', fontSize: 13 },

  // Círculos
  card: {
    backgroundColor: '#1c1c1e', borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    alignItems: 'center',
  },
  cardLabel: {
    color: '#636366', fontSize: 10, fontWeight: '900',
    letterSpacing: 2, marginBottom: spacing.md,
  },
  circlesRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  circle: {
    width: 60, height: 60, borderRadius: radius.full,
    borderWidth: 2, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },
  circleDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  circleText: { fontSize: 20, fontWeight: '900', color: '#636366' },
  circleTextDone: { color: '#fff' },
  seriesStatus: { fontSize: 13, color: '#636366' },

  // Descanso
  restCard: {
    backgroundColor: '#1c1c1e', borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center',
  },
  restTitle: {
    color: colors.primary, fontSize: 11, fontWeight: '900',
    letterSpacing: 2, marginBottom: 8,
  },
  restTimer: {
    color: '#fff', fontSize: 72, fontWeight: '900', lineHeight: 80,
  },
  restBarTrack: {
    width: '100%', height: 4, backgroundColor: '#333',
    borderRadius: 2, marginBottom: spacing.sm, overflow: 'hidden',
  },
  restBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  restSub: { color: '#636366', fontSize: 13, marginBottom: spacing.md },
  skipBtn: {
    borderWidth: 1, borderColor: '#333', borderRadius: radius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  skipText: { color: '#636666', fontSize: 13 },

  // Siguiente ejercicio
  nextCard: {
    backgroundColor: '#1c1c1e', borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center',
  },
  nextCardTitle: {
    color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: spacing.md,
  },
  nextBtn: {
    backgroundColor: colors.success, borderRadius: radius.full,
    paddingHorizontal: 32, paddingVertical: spacing.md,
    width: '100%', alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  // Botón completar serie
  actionCard: {
    backgroundColor: '#1c1c1e', borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center',
  },
  actionHint: { color: '#636366', fontSize: 13, marginBottom: spacing.md },
  completeBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: spacing.md, width: '100%',
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8,
  },
  completeBtnText: { color: '#000', fontWeight: '900', fontSize: 18 }, // Mantuve el texto oscuro para mejor contraste con el naranja

  // Link anterior
  prevLink: { marginTop: spacing.md },
  prevLinkText: { color: '#636366', fontSize: 13 },

  // Lista de siguientes
  upNextCard: {
    backgroundColor: '#1c1c1e', borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  upNextLabel: {
    color: '#636366', fontSize: 10, fontWeight: '900',
    letterSpacing: 2, marginBottom: spacing.sm,
  },
  upNextRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#2c2c2e',
  },
  upNextNum: {
    width: 28, height: 28, borderRadius: radius.full,
    backgroundColor: '#2c2c2e', justifyContent: 'center',
    alignItems: 'center', marginRight: spacing.sm,
  },
  upNextNumText: { color: '#636366', fontSize: 12, fontWeight: '700' },
  upNextName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  upNextMeta: { color: '#636366', fontSize: 12 },

  // Overlay guardando
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  savingText: {
    color: colors.primary, marginTop: 16,
    fontWeight: '900', fontSize: 14, letterSpacing: 2,
  },
});