// Ruta: hooks/useRoutines.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Rutina } from '../types/database.types';

interface UseRoutinesResult {
  rutinas: Rutina[];
  cargando: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRoutines(): UseRoutinesResult {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Usamos useCallback para evitar re-renderizados innecesarios y 
  // permitir que 'refetch' se use como dependencia de forma segura.
  const fetchRutinas = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('RUTINAS')
        .select('*')
        .order('dia_semana', { ascending: true });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setRutinas(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar rutinas';
      console.error('❌ Error en useRoutines:', errorMessage);
      setError('No pudimos cargar tus rutinas. Revisa tu conexión.');
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial automática
  useEffect(() => {
    fetchRutinas();
  }, [fetchRutinas]);

  return {
    rutinas,
    cargando,
    error,
    refetch: fetchRutinas,
  };
}