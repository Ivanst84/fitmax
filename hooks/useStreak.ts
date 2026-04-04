import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export interface StreakData {
  rachaActual: number;
  mejorRacha: number;
  entrenandoHoy: boolean;
  enRiesgo: boolean;
  mensajeEstado: string | null;
  proximoHito: number;
}

const getLocalDateString = (): string => {
  return new Date().toLocaleDateString('sv');
};

export function useStreak() {
  const [data, setData] = useState<StreakData>({
    rachaActual: 0,
    mejorRacha: 0,
    entrenandoHoy: false,
    enRiesgo: false,
    mensajeEstado: null,
    proximoHito: 7,
  });
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    try {
      setLoading(true);
      const todayLocal = getLocalDateString();
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_streak', {
        p_today: todayLocal,
      });

      if (rpcError) throw rpcError;

      setData({
        rachaActual:    rpcData.racha_actual    ?? 0,
        mejorRacha:     rpcData.mejor_racha      ?? 0,
        entrenandoHoy:  rpcData.entrenado_hoy    ?? false,
        enRiesgo:        rpcData.en_riesgo        ?? false,
        mensajeEstado:  rpcData.mensaje_estado   ?? null,
        proximoHito:    rpcData.proximo_hito      ?? 7,
      });
    } catch (e) {
      console.error('[useStreak] Error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStreak();
    }, [fetchStreak])
  );

  return { ...data, loading, refetch: fetchStreak };
}