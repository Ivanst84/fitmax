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

      const { data: perfil } = await supabase
        .from('USUARIOS')
        .select('nivel, objetivo, dias_entrenamiento')
        .eq('id', user.id)
        .single();

      const nivelId = perfil?.nivel || 1;
      const objetivoId = perfil?.objetivo || 1;
      const diasElegidos: number[] = perfil?.dias_entrenamiento || [];
      diasElegidos.sort((a, b) => a - b);

      const { data, error: supabaseError } = await supabase
        .from('RUTINAS')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user.id}`);

      if (supabaseError) throw new Error(supabaseError.message);

      const rutinasSistema = (data || []).filter(
        r => r.user_id === null && r.nivel_id === nivelId && r.objetivo_id === objetivoId
      );
      const rutinasPropias = (data || []).filter(r => r.user_id === user.id);

      const semanaGenerada: RutinaSemana[] = [];
      let indexSistema = 0;

      // Construimos los 7 días exactos
      for (let dia = 1; dia <= 7; dia++) {
        const esDiaEntrenamiento = diasElegidos.includes(dia);
        const rutinaPropiaDelDia = rutinasPropias.find(r => r.dia_semana === dia);

        // 1. PRIORIDAD ABSOLUTA: Rutina Creada por el Usuario
        if (rutinaPropiaDelDia) {
          semanaGenerada.push({
            ...rutinaPropiaDelDia,
            dia_real_asignado: dia,
            isRest: false,
            isEmpty: false,
            isCustom: true
          });
          continue;
        }

        // 2. DÍA DE DESCANSO
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

        // 3. RUTINA DEL SISTEMA CON LOOP INFINITO (Magia)
        if (rutinasSistema.length > 0) {
          const rutinaSistemaDisponible = rutinasSistema[indexSistema % rutinasSistema.length];
          semanaGenerada.push({
            ...rutinaSistemaDisponible,
            dia_real_asignado: dia,
            isRest: false,
            isEmpty: false,
            isCustom: false
          });
          indexSistema++;
          continue;
        }

        // 4. SI LA BASE DE DATOS NO TIENE NADA (Fallback de seguridad)
        semanaGenerada.push({
          id: `empty-${dia}`,
          nombre: 'Entrenamiento Libre',
          dia_real_asignado: dia,
          isRest: false,
          isEmpty: true,
          isCustom: false
        });
      }

      setRutinas(semanaGenerada);
      const hoy = semanaGenerada.find(r => r.dia_real_asignado === diaHoyISO) || null;
      setRutinaHoy(hoy);

    } catch (err) {
      setError('Error al cargar la semana.');
    } finally {
      setCargando(false);
    }
  }, [diaHoyISO]);

  useEffect(() => { fetchRutinas(); }, [fetchRutinas]);

  return { rutinas, rutinaHoy, nombreHoy, cargando, error, refetch: fetchRutinas };
}