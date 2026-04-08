import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
// 🚀 IMPORTACIÓN CLAVE PARA GUARDAR SIN INTERNET
import { saveSessionWithFallback } from '../lib/offlineQueue';

export function useWorkoutSession(ejerciciosIniciales: any[]) {
  const [activeExercises, setActiveExercises] = useState<any[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [setsData, setSetsData] = useState<Record<string, any[]>>({});
  const [previousSets, setPreviousSets] = useState<Record<string, any[]>>({});
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // 👻 BUSCAR HISTORIAL ANTERIOR
  const fetchPreviousStats = async (ejercicios: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || ejercicios.length === 0) return;

    const ids = ejercicios.map(e => e.ejercicio_id);
    const { data } = await supabase
      .from('HISTORIAL_EJERCICIOS')
      .select('ejercicio_id, series_json, created_at')
      .eq('user_id', user.id)
      .in('ejercicio_id', ids)
      .order('created_at', { ascending: false });

    if (data) {
      const map: any = {};
      data.forEach(row => {
        if (!map[row.ejercicio_id]) map[row.ejercicio_id] = row.series_json;
      });
      setPreviousSets(map);
    }
  };

  useEffect(() => {
    if (ejerciciosIniciales?.length > 0) {
      setActiveExercises(ejerciciosIniciales);
      const initialSets: any = {};
      ejerciciosIniciales.forEach(ex => {
        initialSets[ex.id] = Array.from({ length: ex.series }).map(() => ({
          reps: ex.repeticiones, kg: '', completed: false
        }));
      });
      setSetsData(initialSets);
      fetchPreviousStats(ejerciciosIniciales);
    }
  }, [ejerciciosIniciales]);

  // 🔄 FUNCIÓN PARA INTERCAMBIAR EJERCICIO (Regresión)
  const swapExercise = async (relationId: string, newExerciseId: string) => {
    try {
      const { data: newEj } = await supabase
        .from('EJERCICIOS')
        .select('*')
        .eq('id', newExerciseId)
        .single();

      if (newEj) {
        setActiveExercises(prev => prev.map(item => 
          item.id === relationId ? { ...item, ejercicio_id: newExerciseId, ejercicio: newEj } : item
        ));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error("Error al cambiar ejercicio:", e);
    }
  };

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newSets = [...setsData[exerciseId]];
    newSets[setIndex].completed = !newSets[setIndex].completed;
    
    if (newSets[setIndex].completed) {
      const seg = activeExercises[currentExerciseIndex]?.descanso_segundos || 60;
      setRestSeconds(seg);
      setIsResting(true);
    }
    setSetsData({ ...setsData, [exerciseId]: newSets });
  };

  // 🚀 LA FUNCIÓN QUE CORREGIMOS PARA QUE USE EL OFFLINE QUEUE 🚀
  const finishAndSaveWorkout = async (rutinaId: string, nombre: string, segundos: number, vol: number, sets: number, kcal: number) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null; 

      // 1. Armamos el "Paquete" de la sesión principal
      const sessionPayload = {
        user_id: user.id, 
        rutina_id: rutinaId, 
        nombre_rutina: nombre,
        duracion_segundos: segundos, 
        volumen_total_kg: vol,
        sets_completados: sets, 
        calorias_quemadas: kcal,
        fecha: new Date().toISOString() // Muy importante para el orden
      };

      // 2. Armamos el "Paquete" del detalle de cada ejercicio
      const exerciseLogs = activeExercises.map(ex => ({
        user_id: user.id,
        ejercicio_id: ex.ejercicio_id,
        nombre_ejercicio: ex.ejercicio?.nombre || 'Ejercicio sin nombre',
        series_json: setsData[ex.id] || [] 
      }));

      // 3. 🛡️ Enviamos todo a nuestro guardián Offline
      const result = await saveSessionWithFallback(sessionPayload, exerciseLogs);

      if (result.queued) {
        console.log(`📡 [Workout] Sin conexión. Sesión encolada para subirse luego.`);
      } else {
        console.log(`✅ [Workout] Sesión guardada directamente en la nube.`);
      }

      // Devolvemos el ID real si se guardó, o un ID falso temporal si está offline
      return result.sessionId ?? `offline_${Date.now()}`;

    } catch (e) {
      console.error("❌ Fallo crítico al guardar:", e);
      return null; 
    } finally { 
      setIsSaving(false); 
    }
  };

  return {
    currentExercise: activeExercises[currentExerciseIndex],
    currentExerciseIndex,
    setsData,
    previousSets,
    toggleSetComplete,
    isResting,
    restSeconds,
    skipRest: () => { setIsResting(false); setRestSeconds(0); },
    goToNextExercise: () => setCurrentExerciseIndex(prev => prev + 1),
    goToPrevExercise: () => setCurrentExerciseIndex(prev => prev - 1),
    finishAndSaveWorkout,
    isSaving,
    totalExercises: activeExercises.length,
    ejerciciosActivos: activeExercises,
    updateSetData: (id: string, idx: number, field: string, val: string) => {
      const s = [...(setsData[id] || [])];
      if (s[idx]) {
        s[idx] = { ...s[idx], [field]: val };
        setSetsData({...setsData, [id]: s});
      }
    },
    allSetsDone: activeExercises[currentExerciseIndex] 
      ? (setsData[activeExercises[currentExerciseIndex].id] || []).every(s => s.completed) 
      : false,
    swapExercise
  };
}