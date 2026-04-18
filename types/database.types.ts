// Ruta: types/database.types.ts

export interface Rutina {
  id: string;
  nombre: string;
  descripcion: string;
  dia_semana: number;
  duracion_min: number;
}

export interface Ejercicio {
  id: string;
  nombre: string;
  descripcion: string;
  video_url?: string;
  imagen_url?: string;
  grupo_muscular?: string;
  equipo_id?: number;
  musculo_id?: number;
  tips?: string; 
  nivel_id ?: number;
}

// Representa la relación entre Rutina y Ejercicio (si aplica en tu BD)
export interface RutinaEjercicios {
  id: string;
  rutina_id: string;
  ejercicio_id: string;
  series: number;
  repeticiones: string;
  ejercicio: Ejercicio; 
}
// Ruta: types/database.types.ts

export interface HistorialSesion {
  id?: string;
  user_id: string; // Auth UID
  rutina_id: string;
  nombre_rutina: string;
  duracion_segundos: number;
  total_series_completadas: number;
  fecha: string;
  volumen_total_kg: number;
  calorias_quemadas: number;
  
}