import React, { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  View, Text, ScrollView, TextInput,
  Alert, StatusBar, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import PressableCard from '../../components/ui/PressableCard';
import SessionReportCard from '../../components/ui/SessionReportCard';
import GhostTracker from '../../components/ui/GhostTracker'; // 👈 APAGADO TEMPORALMENTE

import { colors, spacing, radius, typography, buttons } from '../../constants/theme';
import { useRoutineDetail } from '../../hooks/useRoutineDetail';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import ExerciseGuideCard from '../../components/ui/ExerciseGuideCard';
import { supabase } from '../../lib/supabase';

type TimerHandle = { getElapsedSeconds: () => number; };
const TimerIsland = forwardRef<TimerHandle, { label?: string }>(({ label = 'SESIÓN ACTIVA' }, ref) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef(Date.now());
  useEffect(() => {
    const interval = setInterval(() => { setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000)); }, 1000);
    return () => clearInterval(interval);
  }, []);
  useImperativeHandle(ref, () => ({ getElapsedSeconds: () => Math.floor((Date.now() - startTimeRef.current) / 1000), }));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  return (
    <View style={s.timerBox}>
      <Text style={s.timerLabel}>{label}</Text>
      <Text style={s.timerValue}>{timeStr}</Text>
    </View>
  );
});

const RestTimerIsland = ({ initialSeconds, onFinish, onSkip }: { initialSeconds: number, onFinish: () => void, onSkip: () => void }) => {
  // 🛡️ Marcamos exactamente en qué milisegundo debe terminar el descanso
  const endTimeRef = useRef(Date.now() + initialSeconds * 1000);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    // Polling cada 500ms para asegurar fluidez y capturar el despertar del background
    const interval = setInterval(() => {
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);

      if (remaining <= 0) {
        clearInterval(interval);
        onFinish(); // Ejecutamos la acción final
        return;
      }
      setSecondsLeft(remaining);
    }, 500); 

    return () => clearInterval(interval);
  }, [onFinish]); // 👈 Escuchamos onFinish para evitar cierres obsoletos (stale closures)

  return (
    <View style={s.restCard}>
      <Text style={s.restTitle}>DESCANSO</Text>
      <Text style={s.restTimer}>{secondsLeft}s</Text>
      <PressableCard style={s.skipBtn} onPress={onSkip}>
        <Text style={s.skipText}>Saltar descanso</Text>
      </PressableCard>
    </View>
  );
};

export default function WorkoutSessionScreen() {
  const { rutinaId, nivelEnergia } = useLocalSearchParams<{ rutinaId: string, nivelEnergia?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { rutina, ejercicios, cargando } = useRoutineDetail(rutinaId as string);
  
  const ejerciciosAjustados = useMemo(() => {
    if (!ejercicios) return [];
    return ejercicios.map(ej => ({ ...ej, series: nivelEnergia === 'agotado' ? Math.max(1, ej.series - 1) : ej.series }));
  }, [ejercicios, nivelEnergia]);

  const {
    currentExercise, currentExerciseIndex, setsData, updateSetData, toggleSetComplete,
    skipRest, allSetsDone, totalExercises, restSeconds, isResting,
    goToNextExercise, goToPrevExercise, finishAndSaveWorkout, isSaving, swapExercise,
    ejerciciosActivos, previousSets 
  } = useWorkoutSession(ejerciciosAjustados);

  const [showTechGuide, setShowTechGuide] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | undefined>();
  const [workoutStats, setWorkoutStats] = useState({ volume: 0, sets: 0, finalTimeStr: '0:00' });
  const [aiMessage, setAiMessage] = useState("Generando tu resumen épico...");
  const [cargandoIA, setCargandoIA] = useState(false);

  const timerRef = useRef<TimerHandle>(null);
  const viewShotRef = useRef<ViewShot>(null);

  // ============================================================================
  // ⚡ FIX DE RENDIMIENTO: Selector Granular con useMemo (Elimina el useEffect)
  // ============================================================================
  const currentSetsMemo = useMemo(() => {
    if (!currentExercise) return [];
    return setsData[currentExercise.id] || [];
  }, [setsData, currentExercise?.id]);

  const activeSetIndex = useMemo(() => {
    if (currentSetsMemo.length === 0) return 0;
    const firstIncomplete = currentSetsMemo.findIndex((s: any) => !s.completed);
    return firstIncomplete === -1 ? currentSetsMemo.length - 1 : firstIncomplete;
  }, [currentSetsMemo]);
  // ============================================================================

  const formatTime = (sec: number) => { const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${s < 10 ? '0' : ''}${s}`; };

  const handleRegresion = (regresionId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('¿Cambiar a versión fácil?', 'Reemplazaremos este ejercicio por uno menos exigente.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, cambiar', onPress: () => swapExercise && swapExercise(currentExercise.id, regresionId) },
    ]);
  };

  const generarMensajeIA = async (volumen: number, series: number, tiempoStr: string, kcal: number) => {
    try {
      setCargandoIA(true);
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const prompt = `Actúa como un entrenador épico. Tu cliente terminó su rutina. Datos: Volumen: ${volumen} kg, Series: ${series}, Tiempo: ${tiempoStr}, Calorías: ${kcal} kcal. Genera un mensaje de victoria CORTO (2 líneas), explosivo. Cero markdown.`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setAiMessage(data.candidates[0].content.parts[0].text.trim());
    } catch (error) { setAiMessage(`¡Eres una máquina! A descansar y crecer.`); } finally { setCargandoIA(false); }
  };

const handleFinish = () => {
    let setsCalculados = 0;
    ejerciciosActivos.forEach((ex: any) => { (setsData[ex.id] || []).forEach((s: any) => { if (s.completed) setsCalculados++; }); });

    if (setsCalculados === 0) {
      Alert.alert('Entrenamiento Vacío', 'No has completado ninguna serie.', [{ text: 'Seguir entrenando', style: 'cancel' }, { text: 'Descartar y Salir', onPress: () => router.back() }]);
      return;
    }

    Alert.alert('¡Entrenamiento completado!', '¿Deseas finalizar y guardar este entrenamiento?', [
        { text: 'Seguir entrenando', style: 'cancel' },
        {
          text: 'Terminar y Guardar',
          onPress: async () => {
            try {
              const tiempoFinalSegundos = timerRef.current?.getElapsedSeconds() ?? 0;
              const tiempoFinalStr = formatTime(tiempoFinalSegundos);
              let volCalculado = 0;
              let repsTotales = 0; 
              ejerciciosActivos.forEach((ex: any) => { 
                (setsData[ex.id] || []).forEach((s: any) => { if (s.completed) { volCalculado += (parseFloat(s.kg) || 0) * (parseInt(s.reps) || 0); repsTotales += parseInt(s.reps) || 0; } }); });

              // 🧠 ------------------------------------------------------------
              // INICIO DE LA MAGIA FITMAX: CÁLCULO CIENTÍFICO
              // ---------------------------------------------------------------
              let caloriasReales = 10; 
              const { data: { user } } = await supabase.auth.getUser();
              

              if (user) {
                const { data: kcalData, error: kcalError } = await supabase.rpc('calcular_calorias_sesion', {
                  p_user_id: user.id,
                  p_duracion_seg: tiempoFinalSegundos,
                  p_volumen_total: volCalculado,
                  p_total_reps: repsTotales 
                  
                });

                if (!kcalError && kcalData) {
                  caloriasReales = kcalData;
                } else {
                  console.warn("Fallo el cálculo exacto, usando respaldo lineal.");
                  const minutos = tiempoFinalSegundos / 60;
                  caloriasReales = minutos > 1 ? Math.round(minutos * 5) : 10;
                }
              }
              // ---------------------------------------------------------------
              // FIN DE LA MAGIA
              // ---------------------------------------------------------------

              setWorkoutStats({ volume: volCalculado, sets: setsCalculados, finalTimeStr: tiempoFinalStr });
              
              const id = await finishAndSaveWorkout(rutinaId as string, rutina?.nombre || 'Rutina', tiempoFinalSegundos, volCalculado, setsCalculados, caloriasReales);
              
              if (id) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setSavedSessionId(id); 
                setShowSummary(true); 
                generarMensajeIA(volCalculado, setsCalculados, tiempoFinalStr, caloriasReales);
              } else throw new Error("No se pudo guardar");
            } catch (e) { 
              console.error("Error al finalizar:", e);
              Alert.alert('Error', 'No se pudo guardar tu entrenamiento.'); 
            }
          },
        },
      ]
    );
  };
  const shareWorkout = async () => {
    try {
      if (viewShotRef.current && viewShotRef.current.capture) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const current = viewShotRef.current;
        setTimeout(async () => {
          try {
            if (current.capture) {
              const uri = await current.capture();
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable && uri) {
                await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '¡Mira mi entrenamiento en FitMax!' });
              }
            }
          } catch (e) { console.error('Error al capturar imagen:', e); }
        }, 300);
      }
    } catch (error) { console.error('Error al compartir', error); }
  };

  if (cargando || !currentExercise) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  // 🚀 FIX: Usamos nuestro currentSetsMemo hiper-optimizado en lugar de extraerlo de setsData de nuevo
  const currentSets = currentSetsMemo;
  const equipoId = currentExercise.ejercicio.equipo_id;
  const esPesoCorporal = [1, 3, 9, 10].includes(equipoId);
  const esCalentamiento = currentExercise.es_calentamiento;
  const esPorTiempo = currentExercise.ejercicio.es_por_tiempo || esCalentamiento;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      {!showSummary && (
        <LinearGradient colors={['#111111', 'transparent']} style={[s.header, { paddingTop: insets.top + 8 }]}>
          <PressableCard style={s.closeBtn} onPress={() => router.back()} disabled={isSaving}>
            <Ionicons name="close" size={22} color="#fff" />
          </PressableCard>
          <TimerIsland ref={timerRef} label="SESIÓN ACTIVA" />
          <PressableCard style={s.finishBtn} onPress={handleFinish} disabled={isSaving}>
            <Text style={s.finishBtnText}>FIN</Text>
          </PressableCard>
        </LinearGradient>
      )}

      {!showSummary && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}>
          <View style={s.progressRow}>
            {ejerciciosAjustados.map((_, i) => (
              <View key={i} style={[s.dot, i < currentExerciseIndex && s.dotDone, i === currentExerciseIndex && s.dotActive]} />
            ))}
          </View>
          
          <View style={s.exerciseHeader}>
            <View style={s.exerciseTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.exerciseName} numberOfLines={2}>{currentExercise.ejercicio.nombre}</Text>
                {esCalentamiento && (
                  <View style={s.warmupBadge}>
                    <Text style={s.warmupBadgeText}>🔥 FASE DE CALENTAMIENTO</Text>
                  </View>
                )}
              </View>
              <PressableCard onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTechGuide(true); }} style={s.infoCircle}>
                <Ionicons name="body-outline" size={20} color={colors.primary} />
              </PressableCard>
            </View>

            {currentExercise.ejercicio.regresion_de && (
              <PressableCard style={s.regresionBtn} onPress={() => handleRegresion(currentExercise.ejercicio.regresion_de)}>
                <Ionicons name="arrow-down-circle" size={18} color={colors.primary} />
                <Text style={s.regresionText}>¿Muy difícil? Cambiar a fácil</Text>
              </PressableCard>
            )}
          </View>

          <View style={[s.trackerCard, esCalentamiento && { borderColor: colors.warning }]}>
            <View style={s.trackerHeader}>
              <Text style={[s.trackerCol, { flex: 0.5 }]}>SET</Text>
              <Text style={[s.trackerCol, { flex: 1, textAlign: 'center' }]}>ANTERIOR</Text>
              {!esPesoCorporal && <Text style={[s.trackerCol, { flex: 0.8 }]}>KG</Text>}
              <Text style={[s.trackerCol, { flex: 0.8 }]}>{esPorTiempo ? 'SEGUNDOS' : 'REPS'}</Text>
              <Text style={[s.trackerCol, { flex: 0.5, textAlign: 'center' }]}>✓</Text>
            </View>

            <GhostTracker
              key={currentExercise.ejercicio_id}
              currentKg={currentSets[activeSetIndex]?.kg?.toString() ?? '0'}
              currentReps={currentSets[activeSetIndex]?.reps?.toString() ?? currentExercise.repeticiones}
              ghostSets={previousSets[currentExercise.ejercicio_id] ?? []}
              setIndex={activeSetIndex}
              isCompleted={currentSets[activeSetIndex]?.completed ?? false}
            /> 

            {currentSets.map((set: any, index: number) => {
              const prevSet = previousSets[currentExercise.ejercicio_id]?.[index];
              let ghostText = "---";
              if (prevSet) {
                if (esPorTiempo) ghostText = `${prevSet.reps}s`;
                else if (esPesoCorporal) ghostText = `${prevSet.reps} reps`;
                else ghostText = `${prevSet.kg}kg × ${prevSet.reps}`;
              }

              return (
                <View key={index} style={[s.setRow, set.completed && s.setRowCompleted]}>
                  <Text style={[s.setNum, set.completed && s.setTextCompleted]}>{index + 1}</Text>
                  <Text style={[s.ghostText, set.completed && s.setTextCompleted]}>{ghostText}</Text>

                  {!esPesoCorporal && (
                    <View style={[s.inputWrapper, { flex: 0.8 }]}>
                      <TextInput
                        style={[s.input, set.completed && s.inputCompleted]}
                        keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted}
                        value={set.kg?.toString()} onChangeText={(val) => updateSetData(currentExercise.id, index, 'kg', val)} editable={!set.completed}
                      />
                    </View>
                  )}

                  <View style={[s.inputWrapper, { flex: 0.8, marginLeft: esPesoCorporal ? 20 : 0 }]}>
                    <TextInput
                      style={[s.input, set.completed && s.inputCompleted]}
                      keyboardType="numeric" placeholder={String(currentExercise.repeticiones)} placeholderTextColor={colors.textMuted}
                      value={set.reps?.toString()} onChangeText={(val) => updateSetData(currentExercise.id, index, 'reps', val)} editable={!set.completed}
                    />
                  </View>
                  
                  <PressableCard style={[s.checkBtn, set.completed && s.checkBtnCompleted]} onPress={() => toggleSetComplete(currentExercise.id, index)}>
                    <Ionicons name="checkmark" size={18} color={set.completed ? '#000' : colors.border} />
                  </PressableCard>
                </View>
              );
            })}
          </View>

          {isResting ? (
            <RestTimerIsland initialSeconds={restSeconds} onFinish={skipRest} onSkip={skipRest} />
          ) : allSetsDone ? (
            <View style={s.nextCard}>
              <PressableCard style={buttons.primary} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                currentExerciseIndex < totalExercises - 1 ? goToNextExercise() : handleFinish();
              }}>
                <Text style={buttons.primaryText}>{currentExerciseIndex < totalExercises - 1 ? 'Siguiente Ejercicio →' : 'Terminar Rutina 🏆'}</Text>
              </PressableCard>
            </View>
          ) : null}
          
          {currentExerciseIndex > 0 && !isResting && (
            <PressableCard style={buttons.ghost} onPress={goToPrevExercise}>
              <Text style={buttons.ghostText}>← Volver al ejercicio anterior</Text>
            </PressableCard>
          )}
        </ScrollView>
      )}

      <Modal visible={showTechGuide} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.modalHeader}>
              <View style={s.modalHandle} />
              <PressableCard onPress={() => setShowTechGuide(false)} style={s.modalClose}><Ionicons name="close-circle" size={32} color={colors.textMuted} /></PressableCard>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>{currentExercise.ejercicio.nombre}</Text>
              <ExerciseGuideCard ejercicio={currentExercise.ejercicio} compact={true} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showSummary && (
        <ScrollView style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', zIndex: 50 }]} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.xl, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <Text style={s.summaryMainTitle}>¡MISIÓN CUMPLIDA!</Text>

          <SessionReportCard sesionId={savedSessionId} rutinaId={rutinaId as string} nombreRutina={rutina?.nombre} />

          <View style={{ height: spacing.xl }} />

          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={s.shareCardContainer}>
            <LinearGradient colors={['#1a1a1c', '#000000']} style={s.shareCard}>
              <View style={s.shareHeader}>
                <Ionicons name="flame" size={28} color={colors.primary} /><Text style={s.shareBrand}>FitMax App</Text>
              </View>
              <Text style={s.shareRoutineName}>{rutina?.nombre || 'Rutina'}</Text>
              <View style={s.aiMessageBox}>
                {cargandoIA ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={s.aiMessageText}>{aiMessage}</Text>}
              </View>
              <View style={s.shareMetrics}>
                <View style={s.shareMetricBox}><Text style={s.shareMetricValue}>{workoutStats.finalTimeStr}</Text><Text style={s.shareMetricLabel}>TIEMPO</Text></View>
                <View style={s.shareMetricDiv} />
                <View style={s.shareMetricBox}><Text style={s.shareMetricValue}>{workoutStats.volume.toLocaleString()} kg</Text><Text style={s.shareMetricLabel}>VOLUMEN</Text></View>
                <View style={s.shareMetricDiv} />
                <View style={s.shareMetricBox}><Text style={s.shareMetricValue}>{workoutStats.sets}</Text><Text style={s.shareMetricLabel}>SERIES</Text></View>
              </View>
              <View style={s.shareFooter}><Text style={s.shareFooterText}>Únete a FitMax. Entrena Inteligente.</Text></View>
            </LinearGradient>
          </ViewShot>

          <View style={s.summaryActions}>
            <PressableCard style={s.shareInstagramBtn} onPress={shareWorkout} >
              <Ionicons name="logo-instagram" size={24} color="#fff" /><Text style={s.shareInstagramText}>Compartir en Historias</Text>
            </PressableCard>
            <PressableCard style={[buttons.ghost, {marginTop: 10}]} onPress={() => router.replace('/(tabs)/home')}>
              <Text style={buttons.ghostText}>Volver al Inicio</Text>
            </PressableCard>
          </View>
        </ScrollView>
      )}

      {isSaving && (
        <View style={s.savingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.savingText}>GUARDANDO SESIÓN...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  closeBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  timerBox: { alignItems: 'center' },
  timerLabel: { ...typography.caption },
  timerValue: { ...typography.h1, fontSize: 24 }, 
  finishBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md },
  finishBtnText: { ...typography.small, color: '#000', fontWeight: '900' },
  scroll: { paddingHorizontal: spacing.lg },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: spacing.xl },
  dot: { height: 4, flex: 1, borderRadius: 2, backgroundColor: colors.surface },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: '#fff' },
  exerciseHeader: { marginBottom: spacing.md },
  exerciseTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  exerciseName: { ...typography.h1, textTransform: 'uppercase' },
  infoCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: 4 },
  warmupBadge: { backgroundColor: 'rgba(255, 215, 0, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start', marginTop: 6, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.4)' },
  warmupBadgeText: { ...typography.caption, color: colors.warning },
  regresionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryFaded, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255, 77, 0, 0.3)', marginTop: 12 },
  regresionText: { ...typography.small, color: colors.primary, marginLeft: 6 },
  trackerCard: { backgroundColor: '#121212', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  trackerHeader: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  trackerCol: { ...typography.caption },
  setRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: 8, marginBottom: 8 },
  setRowCompleted: { backgroundColor: colors.primaryFaded },
  setNum: { flex: 0.5, ...typography.h2, textAlign: 'center' },
  ghostText: { flex: 1, ...typography.small, textAlign: 'center', fontStyle: 'italic' },
  setTextCompleted: { color: colors.primary, opacity: 0.6 },
  inputWrapper: { paddingHorizontal: 4 },
  input: { backgroundColor: colors.surfaceLight, color: '#fff', borderRadius: radius.sm, paddingVertical: 10, textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  inputCompleted: { backgroundColor: 'transparent', color: colors.primary },
  checkBtn: { flex: 0.5, height: 40, backgroundColor: colors.surfaceLight, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  checkBtnCompleted: { backgroundColor: colors.primary },
  restCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.primaryFaded },
  restTitle: { ...typography.caption, color: colors.primary },
  restTimer: { ...typography.h1, fontSize: 60, marginVertical: 8 },
  skipBtn: { padding: 10 },
  skipText: { ...typography.small },
  nextCard: { marginTop: spacing.md },
  prevLink: { marginTop: spacing.lg, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, height: '80%' },
  modalHeader: { height: 40, alignItems: 'center', justifyContent: 'center' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2 },
  modalClose: { position: 'absolute', right: 0, top: 5 },
  modalTitle: { ...typography.h2, textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' },
  savingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  savingText: { ...typography.caption, color: colors.primary, marginTop: 16 },
  summaryMainTitle: { ...typography.h1, marginBottom: 20, textAlign: 'center' },
  shareCardContainer: { width: '100%', borderRadius: radius.lg, overflow: 'hidden' },
  shareCard: { padding: 30, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  shareHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  shareBrand: { ...typography.label },
  shareRoutineName: { ...typography.h1, color: colors.primary, textAlign: 'center', textTransform: 'uppercase', marginBottom: 15 }, 
  aiMessageBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: radius.md, marginVertical: 10, minHeight: 60, justifyContent: 'center', width: '100%' },
  aiMessageText: { ...typography.body, fontStyle: 'italic', textAlign: 'center' },
  shareMetrics: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.lg, padding: 20, marginBottom: 30 },
  shareMetricBox: { alignItems: 'center', flex: 1 },
  shareMetricValue: { ...typography.h2, marginBottom: 4 },
  shareMetricLabel: { ...typography.caption },
  shareMetricDiv: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.1)' },
  shareFooter: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primaryFaded, borderRadius: radius.full },
  shareFooterText: { ...typography.caption, color: colors.primary },
  summaryActions: { width: '100%', marginTop: 20, gap: 16 },
  shareInstagramBtn: { flexDirection: 'row', backgroundColor: '#E1306C', paddingVertical: 16, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', gap: 10 },
  shareInstagramText: { ...typography.label, color: '#fff' },
});