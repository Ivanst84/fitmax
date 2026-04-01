import { supabase } from './supabase';

const RAPID_API_KEY = '8b78631e7dmsh022b9727f190439p1eed57jsna6204a1c132f'; 

// Mapeo inteligente para el MuscleMap
const mapTargetToMuscleId = (target: string): number => {
  const map: Record<string, number> = {
    'pectorals': 1, 'upper back': 2, 'lats': 2, 'spine': 3, 
    'delts': 4, 'biceps': 5, 'triceps': 6, 'forearms': 7, 
    'abs': 8, 'obliques': 9, 'glutes': 10, 'quads': 11, 
    'hamstrings': 12, 'calves': 13, 'cardiovascular system': 15
  };
  return map[target] || 14; // Default: Full body
};

const mapEquipmentToId = (equipment: string): number => {
  const map: Record<string, number> = {
    'body weight': 1, 'dumbbell': 2, 'band': 3, 'barbell': 4, 
    'cable': 5, 'machine': 6, 'kettlebell': 7, 'leverage machine': 6
  };
  return map[equipment] || 1; // Default: Sin equipo
};

export const runExerciseSync = async () => {
  try {
    console.log("🚀 Iniciando conexión con ExerciseDB...");
    
    // OJO: limit=10 para hacer la primera prueba. 
    // Cuando veas que funciona, cámbialo a limit=100 o quítalo.
    const response = await fetch('https://exercisedb.p.rapidapi.com/exercises?limit=10', {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
      }
    });

    if (!response.ok) throw new Error(`Error API: ${response.status}`);
    
    const data = await response.json();
    console.log(` Descargados ${data.length} ejercicios. Formateando...`);

    const formattedExercises = data.map((ex: any) => ({
      nombre: ex.name, // ExerciseDB ya los trae en minúsculas, podrías hacer .toUpperCase() si prefieres
      descripcion: ex.instructions.join('. '),
      musculo_id: mapTargetToMuscleId(ex.target),
      equipo_id: mapEquipmentToId(ex.equipment),
      video_url: ex.gifUrl,
      nivel_id: 2, // Intermedio por defecto
      es_premium: false
    }));

    
    // Inserción masiva en Supabase
    const { error } = await supabase.from('EJERCICIOS').insert(formattedExercises);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error(" Error en sincronización:", error);
    return false;
  }
};