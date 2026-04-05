import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

// Definimos la forma de los datos que vienen del SQL
interface PeriodizationData {
  fase_actual: string;
  sesiones_historicas: number;
  volumen_actual: number;
  volumen_anterior: number;
  plateau_detectado: boolean;
  mensaje_coach: string;
}

export function usePeriodization() {
  const [data, setData] = useState<PeriodizationData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPeriodization = useCallback(async () => {
    try {
      setLoading(true);
      // 🚀 Llamamos a nuestra nueva función inteligente
      const { data: rpcData, error } = await supabase.rpc('get_estado_periodizacion');
      
      if (error) throw error;
      setData(rpcData);
    } catch (e) {
      console.error("❌ Error en usePeriodization:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Recargar datos cada vez que el usuario vea el Home
  useFocusEffect(
    useCallback(() => {
      fetchPeriodization();
    }, [fetchPeriodization])
  );

  return { data, loading, refetch: fetchPeriodization };
}