// Ruta: app/workout/session.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  StatusBar, 
  ActivityIndicator, 
  StyleSheet 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../../constants/theme';
import { useRoutineDetail } from '../../hooks/useRoutineDetail';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';

export default function WorkoutSessionScreen() {
  const { rutinaId } = useLocalSearchParams<{ rutinaId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { rutina, ejercicios, cargando } = useRoutineDetail(rutinaId);
  const { 
    currentExercise, 
    currentExerciseIndex, 
    completedSets, 
    toggleSet,
    totalExercises,
    restSeconds,
    isResting,
    goToNextExercise,
    goToPrevExercise,
    finishAndSaveWorkout, // <-- Nuestra nueva función
    isSaving              // <-- Nuestro estado de carga
  } = useWorkoutSession(ejercicios);

  const [totalSeconds, setTotalSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTotalSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 🚀 Función maestra para terminar
  const handleFinish = () => {
    Alert.alert(
      "¡Misión Cumplida!",
      "¿Deseas finalizar y guardar este entrenamiento en tu historial?",
      [
        { text: "Seguir entrenando", style: "cancel" },
        { 
          text: "Terminar y Guardar", 
          onPress: async () => {
            const success = await finishAndSaveWorkout(
              rutinaId, 
              rutina?.nombre || 'Rutina Personalizada', 
              totalSeconds
            );
            
            if (success) {
              router.replace('/(tabs)/history'); // Navega al historial para ver la victoria
            } else {
              Alert.alert("Error", "No se pudo guardar la sesión en la nube.");
            }
          } 
        }
      ]
    );
  };

  if (cargando || !currentExercise) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const allSetsDone = completedSets[currentExercise.id]?.every(s => s);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER DINÁMICO */}
      <LinearGradient colors={['#111111', 'transparent']} style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} disabled={isSaving}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.timerWrapper}>
          <Text style={styles.timerLabel}>SESIÓN ACTIVA</Text>
          <Text style={styles.timerValue}>{formatTime(totalSeconds)}</Text>
        </View>

        <TouchableOpacity onPress={handleFinish} style={styles.finishBtn} disabled={isSaving}>
          <Text style={styles.finishBtnText}>FIN</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* INDICADOR DE PROGRESO */}
        <View style={styles.progressRow}>
          {ejercicios.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentExerciseIndex ? styles.dotActive : i < currentExerciseIndex ? styles.dotDone : null]} />
          ))}
        </View>

        {/* TITULAR DEL EJERCICIO */}
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseSub}>EJERCICIO {currentExerciseIndex + 1} DE {totalExercises}</Text>
          <Text style={styles.exerciseTitle}>{currentExercise.ejercicio.nombre}</Text>
        </View>

        {/* LISTA DE SERIES TIPO 'CHECKLIST' */}
        <View style={styles.tableCard}>
          <View style={styles.tableLabels}>
            <Text style={[styles.label, { flex: 1 }]}>SERIE</Text>
            <Text style={[styles.label, { flex: 2, textAlign: 'center' }]}>OBJETIVO</Text>
            <Text style={[styles.label, { flex: 1, textAlign: 'right' }]}>LISTO</Text>
          </View>

          {completedSets[currentExercise.id]?.map((isDone, idx) => (
            <TouchableOpacity 
              key={idx}
              onPress={() => toggleSet(currentExercise.id, idx)}
              activeOpacity={0.7}
              disabled={isSaving}
              style={[styles.row, isDone && styles.rowDone]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.setIndex, isDone && { color: colors.primary }]}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.repsText}>{currentExercise.repeticiones} <Text style={styles.repsLabel}>REPS</Text></Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={[styles.checkCircle, isDone && styles.checkCircleDone]}>
                  {isDone && <Ionicons name="checkmark" size={20} color="#000" />}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* FOOTER PERSISTENTE */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <LinearGradient colors={['rgba(28,28,30,0.9)', '#000000']} style={styles.restCard}>
          <View style={styles.restInfo}>
            <View style={[styles.restIconBox, isResting && { backgroundColor: colors.primary }]}>
              <Ionicons name="timer" size={24} color={isResting ? "#000" : "#fff"} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.restLabel}>DESCANSO</Text>
              <Text style={[styles.restValue, isResting && { color: colors.primary }]}>
                {isResting ? `${restSeconds}s` : '00s'}
              </Text>
            </View>
          </View>
          
          <View style={styles.navButtons}>
            {currentExerciseIndex > 0 && (
              <TouchableOpacity onPress={goToPrevExercise} style={styles.prevBtn} disabled={isSaving}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={goToNextExercise}
              disabled={currentExerciseIndex === totalExercises - 1 || isSaving}
              style={[styles.nextBtn, allSetsDone && styles.nextBtnReady]}
            >
              <Text style={[styles.nextBtnText, allSetsDone && { color: '#000' }]}>SIGUIENTE</Text>
              <Ionicons name="arrow-forward" size={16} color={allSetsDone ? "#000" : "#636366"} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* 🚀 OVERLAY DE CARGA PREMIUM */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.savingText}>GUARDANDO VICTORIA...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  timerWrapper: { alignItems: 'center' },
  timerLabel: { color: '#636366', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  timerValue: { color: '#fff', fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  finishBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  finishBtnText: { color: '#000', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },

  scrollContent: { paddingHorizontal: 24, flex: 1, paddingBottom: 180 },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 32 },
  dot: { height: 4, flex: 1, borderRadius: 2, backgroundColor: '#1c1c1e' },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: '#fff' },

  exerciseHeader: { marginBottom: 24 },
  exerciseSub: { color: colors.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  exerciseTitle: { color: '#fff', fontSize: 40, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 42 },

  tableCard: { backgroundColor: 'rgba(28,28,30,0.5)', borderRadius: 32, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tableLabels: { flexDirection: 'row', marginBottom: 16, paddingHorizontal: 8 },
  label: { color: '#636366', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'transparent' },
  rowDone: { backgroundColor: 'rgba(255, 159, 10, 0.1)', borderColor: 'rgba(255, 159, 10, 0.3)' },
  setIndex: { color: '#636366', fontWeight: '900', fontSize: 16 },
  repsText: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  repsLabel: { fontSize: 12, color: '#636366', fontWeight: '600' },
  checkCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center' },
  checkCircleDone: { backgroundColor: colors.primary, borderColor: colors.primary },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24 },
  restCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderRadius: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  restInfo: { flexDirection: 'row', alignItems: 'center' },
  restIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center' },
  restLabel: { color: '#636366', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  restValue: { color: '#fff', fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  navButtons: { flexDirection: 'row', gap: 8 },
  prevBtn: { backgroundColor: '#1c1c1e', padding: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  nextBtn: { backgroundColor: '#1c1c1e', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  nextBtnReady: { backgroundColor: '#fff' },
  nextBtnText: { color: '#636366', fontWeight: '900', fontSize: 12, marginRight: 8, textTransform: 'uppercase' },

  savingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  savingText: { color: colors.primary, marginTop: 16, fontWeight: '900', fontSize: 14, letterSpacing: 2 }
});