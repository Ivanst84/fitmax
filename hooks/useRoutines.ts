import { useState, useEffect, useCallback } from 'react';
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

  const diaJs = new Date().getDay();
  const nombreHoy = NOMBRE_DIA[diaJs];
  const diaHoyISO = obtenerDiaBd(diaJs);

  const fetchRutinas = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      // A. Calcular inicio de semana (Lunes 00:00)
      const hoyFecha = new Date();
      const diaSemanaAct = hoyFecha.getDay() || 7;
      const lunes = new Date(hoyFecha);
      lunes.setDate(hoyFecha.getDate() - diaSemanaAct + 1);
      lunes.setHours(0, 0, 0, 0);

      // B. Llamada al RPC de Supabase
      const { data: homeData, error: rpcError } = await supabase.rpc('get_home_data', {
        p_week_start: lunes.toISOString()
      });

      if (rpcError) throw rpcError;

      const perfil = homeData.perfil;
      const todasLasRutinas = homeData.rutinas || [];
      const completadasSemana = homeData.rutinas_completadas_semana || [];

      const diasElegidos: number[] = perfil?.dias_entrenamiento || [1, 2, 3, 4, 5];
      
      // Ordenamos el pool para tener consistencia
      const poolRutinas = [...todasLasRutinas];

      // ======================================================================
      // 📅 CONSTRUIR EL CALENDARIO DE LA SEMANA (7 DÍAS)
      // ======================================================================
      const semanaGenerada: RutinaSemana[] = [];
      let nextFillIndex = 0;

      for (let dia = 1; dia <= 7; dia++) {
        // 1. PRIORIDAD MÁXIMA: ¿Hay una rutina asignada específicamente a este día (1-7)?
        const rutinaAsignada = poolRutinas.find(r => r.dia_semana === dia);

        if (rutinaAsignada) {
          semanaGenerada.push({
            ...rutinaAsignada,
            dia_real_asignado: dia,
            isRest: false,
            isEmpty: false,
            isCustom: rutinaAsignada.user_id !== null
          });
          continue;
        }

        // 2. Si no hay rutina fija, miramos si es día de descanso en el perfil
        const esDiaEntrenamiento = diasElegidos.includes(dia);

        if (!esDiaEntrenamiento) {
          semanaGenerada.push({
            id: `rest-${dia}`, 
            nombre: 'Día de Descanso', 
            dia_real_asignado: dia,
            isRest: true, 
            isEmpty: false, 
            isCustom: false
          });
          continue;
        }

        // 3. Es día de entrenamiento pero no hay rutina fija: Rellenamos con el pool
        // Filtramos las que NO tienen día fijo para usarlas de relleno
        const poolRelleno = poolRutinas.filter(r => !r.dia_semana || r.dia_semana === 0);
        const fuenteRelleno = poolRelleno.length > 0 ? poolRelleno : poolRutinas;

        if (fuenteRelleno.length > 0) {
          const rutinaRelleno = fuenteRelleno[nextFillIndex % fuenteRelleno.length];
          semanaGenerada.push({
            ...rutinaRelleno,
            dia_real_asignado: dia,
            isRest: false,
            isEmpty: false,
            isCustom: rutinaRelleno.user_id !== null
          });
          nextFillIndex++;
        } else {
          // Si de plano no hay nada en la base de datos
          semanaGenerada.push({
            id: `empty-${dia}`, 
            nombre: 'Día Libre', 
            dia_real_asignado: dia,
            isRest: false, 
            isEmpty: true, 
            isCustom: false
          });
        }
      }
      
      setRutinas(semanaGenerada);

      // ======================================================================
      // 🎯 ASIGNAR EL ENTRENAMIENTO DE HOY
      // ======================================================================
      const rutinaAsignadaHoy = semanaGenerada.find(r => r.dia_real_asignado === diaHoyISO);
      
      if (rutinaAsignadaHoy && !rutinaAsignadaHoy.isRest && !rutinaAsignadaHoy.isEmpty) {
        // Si hoy hay una rutina (ya sea fija o de relleno), es la de hoy
        setRutinaHoy(rutinaAsignadaHoy);
      } else {
        // Si hoy es descanso pero hay rutinas pendientes en la semana, 
        // podríamos sugerir la siguiente (opcional), pero por ahora respetamos el calendario
        setRutinaHoy(rutinaAsignadaHoy || null);
      }

    } catch (err: any) {
      console.error("❌ Error en useRoutines:", err.message);
      setError('Error al cargar la planificación semanal.');
    } finally {
      setCargando(false);
    }
  }, [diaHoyISO]);

  useEffect(() => { 
    fetchRutinas(); 
  }, [fetchRutinas]);

  return { 
    rutinas, 
    rutinaHoy, 
    nombreHoy, 
    cargando, 
    error, 
    refetch: fetchRutinas 
  };
}