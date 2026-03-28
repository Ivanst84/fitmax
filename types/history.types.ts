// Ruta: types/history.types.ts
export interface LogSerie {
  reps: number;
  kg: number;
}

export interface HistorialEjercicio {
  id: string;
  sesion_id: string;
  ejercicio_id: string;
  nombre_ejercicio: string;
  series_json: LogSerie[];
}

export interface HistorialSesion {
  id: string;
  user_id: string;
  rutina_id: string;
  nombre_rutina: string;
  duracion_segundos: number;
  volumen_total_kg: number;
  sets_completados: number;
  fecha: string;
  ejercicios?: HistorialEjercicio[]; // Relación opcional
}