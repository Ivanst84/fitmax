/**
 * lib/offlineQueue.ts
 *
 * PROBLEMA RESUELTO: Si el usuario termina un entreno sin internet,
 * el insert de Supabase falla y pierde 45 minutos de datos.
 *
 * SOLUCIÓN: Cola de persistencia local con AsyncStorage.
 * - Al guardar, primero intentamos Supabase.
 * - Si falla (offline o error), guardamos en AsyncStorage.
 * - Al recuperar conexión, procesamos la cola y subimos los pendientes.
 * - El usuario ve un indicador "Guardando cuando haya conexión".
 *
 * INSTALACIÓN REQUERIDA:
 *   npx expo install @react-native-community/netinfo
 *
 * ESTRUCTURA DE LA COLA EN ASYNCSTORAGE:
 *   Key: "FITMAX_SESSION_QUEUE"
 *   Value: JSON.stringify(PendingSession[])
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  user_id: string;
  rutina_id: string;
  nombre_rutina: string;
  duracion_segundos: number;
  volumen_total_kg: number;
  sets_completados: number;
  calorias_quemadas: number;
}

export interface ExerciseLogPayload {
  user_id: string;
  ejercicio_id: string;
  nombre_ejercicio: string;
  series_json: { reps: number; kg: number; completed: boolean }[];
}

interface PendingSession {
  id: string; // UUID local para idempotencia
  queuedAt: number; // timestamp
  session: SessionPayload;
  exerciseLogs: ExerciseLogPayload[];
  retryCount: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const QUEUE_KEY = 'FITMAX_SESSION_QUEUE';
const MAX_RETRY_ATTEMPTS = 5; // Después de 5 intentos fallidos, descartamos (evita queue infinita)
const MAX_QUEUE_SIZE = 20; // Máximo 20 sesiones pendientes (protección contra corrupción)

// ─── Utilidades internas ──────────────────────────────────────────────────────

const generateLocalId = (): string => {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const readQueue = async (): Promise<PendingSession[]> => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = async (queue: PendingSession[]): Promise<void> => {
  // Limitamos el tamaño para evitar corrupción en dispositivos con poco storage
  const trimmed = queue.slice(-MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
};

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Intenta guardar una sesión en Supabase.
 * Si no hay conexión, la encola en AsyncStorage.
 *
 * @returns { success: boolean, queued: boolean }
 *   success = true si se guardó en Supabase
 *   queued  = true si se guardó offline (para mostrar aviso en UI)
 */
export const saveSessionWithFallback = async (
  session: SessionPayload,
  exerciseLogs: ExerciseLogPayload[]
): Promise<{ success: boolean; queued: boolean; sessionId?: string }> => {
  // 1. Verificamos conectividad ANTES de intentar
  const netState = await NetInfo.fetch();
  const isConnected = netState.isConnected && netState.isInternetReachable;

  if (isConnected) {
    // 2. Intentamos guardar directamente en Supabase
    const result = await uploadSessionToSupabase(session, exerciseLogs);

    if (result.success) {
      return { success: true, queued: false, sessionId: result.sessionId };
    }

    // Si Supabase devuelve error aunque haya conexión (ej: error de FK),
    // lo encolamos para no perder los datos.
    console.warn('[OfflineQueue] Supabase error con red activa. Encolando...');
  }

  // 3. Sin conexión o con error: guardamos localmente
  const localId = generateLocalId();
  const pending: PendingSession = {
    id: localId,
    queuedAt: Date.now(),
    session,
    exerciseLogs,
    retryCount: 0,
  };

  const queue = await readQueue();
  queue.push(pending);
  await writeQueue(queue);

  console.log(`[OfflineQueue] Sesión encolada offline. ID: ${localId}. Total en cola: ${queue.length}`);

  return { success: false, queued: true };
};

/**
 * Sube una sesión directamente a Supabase.
 * Función interna reutilizada tanto por el guardado directo como por el procesamiento de la cola.
 */
const uploadSessionToSupabase = async (
  session: SessionPayload,
  exerciseLogs: ExerciseLogPayload[]
): Promise<{ success: boolean; sessionId?: string }> => {
  try {
    // Paso 1: Insertar sesión
    const { data: sesionData, error: sErr } = await supabase
      .from('HISTORIAL_SESIONES')
      .insert(session)
      .select('id')
      .single();

    if (sErr || !sesionData) {
      console.error('[OfflineQueue] Error insertando sesión:', sErr?.message);
      return { success: false };
    }

    // Paso 2: Insertar logs de ejercicios
    const logsConSesionId = exerciseLogs.map((log) => ({
      ...log,
      sesion_id: sesionData.id,
    }));

    const { error: logErr } = await supabase
      .from('HISTORIAL_EJERCICIOS')
      .insert(logsConSesionId);

    if (logErr) {
      console.error('[OfflineQueue] Error insertando logs:', logErr.message);
      // La sesión se guardó pero los logs no. No hacemos rollback — es mejor
      // tener la sesión sin detalles que perder todo.
      return { success: true, sessionId: sesionData.id };
    }

    return { success: true, sessionId: sesionData.id };
  } catch (e: any) {
    console.error('[OfflineQueue] Error inesperado:', e.message);
    return { success: false };
  }
};

/**
 * Procesa toda la cola pendiente.
 * Llama a esto al detectar que la conexión se recuperó.
 *
 * @returns número de sesiones sincronizadas exitosamente
 */
export const processOfflineQueue = async (): Promise<number> => {
  const queue = await readQueue();

  if (queue.length === 0) return 0;

  console.log(`[OfflineQueue] Procesando ${queue.length} sesión(es) pendiente(s)...`);

  const remaining: PendingSession[] = [];
  let syncedCount = 0;

  for (const pending of queue) {
    // Descartamos intentos agotados (evita la cola zombi)
    if (pending.retryCount >= MAX_RETRY_ATTEMPTS) {
      console.warn(
        `[OfflineQueue] Descartando sesión ${pending.id} tras ${MAX_RETRY_ATTEMPTS} intentos.`
      );
      continue;
    }

    const result = await uploadSessionToSupabase(
      pending.session,
      pending.exerciseLogs
    );

    if (result.success) {
      syncedCount++;
      console.log(`[OfflineQueue] ✅ Sesión ${pending.id} sincronizada.`);
    } else {
      // Volvemos a encolar con el contador incrementado
      remaining.push({ ...pending, retryCount: pending.retryCount + 1 });
      console.warn(
        `[OfflineQueue] ⚠️ Sesión ${pending.id} sigue pendiente (intento ${pending.retryCount + 1}).`
      );
    }
  }

  await writeQueue(remaining);

  if (syncedCount > 0) {
    console.log(`[OfflineQueue] Sincronización completada: ${syncedCount} sesión(es) subidas.`);
  }

  return syncedCount;
};

/**
 * Devuelve el número de sesiones pendientes en la cola.
 * Útil para mostrar un badge en la UI: "2 sesiones por sincronizar".
 */
export const getPendingQueueCount = async (): Promise<number> => {
  const queue = await readQueue();
  return queue.length;
};

/**
 * Limpia manualmente la cola (útil para testing o si el usuario quiere descartar pendientes).
 */
export const clearOfflineQueue = async (): Promise<void> => {
  await AsyncStorage.removeItem(QUEUE_KEY);
};