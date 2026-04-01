import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useStatistics() {
  const { session } = useAuth();
  const [stats, setStats] = useState({
    volumenSemanal: [] as { fecha: string, valor: number }[],
    progreso1RM: [] as { fecha: string, valor: number }[],
    totalKgs: 0
  });
  const [loading, setLoading] = useState(true);

  // 🚀 MODO DESARROLLADOR: Cambia a "false" cuando quieras usar datos reales de la BD
  const DEV_MODE = true; 

  useEffect(() => {
    if (session?.user?.id) fetchStats();
  }, [session]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      if (DEV_MODE) {
        // 🚀 DATOS FALSOS PARA PROBAR EL DISEÑO VISUAL
        setTimeout(() => {
          setStats({
            volumenSemanal: [
              { fecha: 'Sem 1', valor: 12500 },
              { fecha: 'Sem 2', valor: 14200 },
              { fecha: 'Sem 3', valor: 13800 },
              { fecha: 'Sem 4', valor: 16500 },
              { fecha: 'Esta Sem', valor: 18200 },
            ],
            progreso1RM: [],
            totalKgs: 75200 // Casi 15 elefantes 🐘
          });
          setLoading(false);
        }, 500); // Simulamos un pequeño tiempo de carga de red
        return;
      }

      // --- LÓGICA REAL PARA PRODUCCIÓN ---
      const { data: sesiones } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('fecha, volumen_total_kg')
        .eq('user_id', session?.user?.id)
        .order('fecha', { ascending: true })
        .limit(20);

      // Procesamiento real de datos
      const volumenData = sesiones?.map(s => ({
        fecha: new Date(s.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
        valor: s.volumen_total_kg || 0
      })) || [];

      setStats({
        volumenSemanal: volumenData,
        progreso1RM: [],
        totalKgs: sesiones?.reduce((acc, curr) => acc + (curr.volumen_total_kg || 0), 0) || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      if (!DEV_MODE) setLoading(false);
    }
  };

  return { stats, loading };
}