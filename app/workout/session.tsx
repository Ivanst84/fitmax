import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Alert, StatusBar, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { colors, spacing, radius, typography } from '../../constants/theme';
import { useRoutineDetail } from '../../hooks/useRoutineDetail';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import ExerciseGuideCard from '../../components/ui/ExerciseGuideCard';

export default function WorkoutSessionScreen() {
  const { rutinaId } = useLocalSearchParams<{ rutinaId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { rutina, ejercicios, cargando } = useRoutineDetail(rutinaId as string);
  
  const {
    currentExercise, currentExerciseIndex, setsData, updateSetData, toggleSetComplete,
    skipRest, allSetsDone, totalExercises, restSeconds, isResting,
    goToNextExercise, goToPrevExercise, finishAndSaveWorkout, isSaving, swapExercise,
    ejerciciosActivos
  } = useWorkoutSession(ejercicios);

  // 🚀 ESTADOS DE UI
  const [showTechGuide, setShowTechGuide] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [workoutStats, setWorkoutStats] = useState({ volume: 0, sets: 0, finalTimeStr: '0:00' });
  
  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef<any>(null);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTotalSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRegresion = (regresionId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      '¿Cambiar a versión fácil?',
      'Reemplazaremos este ejercicio por uno menos exigente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, cambiar', onPress: () => swapExercise && swapExercise(currentExercise.id, regresionId) },
      ]
    );
  };

  const handleFinish = () => {
    Alert.alert(
      '¡Entrenamiento completado!',
      '¿Deseas finalizar y guardar este entrenamiento?',
      [
        { text: 'Seguir entrenando', style: 'cancel' },
        {
          text: 'Terminar y Guardar',
          onPress: async () => {
            try {
              if (intervalRef.current) clearInterval(intervalRef.current);
              const tiempoFinalSegundos = totalSeconds;
              const tiempoFinalStr = formatTime(tiempoFinalSegundos);

              let volCalculado = 0;
              let setsCalculados = 0;
              
              ejerciciosActivos.forEach((ex: any) => {
                const sets = setsData[ex.id] || [];
                sets.forEach((s: any) => {
                  if (s.completed) {
                    setsCalculados++;
                    volCalculado += (parseFloat(s.kg) || 0) * (parseInt(s.reps) || 0);
                  }
                });
              });

              setWorkoutStats({ 
                volume: volCalculado, 
                sets: setsCalculados, 
                finalTimeStr: tiempoFinalStr 
              });

              const ok = await finishAndSaveWorkout(
                rutinaId as string, 
                rutina?.nombre || 'Rutina', 
                tiempoFinalSegundos,
                volCalculado, 
                setsCalculados
              );
              
              if (ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowSummary(true); 
              } else {
                throw new Error("No se pudo guardar");
              }
            } catch (e) {
              Alert.alert('Error', 'No se pudo guardar tu entrenamiento.');
              intervalRef.current = setInterval(() => {
                setTotalSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
              }, 1000);
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
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '¡Mira mi entrenamiento en FitMax!' });
        }
      }
    } catch (error) {
      console.error('Error al compartir', error);
    }
  };

  if (cargando || !currentExercise) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  const currentSets = setsData[currentExercise.id] || [];

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      {!showSummary && (
        <LinearGradient colors={['#111111', 'transparent']} style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()} disabled={isSaving}>
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
      )}

      {/* CONTENIDO */}
      {!showSummary && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}>
          <View style={s.progressRow}>
            {ejercicios.map((_, i) => (
              <View key={i} style={[s.dot, i < currentExerciseIndex && s.dotDone, i === currentExerciseIndex && s.dotActive]} />
            ))}
          </View>
          
          <View style={s.exerciseHeader}>
            <View style={s.exerciseTitleRow}>
              <Text style={s.exerciseName} numberOfLines={2}>{currentExercise.ejercicio.nombre}</Text>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTechGuide(true);
                }}
                style={s.infoCircle}
              >
                <Ionicons name="body-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {currentExercise.ejercicio.regresion_de && (
              <TouchableOpacity style={s.regresionBtn} activeOpacity={0.7} onPress={() => handleRegresion(currentExercise.ejercicio.regresion_de)}>
                <Ionicons name="arrow-down-circle" size={18} color={colors.primary} />
                <Text style={s.regresionText}>¿Muy difícil? Cambiar a fácil</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tracker de Series */}
          <View style={s.trackerCard}>
            <View style={s.trackerHeader}>
              <Text style={[s.trackerCol, { flex: 0.5 }]}>SERIE</Text>
              <Text style={[s.trackerCol, { flex: 1 }]}>KG</Text>
              <Text style={[s.trackerCol, { flex: 1 }]}>REPS</Text>
              <Text style={[s.trackerCol, { flex: 0.5, textAlign: 'center' }]}>✓</Text>
            </View>

            {currentSets.map((set: any, index: number) => (
              <View key={index} style={[s.setRow, set.completed && s.setRowCompleted]}>
                <Text style={[s.setNum, set.completed && s.setTextCompleted]}>{index + 1}</Text>
                <View style={s.inputWrapper}>
                  <TextInput
                    style={[s.input, set.completed && s.inputCompleted]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={set.kg.toString()}
                    onChangeText={(val) => updateSetData(currentExercise.id, index, 'kg', val)}
                    editable={!set.completed}
                  />
                </View>
                <View style={s.inputWrapper}>
                  <TextInput
                    style={[s.input, set.completed && s.inputCompleted]}
                    keyboardType="numeric"
                    value={set.reps.toString()}
                    onChangeText={(val) => updateSetData(currentExercise.id, index, 'reps', val)}
                    editable={!set.completed}
                  />
                </View>
                <TouchableOpacity 
                  style={[s.checkBtn, set.completed && s.checkBtnCompleted]} 
                  onPress={() => toggleSetComplete(currentExercise.id, index)}
                >
                  <Ionicons name="checkmark" size={18} color={set.completed ? '#000' : colors.border} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Rest / Next buttons */}
          {isResting ? (
            <View style={s.restCard}>
              <Text style={s.restTitle}>DESCANSO</Text>
              <Text style={s.restTimer}>{restSeconds}s</Text>
              <TouchableOpacity style={s.skipBtn} onPress={skipRest}>
                <Text style={s.skipText}>Saltar descanso</Text>
              </TouchableOpacity>
            </View>
          ) : allSetsDone ? (
            <View style={s.nextCard}>
              <TouchableOpacity style={s.nextBtn} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                currentExerciseIndex < totalExercises - 1 ? goToNextExercise() : handleFinish();
              }}>
                <Text style={s.nextBtnText}>
                  {currentExerciseIndex < totalExercises - 1 ? 'Siguiente Ejercicio →' : 'Terminar Rutina 🏆'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {currentExerciseIndex > 0 && !isResting && (
            <TouchableOpacity style={s.prevLink} onPress={goToPrevExercise}>
              <Text style={s.prevLinkText}>← Volver al ejercicio anterior</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* 🚀 MODAL DE GUÍA TÉCNICA (MUSCLE MAP + PASOS) */}
      <Modal visible={showTechGuide} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.modalHeader}>
              <View style={s.modalHandle} />
              <TouchableOpacity onPress={() => setShowTechGuide(false)} style={s.modalClose}>
                <Ionicons name="close-circle" size={32} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>{currentExercise.ejercicio.nombre}</Text>
              <ExerciseGuideCard ejercicio={currentExercise.ejercicio} compact={true} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SUMMARY / SHARE CARD (Igual a tu código anterior) */}
      {showSummary && (
        <View style={[StyleSheet.absoluteFillObject, s.summaryOverlay]}>
          <Text style={s.summaryMainTitle}>¡MISIÓN CUMPLIDA!</Text>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={s.shareCardContainer}>
            <LinearGradient colors={['#1a1a1c', '#000000']} style={s.shareCard}>
              <View style={s.shareHeader}>
                <Ionicons name="flame" size={28} color={colors.primary} />
                <Text style={s.shareBrand}>FitMax App</Text>
              </View>
              <Text style={s.shareRoutineName}>{rutina?.nombre || 'Rutina'}</Text>
              <Text style={s.shareSubtitle}>Completada</Text>
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
            <TouchableOpacity style={s.shareInstagramBtn} onPress={shareWorkout} activeOpacity={0.8}>
              <Ionicons name="logo-instagram" size={24} color="#fff" /><Text style={s.shareInstagramText}>Compartir en Historias</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.goHomeBtn} onPress={() => router.replace('/(tabs)/home')}><Text style={s.goHomeText}>Volver al Inicio</Text></TouchableOpacity>
          </View>
        </View>
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
  closeBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center' },
  timerBox: { alignItems: 'center' },
  timerLabel: { color: '#636366', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  timerValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  finishBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md },
  finishBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },
  scroll: { paddingHorizontal: spacing.lg },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: spacing.xl },
  dot: { height: 4, flex: 1, borderRadius: 2, backgroundColor: '#1c1c1e' },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: '#fff' },
  
  exerciseHeader: { marginBottom: spacing.lg },
  exerciseTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  exerciseName: { color: '#fff', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', flex: 1 },
  infoCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  
  regresionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 77, 0, 0.1)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255, 77, 0, 0.3)', marginTop: 8 },
  regresionText: { color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 6 },

  trackerCard: { backgroundColor: '#121212', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: '#222' },
  trackerHeader: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  trackerCol: { color: '#636366', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  setRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: radius.md, padding: 8, marginBottom: 8 },
  setRowCompleted: { backgroundColor: 'rgba(255,77,0,0.05)' },
  setNum: { flex: 0.5, color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  setTextCompleted: { color: colors.primary },
  inputWrapper: { flex: 1, paddingHorizontal: 4 },
  input: { backgroundColor: '#2A2A2A', color: '#fff', borderRadius: radius.sm, paddingVertical: 10, textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  inputCompleted: { backgroundColor: 'transparent', color: colors.primary },
  checkBtn: { flex: 0.5, height: 40, backgroundColor: '#2A2A2A', borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  checkBtnCompleted: { backgroundColor: colors.primary },

  restCard: { backgroundColor: '#1A1A1A', borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.primaryFaded },
  restTitle: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  restTimer: { color: '#fff', fontSize: 60, fontWeight: '900', marginVertical: 8 },
  skipBtn: { padding: 10 },
  skipText: { color: '#636366', fontSize: 14, fontWeight: '600' },
  
  nextCard: { marginTop: spacing.md },
  nextBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  
  prevLink: { marginTop: spacing.lg, alignItems: 'center' },
  prevLinkText: { color: '#636366', fontSize: 14 },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, height: '80%' },
  modalHeader: { height: 40, alignItems: 'center', justifyContent: 'center' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2 },
  modalClose: { position: 'absolute', right: 0, top: 5 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' },

  savingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  savingText: { color: colors.primary, marginTop: 16, fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  summaryOverlay: { backgroundColor: '#000', zIndex: 50, paddingHorizontal: spacing.xl, justifyContent: 'center', alignItems: 'center', ...StyleSheet.absoluteFillObject },
  summaryMainTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 30, letterSpacing: 1 },
  shareCardContainer: { width: '100%', borderRadius: radius.lg, overflow: 'hidden' },
  shareCard: { padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#333', borderRadius: radius.lg },
  shareHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 30 },
  shareBrand: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  shareRoutineName: { color: colors.primary, fontSize: 32, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', lineHeight: 34 },
  shareSubtitle: { color: '#888', fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 40 },
  shareMetrics: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.lg, padding: 20, marginBottom: 30 },
  shareMetricBox: { alignItems: 'center', flex: 1 },
  shareMetricValue: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  shareMetricLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  shareMetricDiv: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.1)' },
  shareFooter: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,77,0,0.1)', borderRadius: radius.full },
  shareFooterText: { color: colors.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  summaryActions: { width: '100%', marginTop: 40, gap: 16 },
  shareInstagramBtn: { flexDirection: 'row', backgroundColor: '#E1306C', paddingVertical: 16, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', gap: 10 },
  shareInstagramText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  goHomeBtn: { paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  goHomeText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' }
});