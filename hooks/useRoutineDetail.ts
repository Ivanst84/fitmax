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
      
      // 1. Obtener la Rutina
      const { data: rutinaData, error: rutinaError } = await supabase
        .from('RUTINAS')
        .select('*')
        .eq('id', id)
        .single();

      if (rutinaError) throw rutinaError;

      // 2. Obtener la relación RUTINA_EJERCICIOS (Nombre exacto de tu tabla)
      const { data: relacionData, error: relacionError } = await supabase
        .from('RUTINA_EJERCICIOS')
        .select('*')
        .eq('rutina_id', id)
        .order('orden', { ascending: true });

      if (relacionError) throw relacionError;

      // 3. Obtener info de EJERCICIOS
      const ejercicioIds = relacionData.map(r => r.ejercicio_id);
      const { data: ejerciciosData, error: infoError } = await supabase
        .from('EJERCICIOS')
        .select('*')
        .in('id', ejercicioIds);

      if (infoError) throw infoError;

      // 4. Mapeo Seguro
      const formatted: RutinaEjercicios[] = relacionData.map(rel => {
        const info = ejerciciosData.find(e => e.id === rel.ejercicio_id);
        return {
          id: String(rel.id),
          rutina_id: rel.rutina_id,
          ejercicio_id: rel.ejercicio_id,
          series: rel.series || 0,
          repeticiones: String(rel.reps || '0'),
          ejercicio: info || { nombre: 'Ejercicio no encontrado', imagen_url: '' }
        };
      });

      setRutina(rutinaData);
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