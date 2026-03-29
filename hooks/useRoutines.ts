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

  const fetchRutinas = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      // 1. Obtenemos la sesión del usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('No se encontró sesión activa.');

      // 2. Obtenemos el perfil para saber su nivel y objetivo
      const { data: perfil, error: perfilError } = await supabase
        .from('USUARIOS')
        .select('nivel, objetivo')
        .eq('id', user.id)
        .single();

      if (perfilError) throw new Error('No se pudo obtener el perfil del usuario.');

      // 3. Filtramos las rutinas EXACTAS para este usuario
      // Usamos el nivel y objetivo del perfil. Si por alguna razón no los tiene, usamos 1 por defecto.
      const { data, error: supabaseError } = await supabase
        .from('RUTINAS')
        .select('*')
        .eq('nivel_id', perfil.nivel || 1) 
        .eq('objetivo_id', perfil.objetivo || 1) 
        .order('dia_semana', { ascending: true });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setRutinas(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar rutinas';
      console.error('❌ Error en useRoutines:', errorMessage);
      setError('No pudimos cargar tus rutinas personalizadas. Revisa tu conexión.');
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