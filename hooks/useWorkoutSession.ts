// Ruta: hooks/useWorkoutSession.ts
import { useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase'; // Importante: Conexión a la BD

export function useWorkoutSession(ejercicios: any[]) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  
  // NUEVO: Estado para bloquear la pantalla mientras guardamos
  const [isSaving, setIsSaving] = useState(false);

  const totalExercises = ejercicios.length;
  const currentExercise = ejercicios[currentExerciseIndex];

  // 1. Inicializa los sets
  useEffect(() => {
    if (ejercicios.length > 0 && Object.keys(completedSets).length === 0) {
      const initial: Record<string, boolean[]> = {};
      ejercicios.forEach(ex => {
        initial[ex.id] = new Array(ex.series).fill(false);
      });
      setCompletedSets(initial);
    }
  }, [ejercicios]);

  // 2. Timer de Descanso con vibración
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds(prev => prev - 1);
      }, 1000);
    } else if (restSeconds === 0 && isResting) {
      setIsResting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    return () => clearInterval(interval);
  }, [isResting, restSeconds]);

  // 3. Marcar sets
  const toggleSet = useCallback((exerciseId: string, setIndex: number) => {
    setCompletedSets(prev => {
      const currentSets = [...(prev[exerciseId] || [])];
      const isMarkingComplete = !currentSets[setIndex];
      
      currentSets[setIndex] = isMarkingComplete;

      if (isMarkingComplete) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRestSeconds(60); 
        setIsResting(true);
      }

      return { ...prev, [exerciseId]: currentSets };
    });
  }, []);

  // 4. Navegación
  const goToNextExercise = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setIsResting(false);
      setRestSeconds(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const goToPrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      setIsResting(false);
      setRestSeconds(0);
    }
  };

  // 🚀 NUEVO: Lógica de Guardado Premium
  const finishAndSaveWorkout = async (rutinaId: string, nombreRutina: string, totalSeconds: number) => {
    try {
      setIsSaving(true);
      
      // 1. Obtener usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) throw new Error("Debes iniciar sesión para guardar.");

      let volumenTotal = 0;
      let setsTotalesCompletados = 0;

      // 2. Preparar los detalles de los ejercicios
      const detallesEjercicios = ejercicios.map(ex => {
        const setsDone = completedSets[ex.id] || [];
        const numSetsTerminados = setsDone.filter((s: boolean) => s).length;
        setsTotalesCompletados += numSetsTerminados;
        
        // CÁLCULO DE VOLUMEN: Como aún no tenemos input de peso por serie, 
        // usaremos un peso base de 10kg temporalmente para que tu historial no salga en 0.
        // Fórmula: (Reps * 10kg) * Series completadas
        const reps = parseInt(ex.repeticiones || '0');
        volumenTotal += (numSetsTerminados * reps * 10);

        return {
          ejercicio_id: ex.ejercicio_id,
          nombre_ejercicio: ex.ejercicio.nombre,
          series_json: setsDone.map((done: boolean) => ({ 
            reps: reps, 
            kg: 10, // Placeholder
            completed: done 
          }))
        };
      });

      // 3. Insertar la Cabecera de la Sesión
      const { data: sesionData, error: sesionError } = await supabase
        .from('HISTORIAL_SESIONES')
        .insert({
          user_id: user.id,
          rutina_id: rutinaId,
          nombre_rutina: nombreRutina,
          duracion_segundos: totalSeconds,
          volumen_total_kg: volumenTotal,
          sets_completados: setsTotalesCompletados
        })
        .select()
        .single();

      if (sesionError) throw sesionError;

      // 4. Insertar los detalles vinculados al ID de la sesión
      const detallesConSesionId = detallesEjercicios.map(d => ({
        ...d,
        sesion_id: sesionData.id
      }));

      const { error: detallesError } = await supabase
        .from('HISTORIAL_EJERCICIOS')
        .insert(detallesConSesionId);

      if (detallesError) throw detallesError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;

    } catch (error: any) {
      console.error("❌ Error guardando sesión:", error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    currentExercise,
    currentExerciseIndex,
    completedSets,
    toggleSet,
    totalExercises,
    restSeconds,
    isResting,
    goToNextExercise,
    goToPrevExercise,
    finishAndSaveWorkout,
    isSaving
  };
}