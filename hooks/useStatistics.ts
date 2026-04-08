import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface DiaVolumen {
  fecha: string;
  valor: number;
}

interface Stats {
  volumenSemanal: DiaVolumen[];
  progreso1RM: any[];
  totalKgs: number;
}

// 🛡️ Extrae la fecha local exacta
const formatearFechaLocal = (fecha: Date) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function useStatistics() {
  const { session } = useAuth();
  const [stats, setStats] = useState<Stats>({
    volumenSemanal: [],
    progreso1RM: [],
    totalKgs: 0
  });
  const [loading, setLoading] = useState(true);

  const DEV_MODE = false;

  const fetchStats = async () => {
    try {
      setLoading(true);
      if (!session?.user?.id) return;

      // 1. Total Acumulado Histórico
      const { data: historialGlobal } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('volumen_total_kg')
        .eq('user_id', session.user.id);

      const totalAcumulado = historialGlobal?.reduce((sum, item) => sum + (item.volumen_total_kg || 0), 0) || 0;

      // 2. Últimos 7 Días
   // 2. Últimos 7 Días
      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(haceUnaSemana.getDate() - 6);
      haceUnaSemana.setHours(0, 0, 0, 0);

      // 🛡️ FIX: Cambiamos 'created_at' por 'fecha' en las 3 líneas
      const { data: historialSemana, error: errorSemana } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('fecha, volumen_total_kg') 
        .eq('user_id', session.user.id)
        .gte('fecha', haceUnaSemana.toISOString())
        .order('fecha', { ascending: true });

      if (errorSemana) {
        console.log("🚨 ERROR DE SUPABASE:", errorSemana.message);
      }
      console.log("📊 Sesiones de los últimos 7 días:", historialSemana);

      // 3. Estructurar para la Gráfica (Garantizando orden cronológico)
      const diasAbreviados = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const arregloGrafica: DiaVolumen[] = [];
      const mapaVolumen: Record<string, number> = {};

      for (let i = 0; i <= 6; i++) {
        const d = new Date(haceUnaSemana);
        d.setDate(d.getDate() + i);
        const fechaStr = formatearFechaLocal(d);
        const nombreDia = diasAbreviados[d.getDay()];
        
        mapaVolumen[fechaStr] = 0;
        arregloGrafica.push({ fecha: nombreDia, valor: 0, ...{_fechaStr: fechaStr} }); 
      }

      if (historialSemana) {
        historialSemana.forEach(sesion => {
          // 🛡️ FIX: Ahora leemos 'sesion.fecha' directamente
          const dateVal = sesion.fecha; 
          if (!dateVal) return;
          
          const fechaLimpia = dateVal.length === 10 ? `${dateVal}T12:00:00Z` : dateVal;
          const fechaSesionObj = new Date(fechaLimpia);
          const fStr = formatearFechaLocal(fechaSesionObj);
          
          if (mapaVolumen[fStr] !== undefined) {
            mapaVolumen[fStr] += (sesion.volumen_total_kg || 0);
          }
        });
      }
      // Asignar los valores calculados al arreglo final
      const graficaFinal = arregloGrafica.map(item => ({
        fecha: item.fecha,
        valor: mapaVolumen[(item as any)._fechaStr]
      }));

      console.log("📈 Gráfica final a dibujar:", graficaFinal);

      setStats({
        volumenSemanal: graficaFinal,
        progreso1RM: [], 
        totalKgs: totalAcumulado
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      if (!DEV_MODE) setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [session?.user?.id])
  );

  return { stats, loading, refetch: fetchStats };
}