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

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('No sesión');

      // 1. Traer perfil
      const { data: perfil } = await supabase
        .from('USUARIOS')
        .select('nivel, objetivo, dias_entrenamiento')
        .eq('id', user.id)
        .single();

      const nivelId = perfil?.nivel || 1;
      const objetivoId = perfil?.objetivo || 1;
      const diasElegidos: number[] = perfil?.dias_entrenamiento || [1, 2, 3, 4, 5]; // Fallback
      diasElegidos.sort((a, b) => a - b);

      // 2. Traer rutinas de IA (Propias) y del Sistema
      const { data, error: supabaseError } = await supabase
        .from('RUTINAS')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      if (supabaseError) throw new Error(supabaseError.message);

      const rutinasSistema = (data || []).filter(r => r.user_id === null && r.nivel_id === nivelId && r.objetivo_id === objetivoId);
      
      // ORDENAMOS las rutinas creadas por la IA (Día 1, Día 2, etc.)
      const rutinasPropias = (data || []).filter(r => r.user_id === user.id).sort((a, b) => (a.dia_semana || 0) - (b.dia_semana || 0));

      // El "Pool" o lista de rutinas a usar (Prioridad a las de la IA)
      const poolRutinas = rutinasPropias.length > 0 ? rutinasPropias : rutinasSistema;

      // ======================================================================
      // 🚀 MAGIA: LÓGICA DE PROGRESIÓN (Para que el Viernes sea Día 1)
      // ======================================================================
      
      // A. Buscamos qué rutinas YA HIZO el usuario esta semana
      const hoyFecha = new Date();
      const diaSemanaAct = hoyFecha.getDay() || 7;
      const lunes = new Date(hoyFecha);
      lunes.setDate(hoyFecha.getDate() - diaSemanaAct + 1);
      lunes.setHours(0, 0, 0, 0);

      const { data: historial } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('rutina_id')
        .eq('user_id', user.id)
        .gte('created_at', lunes.toISOString());

      // Lista de IDs de rutinas que ya terminó esta semana
      const completadasSemana = historial?.map(h => h.rutina_id) || [];

      // ======================================================================
      // 📅 CONSTRUIR EL CALENDARIO DE LA SEMANA (Para la pestaña Rutinas)
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
      // 🎯 ASIGNAR EL ENTRENAMIENTO DE HOY (Home Screen)
      // ======================================================================
      const esHoyEntrenamiento = diasElegidos.includes(diaHoyISO);

      if (!esHoyEntrenamiento) {
        // Si hoy no se entrena, le marcamos descanso
        setRutinaHoy(semanaGenerada.find(r => r.dia_real_asignado === diaHoyISO) || null);
      } else {
        // ¡HOY SE ENTRENA! Buscamos la PRIMERA rutina que no haya completado esta semana
        if (poolRutinas.length > 0) {
          const siguientePendiente = poolRutinas.find(r => !completadasSemana.includes(r.id)) || poolRutinas[0]; // Si ya hizo todas, repite la primera

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
      console.error(err);
      setError('Error al cargar la semana.');
    } finally {
      setCargando(false);
    }
  }, [diaHoyISO]);

  useEffect(() => { fetchRutinas(); }, [fetchRutinas]);

  return { rutinas, rutinaHoy, nombreHoy, cargando, error, refetch: fetchRutinas };
}