import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useStreak() {
  const { session } = useAuth();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      calculateStreak();
    }
  }, [session]);

  const calculateStreak = async () => {
    try {
      setLoading(true);
      
      // 🚀 CORRECCIÓN: Usamos la columna 'fecha' en lugar de 'created_at'
      const { data, error } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('fecha')
        .eq('user_id', session?.user?.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        setStreak(0);
        return;
      }

      // 2. Normalizar fechas a formato YYYY-MM-DD y eliminar duplicados
      // Usamos 'fecha' que es el nombre real en tu tabla
      const uniqueDates = Array.from(
        new Set(data.map(s => s.fecha.split('T')[0]))
      );

      if (uniqueDates.length === 0) {
        setStreak(0);
        return;
      }

      // 3. Lógica de conteo
      let currentStreak = 0;
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Si no entrenó ni hoy ni ayer, la racha se rompió
      if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
        setStreak(0);
        return;
      }

      // 4. Empezamos a contar desde el día más reciente que entrenó
      // Si entrenó hoy, empezamos desde hoy. Si no, desde ayer.
      let checkDate = uniqueDates.includes(todayStr) ? today : yesterday;
      
      for (let i = 0; i < 365; i++) {
        const checkStr = checkDate.toISOString().split('T')[0];
        
        if (uniqueDates.includes(checkStr)) {
          currentStreak++;
          // Restamos un día para la siguiente iteración
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break; // Hueco encontrado
        }
      }

      setStreak(currentStreak);
    } catch (err) {
      console.error('❌ Error calculando racha:', err);
      setStreak(0);
    } finally {
      setLoading(false);
    }
  };

  return { streak, loading, refetchStreak: calculateStreak };
}