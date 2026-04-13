import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Rutina } from '../types/database.types';

const NOMBRE_DIA: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
};

const obtenerDiaBd = (diaJs: number) => (diaJs === 0 ? 7 : diaJs);

export interface RutinaSemana extends Partial<Rutina> {
  dia_real_asignado: number;
  isRest: boolean;
  isEmpty: boolean;
  isCustom: boolean;
}

export function useRoutines() {
  const [rutinas, setRutinas] = useState<RutinaSemana[]>([]);
  const [rutinaHoy, setRutinaHoy] = useState<RutinaSemana | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStats, setWeekStats] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);

  // 🚀 FIX #6: El escudo anti-memory leaks (mucho mejor que el isActive de Claude)
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const diaJs = new Date().getDay();
  const nombreHoy = NOMBRE_DIA[diaJs];
  const diaHoyISO = obtenerDiaBd(diaJs);

  const fetchRutinas = useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setCargando(true);
        setError(null);
      }

      const hoyFecha = new Date();
      const diaSemanaAct = hoyFecha.getDay() || 7;
      const lunes = new Date(hoyFecha);
      lunes.setDate(hoyFecha.getDate() - diaSemanaAct + 1);
      lunes.setHours(0, 0, 0, 0);

      const { data: homeData, error: rpcError } = await supabase.rpc('get_home_data', {
        p_week_start: lunes.toISOString()
      });

      if (rpcError) throw rpcError;

      if (isMountedRef.current) {
        setWeekStats(homeData.stats_semana ?? null);
        setPerfil(homeData.perfil ?? null);
      }

      const perfilData = homeData.perfil;
      const todasLasRutinas = homeData.rutinas || [];
      const diasElegidos: number[] = perfilData?.dias_entrenamiento || [1, 2, 3, 4, 5];
      const poolRutinas = [...todasLasRutinas];

      const semanaGenerada: RutinaSemana[] = [];
      let nextFillIndex = 0;

      for (let dia = 1; dia <= 7; dia++) {
        const rutinaAsignada = poolRutinas.find(r => r.dia_semana === dia);

        if (rutinaAsignada) {
          semanaGenerada.push({
            ...rutinaAsignada, dia_real_asignado: dia, isRest: false, isEmpty: false, isCustom: rutinaAsignada.user_id !== null
          });
          continue;
        }

        const esDiaEntrenamiento = diasElegidos.includes(dia);

        if (!esDiaEntrenamiento) {
          semanaGenerada.push({
            id: `rest-${dia}`, nombre: 'Día de Descanso', dia_real_asignado: dia, isRest: true, isEmpty: false, isCustom: false
          });
          continue;
        }

        const poolRelleno = poolRutinas.filter(r => !r.dia_semana || r.dia_semana === 0);
        const fuenteRelleno = poolRelleno.length > 0 ? poolRelleno : poolRutinas;

        if (fuenteRelleno.length > 0) {
          const rutinaRelleno = fuenteRelleno[nextFillIndex % fuenteRelleno.length];
          semanaGenerada.push({
            ...rutinaRelleno, dia_real_asignado: dia, isRest: false, isEmpty: false, isCustom: rutinaRelleno.user_id !== null
          });
          nextFillIndex++;
        } else {
          semanaGenerada.push({
            id: `empty-${dia}`, nombre: 'Día Libre', dia_real_asignado: dia, isRest: false, isEmpty: true, isCustom: false
          });
        }
      }
      
      const rutinaAsignadaHoy = semanaGenerada.find(r => r.dia_real_asignado === diaHoyISO);

      if (isMountedRef.current) {
        setRutinas(semanaGenerada);
        if (rutinaAsignadaHoy && !rutinaAsignadaHoy.isRest && !rutinaAsignadaHoy.isEmpty) {
          setRutinaHoy(rutinaAsignadaHoy);
        } else {
          setRutinaHoy(rutinaAsignadaHoy || null);
        }
      }

    } catch (err: any) {
      console.error("❌ Error en useRoutines:", err.message);
      if (isMountedRef.current) setError('Error al cargar la planificación semanal.');
    } finally {
      if (isMountedRef.current) setCargando(false);
    }
  }, [diaHoyISO]);

  useEffect(() => { 
    fetchRutinas(); 
  }, [fetchRutinas]);

  return { 
    rutinas, rutinaHoy, nombreHoy, cargando, error, refetch: fetchRutinas, weekStats, perfil
  };
}