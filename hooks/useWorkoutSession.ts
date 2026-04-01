import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

export interface SetData {
  reps: string;
  kg: string;
  completed: boolean;
}

export function useWorkoutSession(ejerciciosIniciales: any[]) {
  const [activeExercises, setActiveExercises] = useState<any[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [setsData, setSetsData] = useState<Record<string, SetData[]>>({});
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const restEndTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (ejerciciosIniciales?.length > 0 && activeExercises.length === 0) {
      setActiveExercises(ejerciciosIniciales);
      const initialSets: Record<string, SetData[]> = {};
      ejerciciosIniciales.forEach(ex => {
        initialSets[ex.id] = Array.from({ length: ex.series || 3 }).map(() => ({
          reps: ex.repeticiones?.toString() || '12',
          kg: '',
          completed: false
        }));
      });
      setSetsData(initialSets);
    }
  }, [ejerciciosIniciales]);

  const totalExercises = activeExercises.length;
  const currentExercise = activeExercises[currentExerciseIndex];

  // Lógica de Descanso (Background Safe)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isResting && restEndTimeRef.current) {
        const remaining = Math.round((restEndTimeRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          setRestSeconds(0);
          setIsResting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setRestSeconds(remaining);
        }
      }
    });
    return () => subscription.remove();
  }, [isResting]);

  useEffect(() => {
    if (!isResting || restSeconds <= 0) return;
    const interval = setInterval(() => {
      const remaining = Math.round((restEndTimeRef.current! - Date.now()) / 1000);
      if (remaining <= 0) {
        setRestSeconds(0);
        setIsResting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearInterval(interval);
      } else {
        setRestSeconds(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isResting, restSeconds]);

  const updateSetData = useCallback((exerciseId: string, setIndex: number, field: 'reps' | 'kg', value: string) => {
    setSetsData(prev => {
      const exSets = [...(prev[exerciseId] || [])];
      exSets[setIndex] = { ...exSets[setIndex], [field]: value };
      return { ...prev, [exerciseId]: exSets };
    });
  }, []);

  const toggleSetComplete = useCallback((exerciseId: string, setIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSetsData(prev => {
      const exSets = [...(prev[exerciseId] || [])];
      const isNowCompleted = !exSets[setIndex].completed;
      exSets[setIndex] = { ...exSets[setIndex], completed: isNowCompleted };
      
      if (isNowCompleted && !exSets.every(s => s.completed)) {
        const descanso = currentExercise?.descanso_seg || 60;
        restEndTimeRef.current = Date.now() + (descanso * 1000);
        setRestSeconds(descanso);
        setIsResting(true);
      }
      return { ...prev, [exerciseId]: exSets };
    });
  }, [currentExercise]);

  const swapExercise = async (relationId: string, newExerciseId: string) => {
    try {
      setIsSwapping(true);
      const { data: newEj } = await supabase.from('EJERCICIOS').select('*').eq('id', newExerciseId).single();
      if (newEj) {
        setActiveExercises(prev => prev.map(item => item.id === relationId ? { ...item, ejercicio_id: newExerciseId, ejercicio: newEj } : item));
      }
    } finally {
      setIsSwapping(false);
    }
  };

  const finishAndSaveWorkout = async (
    rutinaId: string, 
    nombreRutina: string, 
    totalSeconds: number, 
    volumenFinal: number, 
    setsFinales: number
  ) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Mapeo de historial para inserción masiva
      const historialEjercicios = activeExercises.map(ex => ({
        ejercicio_id: ex.ejercicio_id,
        nombre_ejercicio: ex.ejercicio.nombre,
        series_json: (setsData[ex.id] || []).map(s => ({
          reps: parseInt(s.reps) || 0,
          kg: parseFloat(s.kg) || 0,
          completed: s.completed
        }))
      }));

      const { data: sesion, error: sesionErr } = await supabase
        .from('HISTORIAL_SESIONES')
        .insert({
          user_id: user.id,
          rutina_id: rutinaId,
          nombre_rutina: nombreRutina,
          duracion_segundos: totalSeconds,
          volumen_total_kg: volumenFinal,
          sets_completados: setsFinales,
        })
        .select().single();

      if (sesionErr) throw sesionErr;

      await supabase.from('HISTORIAL_EJERCICIOS').insert(
        historialEjercicios.map(d => ({ ...d, sesion_id: sesion.id, user_id: user.id }))
      );

      return true;
    } catch (e) {
      console.error("Save Error:", e);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    currentExercise, currentExerciseIndex, setsData, updateSetData, toggleSetComplete,
    skipRest: () => { setIsResting(false); setRestSeconds(0); },
    allSetsDone: currentExercise ? (setsData[currentExercise.id] || []).every(s => s.completed) : false,
    totalExercises, restSeconds, isResting,
    goToNextExercise: () => setCurrentExerciseIndex(prev => prev + 1),
    goToPrevExercise: () => setCurrentExerciseIndex(prev => prev - 1),
    finishAndSaveWorkout, isSaving, isSwapping, swapExercise,
    ejerciciosActivos: activeExercises
  };
}