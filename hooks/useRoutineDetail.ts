// Ruta: hooks/useRoutineDetail.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Rutina, RutinaEjercicios } from '../types/database.types';

interface UseRoutineDetailResult {
  rutina: Rutina | null;
  ejercicios: RutinaEjercicios[];
  cargando: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRoutineDetail(id: string | undefined): UseRoutineDetailResult {
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [ejercicios, setEjercicios] = useState<RutinaEjercicios[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;

    try {
      setCargando(true);
      setError(null);

      // 🚀 Magia Arquitectónica: 1 sola petición a la base de datos (JOIN Relacional)
      // Pedimos la rutina y, entre paréntesis, le decimos que traiga sus hijos y los detalles de los hijos.
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
            EJERCICIOS (
              nombre,
              descripcion,
              video_url,
              duracion_seg
            )
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 1. Separamos la rutina de sus ejercicios para mantener tu interfaz intacta
      const { RUTINA_EJERCICIOS, ...rutinaData } = data;

      // 2. Mapeamos al formato que tu UI ya espera y ordenamos por la columna 'orden'
      const formatted: RutinaEjercicios[] = (RUTINA_EJERCICIOS || [])
        .sort((a: any, b: any) => a.orden - b.orden)
        .map((rel: any) => ({
          id: String(rel.id),
          rutina_id: rel.rutina_id,
          ejercicio_id: rel.ejercicio_id,
          series: rel.series || 0,
          repeticiones: String(rel.reps || '0'),
          // Extraemos la información anidada del JOIN
          ejercicio: rel.EJERCICIOS || { nombre: 'Ejercicio no encontrado', imagen_url: '' }
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