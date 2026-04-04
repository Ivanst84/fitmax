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

      // 1. Traer Rutina
      const { data: rutinaData, error: rutinaError } = await supabase
        .from('RUTINAS')
        .select('*')
        .eq('id', id)
        .single();

      if (rutinaError) throw rutinaError;

      // 2. Traer Relaciones (RUTINA_EJERCICIOS)
      const { data: relaciones, error: relError } = await supabase
        .from('RUTINA_EJERCICIOS')
        .select(`
          id,
          rutina_id,
          ejercicio_id,
          series,
          reps,
          orden,
          descanso_seg,
          es_calentamiento,
          EJERCICIOS (*)
        `)
        .eq('rutina_id', id);

      if (relError) throw relError;

      // 🔍 DEBUG: Mira esto en tu terminal de VS Code / Metro
      console.log('--- RELACIONES ENCONTRADAS:', relaciones?.length);

      // 3. Mapeo Resiliente
      const formatted = (relaciones || [])
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        .map((rel: any) => {
          // 🛡️ El truco: Buscamos el objeto EJERCICIOS sin importar si viene en mayúsculas o minúsculas
          const infoCatalogo = rel.EJERCICIOS || rel.ejercicios;

          return {
            id: String(rel.id),
            rutina_id: rel.rutina_id,
            ejercicio_id: rel.ejercicio_id,
            series: rel.series || 0,
            repeticiones: String(rel.reps || '0'),
            descanso_seg: rel.descanso_seg || 60,
            es_calentamiento: rel.es_calentamiento || false,
            ejercicio: infoCatalogo || { 
              nombre: 'No encontrado en catálogo', 
              descripcion: '',
              video_url: null
            }
          };
        });

      setRutina(rutinaData as Rutina);
      setEjercicios(formatted);

    } catch (err: any) {
      console.error('❌ Error detallado en useRoutineDetail:', err.message);
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