import { useState, useEffect, useCallback } from 'react';
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

export function useStatistics() {
  const { session } = useAuth();
  const [stats, setStats] = useState<Stats>({
    volumenSemanal: [],
    progreso1RM: [],
    totalKgs: 0
  });
  const [loading, setLoading] = useState(true);

  // Mantenemos tu variable de modo desarrollador por si la ocupas en el futuro
  const DEV_MODE = false;

  const fetchStats = async () => {
    try {
      setLoading(true);

      if (!session?.user?.id) return;

      if (DEV_MODE) {
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
            totalKgs: 75200 
          });
          setLoading(false);
        }, 500);  
        return;
      }

      // 1. Total Acumulado Histórico
      const { data: historialGlobal } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('volumen_total_kg')
        .eq('user_id', session.user.id);

      const totalAcumulado = historialGlobal?.reduce((sum, item) => sum + (item.volumen_total_kg || 0), 0) || 0;

      // 2. Últimos 7 Días
      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(haceUnaSemana.getDate() - 6);
      haceUnaSemana.setHours(0, 0, 0, 0);

      const { data: historialSemana } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('created_at, volumen_total_kg') // Cambiado de 'fecha' a 'created_at' según tu base de datos actual
        .eq('user_id', session.user.id)
        .gte('created_at', haceUnaSemana.toISOString())
        .order('created_at', { ascending: true });

      // 3. Estructurar para la Gráfica
      const diasAbreviados = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const volumenPorDia: Record<string, { etiqueta: string, volumen: number }> = {};

      for (let i = 0; i <= 6; i++) {
        const fechaIteracion = new Date(haceUnaSemana);
        fechaIteracion.setDate(fechaIteracion.getDate() + i);
        const fechaString = fechaIteracion.toISOString().split('T')[0]; 
        const nombreDia = diasAbreviados[fechaIteracion.getDay()]; 
        
        volumenPorDia[fechaString] = {
            etiqueta: nombreDia,
            volumen: 0
        };
      }

      if (historialSemana) {
        historialSemana.forEach(sesion => {
          // Tu DB usa created_at, si usaba fecha cambialo aquí
          const fechaSesion = new Date(sesion.created_at).toISOString().split('T')[0];
          if (volumenPorDia[fechaSesion]) {
            volumenPorDia[fechaSesion].volumen += (sesion.volumen_total_kg || 0);
          }
        });
      }

      const arregloGrafica: DiaVolumen[] = Object.values(volumenPorDia).map(dia => ({
        fecha: dia.etiqueta,
        valor: dia.volumen
      }));

      setStats({
        volumenSemanal: arregloGrafica,
        progreso1RM: [], // Lo dejamos vacío para futuras implementaciones
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