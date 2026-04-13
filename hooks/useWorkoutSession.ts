import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { saveSessionWithFallback } from '../lib/offlineQueue';

export function useWorkoutSession(ejerciciosIniciales: any[]) {
  const [activeExercises, setActiveExercises] = useState<any[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [setsData, setSetsData] = useState<Record<string, any[]>>({});
  const [previousSets, setPreviousSets] = useState<Record<string, any[]>>({});
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPreviousStats = async (ejercicios: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || ejercicios.length === 0) return;

    const ids = ejercicios.map(e => e.ejercicio_id);
    const { data } = await supabase
      .from('HISTORIAL_EJERCICIOS')
      .select('ejercicio_id, series_json, created_at')
      .eq('user_id', user.id)
      .in('ejercicio_id', ids)
      .order('created_at', { ascending: false })
      .limit(ids.length * 3); 

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

const finishAndSaveWorkout = async (rutinaId: string, nombre: string, segundos: number, vol: number, sets: number, kcal: number) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null; 

      const sessionPayload = {
        user_id: user.id, 
        rutina_id: rutinaId, 
        nombre_rutina: nombre,
        duracion_segundos: segundos, 
        volumen_total_kg: vol,
        sets_completados: sets, 
        calorias_quemadas: kcal,
        fecha: new Date().toISOString() 
      };

      const exerciseLogs = activeExercises.map(ex => ({
        user_id: user.id,
        ejercicio_id: ex.ejercicio_id,
        nombre_ejercicio: ex.ejercicio?.nombre || 'Ejercicio sin nombre',
        series_json: setsData[ex.id] || [] 
      }));

      // 1. GUARDAMOS EL HISTORIAL NORMAL
      const result = await saveSessionWithFallback(sessionPayload, exerciseLogs);

      // ---------------------------------------------------------
      // 🚀 2. CEREBRO COACH: SOBRECARGA PROGRESIVA AUTOMÁTICA
      // ---------------------------------------------------------
      const calcularSiguienteObjetivo = (pesoActual: number, completadoExitosamente: boolean): number => {
        if (!completadoExitosamente || pesoActual <= 0) return pesoActual; 
        const incremento = 1.025; // Aumento exacto del 2.5%
        let nuevoPeso = pesoActual * incremento;
        return Math.round(nuevoPeso / 1.25) * 1.25; 
      };

      console.log("🧠 COACH: Evaluando Sobrecarga Progresiva...");
      
      for (const ex of activeExercises) {
        const seriesDeEsteEjercicio = setsData[ex.id] || [];
        
        // Verifica que tenga series y que TODAS tengan completed: true
        const todasCompletadas = seriesDeEsteEjercicio.length > 0 && seriesDeEsteEjercicio.every((s: any) => s.completed === true);
        
        if (todasCompletadas) {
          // Toma el peso usado de la primera serie
          const pesoUsado = parseFloat(seriesDeEsteEjercicio[0].kg) || 0; 
          const nuevoPesoObjetivo = calcularSiguienteObjetivo(pesoUsado, todasCompletadas);

          // Si el peso subió, hacemos el UPDATE en la tabla RUTINA_EJERCICIOS
          if (nuevoPesoObjetivo > pesoUsado) {
            console.log(`📈 ¡Sube de nivel! ${ex.ejercicio?.nombre}: ${pesoUsado}kg -> ${nuevoPesoObjetivo}kg`);
            
            // ACTUALIZACIÓN SILENCIOSA
            await supabase
              .from('RUTINA_EJERCICIOS') // 👈 Verifica que tengas la columna peso_sugerido en esta tabla
              .update({ peso_sugerido: nuevoPesoObjetivo }) 
              .match({ rutina_id: rutinaId, ejercicio_id: ex.ejercicio_id });
          }
        }
      }
      // ---------------------------------------------------------

      if (result.queued) {
        console.log(`📡 [Workout] Sin conexión. Sesión encolada.`);
      } else {
        console.log(`✅ [Workout] Sesión guardada directamente en la nube.`);
      }

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
    
    // Función clásica (actualiza un solo set)
    updateSetData: (id: string, idx: number, field: string, val: string) => {
      setSetsData(prev => {
        const s = [...(prev[id] || [])];
        if (s[idx]) {
          s[idx] = { ...s[idx], [field]: val };
        }
        return { ...prev, [id]: s };
      });
    },

    // 🚀 NUEVA FUNCIÓN: Actualiza en cascada de forma segura
    updateCascadeSetData: (id: string, startIndex: number, field: string, val: string) => {
      setSetsData(prev => {
        const s = [...(prev[id] || [])];
        // Recorremos desde el set actual hacia abajo
        for (let i = startIndex; i < s.length; i++) {
          if (!s[i].completed) { // Solo si no está palomeado
            s[i] = { ...s[i], [field]: val };
          }
        }
        return { ...prev, [id]: s };
      });
    },

    allSetsDone: activeExercises[currentExerciseIndex] 
      ? (setsData[activeExercises[currentExerciseIndex].id] || []).every(s => s.completed) 
      : false,
    swapExercise
  };
}