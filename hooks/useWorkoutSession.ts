import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

export function useWorkoutSession(ejerciciosIniciales: any[]) {
  // 🚀 ESTADO ACTIVO: Clonamos los ejercicios para poder modificarlos en vivo (Ej: Regresiones)
  const [activeExercises, setActiveExercises] = useState<any[]>([]);
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false); // 🚀 Para el botón de "Muy Difícil"

  // Referencia absoluta del tiempo para cuando la app va a segundo plano
  const restEndTimeRef = useRef<number | null>(null);

  // 1. Inicializar sesión
  useEffect(() => {
    if (ejerciciosIniciales.length > 0 && activeExercises.length === 0) {
      setActiveExercises(ejerciciosIniciales);
      
      const initialSets: Record<string, boolean[]> = {};
      ejerciciosIniciales.forEach(ex => {
        initialSets[ex.id] = new Array(ex.series || 3).fill(false);
      });
      setCompletedSets(initialSets);
    }
  }, [ejerciciosIniciales]);

  const totalExercises = activeExercises.length;
  const currentExercise = activeExercises[currentExerciseIndex];

  // 2. Cronómetro a prueba de Background (Segundo Plano)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isResting && restEndTimeRef.current) {
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

    return () => subscription.remove();
  }, [isResting]);

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

  // 3. Manejo de Series
  const getNextSetIndex = (exerciseRelationId: string) => {
    const sets = completedSets[exerciseRelationId] || [];
    return sets.findIndex(s => !s);
  };

  const completeNextSet = useCallback((exerciseRelationId: string) => {
    if (isResting) return;

    const nextIndex = getNextSetIndex(exerciseRelationId);
    if (nextIndex === -1) return;

    setCompletedSets(prev => {
      const sets = [...(prev[exerciseRelationId] || [])];
      sets[nextIndex] = true;
      return { ...prev, [exerciseRelationId]: sets };
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const sets = completedSets[exerciseRelationId] || [];
    const isLastSet = sets.filter(s => !s).length === 1; 

    if (!isLastSet) {
      const descanso = currentExercise?.descanso_seg || 60;
      restEndTimeRef.current = Date.now() + (descanso * 1000);
      setRestSeconds(descanso);
      setIsResting(true);
    }
  }, [isResting, completedSets, currentExercise]);

  const skipRest = useCallback(() => {
    setRestSeconds(0);
    setIsResting(false);
    restEndTimeRef.current = null;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const allSetsDone = currentExercise
    ? (completedSets[currentExercise.id] || []).every(s => s)
    : false;

  // 4. Navegación entre ejercicios
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

  // 🚀 5. MAGIA PREMIUM: Intercambio de Ejercicio (Regresión)
  const swapExercise = async (relationId: string, newExerciseId: string) => {
    try {
      setIsSwapping(true);
      
      // Buscamos el nuevo ejercicio en la BD
      const { data: newEj, error } = await supabase
        .from('EJERCICIOS')
        .select('*')
        .eq('id', newExerciseId)
        .single();

      if (error || !newEj) throw error;

      // Reemplazamos el ejercicio ACTIVO pero mantenemos su ID de relación
      // ¡Esto hace que el progreso de las series (completedSets) se mantenga intacto!
      setActiveExercises(prev => prev.map(item => {
        if (item.id === relationId) {
          return {
            ...item,
            ejercicio_id: newExerciseId,
            ejercicio: newEj // Sobrescribimos la info visual con el nuevo
          };
        }
        return item;
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('Error al hacer swap del ejercicio:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSwapping(false);
    }
  };

  // 6. Guardado del Historial
  const finishAndSaveWorkout = async (
    rutinaId: string,
    nombreRutina: string,
    totalSeconds: number
  ) => {
    try {
      setIsSaving(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) throw new Error('Sin sesión');

      let volumenTotal = 0;
      let setsTotales = 0;

      // Usamos los activeExercises para guardar la versión fácil si el usuario la cambió
      const detalles = activeExercises.map(ex => {
        const sets = completedSets[ex.id] || [];
        const hechos = sets.filter(Boolean).length;
        setsTotales += hechos;
        const reps = parseInt(ex.repeticiones || '10');
        
        volumenTotal += hechos * reps * 10; 
        
        return {
          ejercicio_id: ex.ejercicio_id, // Guardará el ID del ejercicio regresionado
          nombre_ejercicio: ex.ejercicio.nombre,
          series_json: sets.map((done: boolean) => ({
            reps, kg: 10, completed: done
          }))
        };
      });

      // Insertar Sesión Madre
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

      // Insertar Detalles
      await supabase.from('HISTORIAL_EJERCICIOS').insert(
        detalles.map(d => ({ ...d, sesion_id: sesion.id }))
      );

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
    isSwapping, // Lo exponemos por si quieres deshabilitar el botón mientras carga
    swapExercise, // Exponemos la función a la UI
    ejerciciosActivos: activeExercises // Lista actualizada de ejercicios
  };
}