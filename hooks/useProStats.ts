import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface ProStats {
  heatmap: {
    slug_en: string;
    total_series: number;
    last_trained: string;
    is_fatigued: boolean;
  }[];
  radar: {
    grupo_key: string;
    total_volumen: number;
    total_series: number;
  }[];
}

export function useProStats(daysLimit: number = 30) {
  const { session } = useAuth();
  const [stats, setStats] = useState<ProStats | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const CACHE_KEY = `pro_stats_${session?.user?.id}_${daysLimit}`;

  const fetchStats = useCallback(async (forceRefresh = false) => {
    try {
      if (!session?.user?.id) return;

      // 1. Intentar cargar desde caché local para UX instantánea
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setStats(JSON.parse(cached));
          setCargando(false);
        }
      }

      // 2. Llamada al motor SQL en Supabase (RPC)
      const { data, error: rpcError } = await supabase.rpc('get_user_stats_pro', {
        p_user_id: session.user.id,
        p_days_limit: daysLimit
      });

      if (rpcError) throw rpcError;

      if (data) {
        setStats(data);
        // 3. Persistir en caché para la próxima vez
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (err: any) {
      console.error("❌ Error en useProStats:", err.message);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [session?.user?.id, daysLimit]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, cargando, error, refresh: () => fetchStats(true) };
}