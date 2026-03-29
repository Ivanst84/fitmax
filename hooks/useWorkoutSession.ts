// Ruta: hooks/useWorkoutSession.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native'; // 🚀 NUEVO IMPORT
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

export function useWorkoutSession(ejercicios: any[]) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 🚀 ARQUITECTURA SENIOR: Referencia absoluta del tiempo
  const restEndTimeRef = useRef<number | null>(null);

  const totalExercises = ejercicios.length;
  const currentExercise = ejercicios[currentExerciseIndex];

  // Inicializa sets cuando cargan los ejercicios
  useEffect(() => {
    if (ejercicios.length > 0 && Object.keys(completedSets).length === 0) {
      const initial: Record<string, boolean[]> = {};
      ejercicios.forEach(ex => {
        initial[ex.id] = new Array(ex.series).fill(false);
      });
      setCompletedSets(initial);
    }
  }, [ejercicios]);

  // 🚀 NUEVO: Sincronización cuando la app va a Background / Foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isResting && restEndTimeRef.current) {
        // Calculamos cuánto tiempo queda REALMENTE basándonos en el reloj absoluto
        const now = Date.now();
        const remaining = Math.round((restEndTimeRef.current - now) / 1000);
        
        if (remaining <= 0) {
          setRestSeconds(0);
          setIsResting(false);
          restEndTimeRef.current = null;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setRestSeconds(remaining);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isResting]);

  // Timer de descanso (Visual en pantalla)
  useEffect(() => {
    if (!isResting || restSeconds <= 0) return;

    const interval = setInterval(() => {
      if (restEndTimeRef.current) {
        const remaining = Math.round((restEndTimeRef.current - Date.now()) / 1000);
        
        if (remaining <= 0) {
          setRestSeconds(0);
          setIsResting(false);
          restEndTimeRef.current = null;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          clearInterval(interval);
        } else {
          setRestSeconds(remaining);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isResting, restSeconds]);

  const getNextSetIndex = (exerciseId: string) => {
    const sets = completedSets[exerciseId] || [];
    return sets.findIndex(s => !s);
  };

  const completeNextSet = useCallback((exerciseId: string) => {
    if (isResting) return;

    const nextIndex = getNextSetIndex(exerciseId);
    if (nextIndex === -1) return;

    setCompletedSets(prev => {
      const sets = [...(prev[exerciseId] || [])];
      sets[nextIndex] = true;
      return { ...prev, [exerciseId]: sets };
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const sets = completedSets[exerciseId] || [];
    // Si la serie que acabamos de marcar era la última (solo quedaba 1 falsa antes)
    const isLastSet = sets.filter(s => !s).length === 1; 

    if (!isLastSet) {
      const descanso = currentExercise?.descanso_seg || 60;
      // 🚀 Marcamos el tiempo futuro exacto en el que debe terminar el descanso
      restEndTimeRef.current = Date.now() + (descanso * 1000);
      setRestSeconds(descanso);
      setIsResting(true);
    }
  }, [isResting, completedSets, currentExercise]);

  const skipRest = useCallback(() => {
    setRestSeconds(0);
    setIsResting(false);
    restEndTimeRef.current = null; // Limpiamos la referencia
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const allSetsDone = currentExercise
    ? (completedSets[currentExercise.id] || []).every(s => s)
    : false;

  const goToNextExercise = useCallback(() => {
    if (!allSetsDone || isResting) return;
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [allSetsDone, isResting, currentExerciseIndex, totalExercises]);

  const goToPrevExercise = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      setIsResting(false);
      setRestSeconds(0);
      restEndTimeRef.current = null;
    }
  }, [currentExerciseIndex]);

  const finishAndSaveWorkout = async (
    rutinaId: string,
    nombreRutina: string,
    totalSeconds: number
  ) => {
    try {
      setIsSaving(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) throw new Error('Sin sesión de usuario');

      let volumenTotal = 0;
      let setsTotales = 0;

      const detalles = ejercicios.map(ex => {
        const sets = completedSets[ex.id] || [];
        const hechos = sets.filter(Boolean).length;
        setsTotales += hechos;
        const reps = parseInt(ex.repeticiones || '0');
        // Cálculo de volumen: asumimos 10kg base por ahora (peso corporal)
        volumenTotal += hechos * reps * 10; 
        
        return {
          ejercicio_id: ex.ejercicio_id,
          nombre_ejercicio: ex.ejercicio.nombre,
          series_json: sets.map((done: boolean) => ({
            reps, kg: 10, completed: done
          }))
        };
      });

      // Insertamos el historial
      const { data: sesion, error: sesionErr } = await supabase
        .from('HISTORIAL_SESIONES')
        .insert({
          user_id: user.id,
          rutina_id: rutinaId,
          nombre_rutina: nombreRutina,
          duracion_segundos: totalSeconds,
          volumen_total_kg: volumenTotal,
          sets_completados: setsTotales,
        })
        .select()
        .single();

      if (sesionErr) throw sesionErr;

      // Insertamos los detalles (ejercicios)
      await supabase.from('HISTORIAL_EJERCICIOS').insert(
        detalles.map(d => ({ ...d, sesion_id: sesion.id }))
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (e: any) {
      console.error('Error guardando:', e.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
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
  };
}