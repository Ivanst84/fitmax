import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Rutina } from '../types/database.types';

interface UseRoutineDetailResult {
  rutina: Rutina | null;
  ejercicios: any[];
  cargando: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRoutineDetail(id: string | undefined): UseRoutineDetailResult {
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;

    try {
      setCargando(true);
      setError(null);

      // 🔍 Consulta ajustada a tu SQL REAL (Sin imagen_url porque no existe en tu tabla)
      const { data, error: fetchError } = await supabase
        .from('RUTINAS')
        .select(`
          *,
          RUTINA_EJERCICIOS (
            id,
            rutina_id,
            ejercicio_id,
            series,
            reps,
            orden,
            descanso_seg,
            es_calentamiento,
            EJERCICIOS (
              nombre,
              descripcion,
              video_url,
              duracion_seg,
              es_por_tiempo,
              equipo_id
            )
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 1. Desestructuramos la respuesta (Mayúsculas de la DB)
      const { RUTINA_EJERCICIOS, ...rutinaData } = (data as any) || {};

      // 2. Mapeo al formato que tu pantalla RoutineDetailScreen ya usa
      const formatted = (RUTINA_EJERCICIOS || [])
        .sort((a: any, b: any) => a.orden - b.orden)
        .map((rel: any) => ({
          id: String(rel.id),
          rutina_id: rel.rutina_id,
          ejercicio_id: rel.ejercicio_id,
          series: rel.series || 0,
          repeticiones: String(rel.reps || '0'), // Mapeo reps -> repeticiones
          descanso_seg: rel.descanso_seg || 60,
          es_calentamiento: rel.es_calentamiento || false,
          // Unimos los datos del ejercicio hijo al objeto esperado por la UI
          ejercicio: rel.EJERCICIOS || { 
            nombre: 'Cargando ejercicio...', 
            imagen_url: null // Placeholder ya que no tienes columna de imagen
          }
        }));

      setRutina(rutinaData as Rutina);
      setEjercicios(formatted);

    } catch (err: any) {
      console.error('❌ Error en useRoutineDetail:', err.message);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { rutina, ejercicios, cargando, error, refetch: fetchDetail };
}