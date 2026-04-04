import { useState } from 'react';

// ============================================================================
// 🛡️ RESCATE DE JSON INDESTRUCTIBLE
// ============================================================================
const intentarRecuperarJSON = (texto: string | undefined | null) => {
  if (!texto) {
    console.error("⚠️ Gemini no devolvió texto.");
    throw new Error("La IA no respondió. Intenta de nuevo.");
  }

  let limpio = texto.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try { 
    return JSON.parse(limpio); 
  } catch (e) {
    try {
      const inicio = limpio.indexOf('[');
      const fin = limpio.lastIndexOf(']');
      if (inicio !== -1 && fin !== -1) {
        return JSON.parse(limpio.substring(inicio, fin + 1));
      }
    } catch (innerError) {
      console.error("❌ Error parseando JSON: ", limpio);
      throw new Error("Formato de rutina inválido.");
    }
  }
  throw new Error("No se pudo procesar la respuesta de la IA.");
};

// ============================================================================
// 🧠 HOOK DE GENERACIÓN CIENTÍFICA
// ============================================================================
export const useGeminiRoutine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRoutine = async (respuestas: Record<string, any>, catalogoEjercicios: any[]) => {
    setLoading(true);
    setError(null);

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 
    if (!apiKey) throw new Error("Falta la clave de Gemini");

    try {
      // ======================================================================
      // 🛡️ 1. PRE-FILTRO INTELIGENTE (EL ESCUDO ANTI-COLAPSO)
      // ======================================================================
      
      // A. Determinamos el nivel numérico del usuario
      let nivelUsuarioNum = 2; // Por defecto Intermedio
      const nivelStr = String(respuestas.nivel).toLowerCase();
      if (nivelStr.includes('principiante') || respuestas.nivel === 1) nivelUsuarioNum = 1;
      if (nivelStr.includes('avanzado') || respuestas.nivel === 3) nivelUsuarioNum = 3;

      // B. Filtramos: Solo enviamos ejercicios adecuados para su nivel
      let catalogoFiltrado = catalogoEjercicios.filter(ej => {
        const nivelEj = ej.nivel_id || 1; // Si no tiene nivel, asumimos 1
        return nivelEj <= nivelUsuarioNum;
      });

      // C. Mezclamos (Shuffle) para dar variedad y cortamos a máximo 70 ejercicios
      if (catalogoFiltrado.length > 70) {
        catalogoFiltrado = catalogoFiltrado.sort(() => 0.5 - Math.random()).slice(0, 70);
      }

      // ======================================================================
      // 🗺️ 2. MAPEO Y CREACIÓN DEL PROMPT
      // ======================================================================
      const mapaReferencia: Record<number, string> = {};
      
      // NOTA: Ahora mapeamos sobre 'catalogoFiltrado' en lugar de 'catalogoEjercicios'
      const catalogoSimplificado = catalogoFiltrado.map((ej, index) => {
        const idCorto = index + 1;
        mapaReferencia[idCorto] = ej.id;
        
        // Bonus: Le avisamos a la IA si el ejercicio es por tiempo (ej. Planchas)
        const infoExtra = ej.es_por_tiempo ? ' (Medir en Segundos)' : '';
        return `#${idCorto}: ${ej.nombre}${infoExtra}`;
      }).join('\n');

      const systemInstruction = `
        Eres un Coach Experto en Ciencias del Deporte y Fisiología Humana.
        Tu misión es diseñar rutinas basadas en evidencia científica.
        
        REGLAS:
        1. Inicia cada día con 1 o 2 ejercicios de CALENTAMIENTO/ACTIVACIÓN (cal: true).
        2. El resto son ejercicios de fuerza/hipertrofia (cal: false).
        3. Usa solo el catálogo proporcionado.
        4. Responde ÚNICAMENTE un array JSON.

        FORMATO JSON ESPERADO:
        [
          {
            "d": 1, 
            "n": "Nombre del Bloque", 
            "desc": "Justificación científica",
            "ejs": [
              {"id": número, "s": series, "r": "reps_o_seg", "t": descanso_seg, "cal": true_o_false}
            ]
          }
        ]
      `;

      // 🔥 Instrucción EXACTA de los días
      const promptDelUsuario = `
        PERFIL DEL USUARIO:
        - Objetivo: ${respuestas.objetivo}
        - Nivel: ${respuestas.nivel}
        - Días a entrenar: ${respuestas.frecuencia}

        ¡ORDEN ESTRICTA!: DEBES generar EXACTAMENTE ${respuestas.frecuencia} días de entrenamiento. Ni uno más, ni uno menos. Tu array JSON debe tener exactamente ${respuestas.frecuencia} objetos.

        Catálogo:
        ${catalogoSimplificado}
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: promptDelUsuario }] }],
            generationConfig: { 
              temperature: 0.1, 
              response_mime_type: "application/json" 
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ ERROR REAL DE GOOGLE:", JSON.stringify(errorData, null, 2));
        throw new Error(`Google rechazó la petición: ${errorData.error?.message || "Error desconocido"}`);
      }

      const data = await response.json();
      const textoCrudo = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      const resJSON = intentarRecuperarJSON(textoCrudo);
      const diasRaw = Array.isArray(resJSON) ? resJSON : (resJSON.plan || resJSON.rutina || []);

      return diasRaw.map((dia: any, index: number) => ({
        // 🔥 Aseguramos que el día se asigne secuencialmente (1, 2, 3...)
        dia_semana_sugerido: dia.d || index + 1,
        dia_nombre: dia.n || `Día ${index + 1}`,
        descripcion: dia.desc || "",
        ejercicios: (dia.ejs || []).map((e: any, idx: number) => ({
          ejercicio_id: mapaReferencia[Number(e.id)] || e.id,
          series: e.s || 3,
          repeticiones: String(e.r || "12"),
          descanso_segundos: e.t || 60,
          es_calentamiento: e.cal === true, 
          orden: idx + 1
        })),
      }));

    } catch (err: any) {
      console.error("❌ Error useGeminiRoutine:", err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateRoutine, loading, error };
};