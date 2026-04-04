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

      // ======================================================================
      // 🚀 LLAMADA A LA SÚPER FUNCIÓN (RPC)
      // ======================================================================
      const { data: homeData, error: rpcError } = await supabase.rpc('get_home_data', {
        p_week_start: lunes.toISOString()
      });

      if (rpcError) throw rpcError;

      // Extraemos los datos del "Combo" de Claude
      const perfil = homeData.perfil;
      const todasLasRutinas = homeData.rutinas || [];
      const completadasSemana = homeData.rutinas_completadas_semana || [];

      // 1. Configuración del perfil
      const nivelId = perfil?.nivel || 1;
      const objetivoId = perfil?.objetivo || 1;
      const diasElegidos: number[] = perfil?.dias_entrenamiento || [1, 2, 3, 4, 5];
      diasElegidos.sort((a, b) => a - b);

      // 2. Clasificar rutinas (Sistema vs Propias)
      const rutinasSistema = todasLasRutinas.filter((r: any) => 
        r.user_id === null && r.nivel_id === nivelId && r.objetivo_id === objetivoId
      );
      const rutinasPropias = todasLasRutinas.filter((r: any) => 
        r.user_id !== null
      ).sort((a: any, b: any) => (a.dia_semana || 0) - (b.dia_semana || 0));

      const poolRutinas = rutinasPropias.length > 0 ? rutinasPropias : rutinasSistema;

      // ======================================================================
      // 📅 CONSTRUIR EL CALENDARIO DE LA SEMANA
      // ======================================================================
      const semanaGenerada: RutinaSemana[] = [];
      let indexPool = 0;

      for (let dia = 1; dia <= 7; dia++) {
        const esDiaEntrenamiento = diasElegidos.includes(dia);

        if (!esDiaEntrenamiento) {
          semanaGenerada.push({
            id: `rest-${dia}`, nombre: 'Día de Descanso', dia_real_asignado: dia,
            isRest: true, isEmpty: false, isCustom: false
          });
          continue;
        }

        if (poolRutinas.length > 0) {
          const rutina = poolRutinas[indexPool % poolRutinas.length];
          semanaGenerada.push({
            ...rutina, dia_real_asignado: dia, isRest: false, isEmpty: false, isCustom: rutinasPropias.length > 0
          });
          indexPool++;
        } else {
          semanaGenerada.push({
            id: `empty-${dia}`, nombre: 'Entrenamiento Libre', dia_real_asignado: dia,
            isRest: false, isEmpty: true, isCustom: false
          });
        }
      }
      setRutinas(semanaGenerada);

      // ======================================================================
      // 🎯 ASIGNAR EL ENTRENAMIENTO DE HOY
      // ======================================================================
      const esHoyEntrenamiento = diasElegidos.includes(diaHoyISO);

      if (!esHoyEntrenamiento) {
        setRutinaHoy(semanaGenerada.find(r => r.dia_real_asignado === diaHoyISO) || null);
      } else {
        if (poolRutinas.length > 0) {
          // Buscamos la primera que no esté en la lista de completadas traída por el RPC
          const siguientePendiente = poolRutinas.find((r: any) => !completadasSemana.includes(r.id)) || poolRutinas[0];

          setRutinaHoy({
            ...siguientePendiente,
            dia_real_asignado: diaHoyISO,
            isRest: false,
            isEmpty: false,
            isCustom: rutinasPropias.length > 0
          });
        } else {
          setRutinaHoy(semanaGenerada.find(r => r.dia_real_asignado === diaHoyISO) || null);
        }
      }

    } catch (err) {
      console.error("❌ Error en useRoutines:", err);
      setError('Error al cargar la semana.');
    } finally {
      setCargando(false);
    }
  }, [diaHoyISO]);

  useEffect(() => { fetchRutinas(); }, [fetchRutinas]);

  return { rutinas, rutinaHoy, nombreHoy, cargando, error, refetch: fetchRutinas };
}