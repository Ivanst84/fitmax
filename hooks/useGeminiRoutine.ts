import { useState } from 'react';


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

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  const generateRoutine = async (respuestas: Record<string, any>, catalogoEjercicios: any[]) => {
    setLoading(true);
    setError(null);

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 
    if (!apiKey) throw new Error("Falta la clave de Gemini");

    const MAX_RETRIES = 3;
    let attempt = 0;

    const ejecutarConReintentos = async (): Promise<any> => {
      try {
        // ======================================================================
        // 🛡️ 1. PRE-FILTRO INTELIGENTE (Tu lógica intacta)
        // ======================================================================
        let nivelUsuarioNum = 2;
        const nivelStr = String(respuestas.nivel).toLowerCase();
        if (nivelStr.includes('principiante') || respuestas.nivel === 1) nivelUsuarioNum = 1;
        if (nivelStr.includes('avanzado') || respuestas.nivel === 3) nivelUsuarioNum = 3;

        let catalogoFiltrado = catalogoEjercicios.filter(ej => {
          const nivelEj = ej.nivel_id || 1;
          return nivelEj <= nivelUsuarioNum;
        });

        if (catalogoFiltrado.length > 70) {
          catalogoFiltrado = catalogoFiltrado.sort(() => 0.5 - Math.random()).slice(0, 70);
        }

        // ======================================================================
        // 🗺️ 2. MAPEO Y CREACIÓN DEL PROMPT (Tu mapeo intacto)
        // ======================================================================
        const mapaReferencia: Record<number, string> = {};
        
        const catalogoSimplificado = catalogoFiltrado.map((ej, index) => {
          const idCorto = index + 1;
          mapaReferencia[idCorto] = ej.id;
          const infoExtra = ej.es_por_tiempo ? ' (Medir en Segundos)' : '';
          return `#${idCorto}: ${ej.nombre}${infoExtra}`;
        }).join('\n');

        // 🔥 INSTRUCCIÓN CORREGIDA (Para forzar nombres creativos y descripciones)
        const systemInstruction = `
          Eres un Coach Experto en Ciencias del Deporte y Fisiología Humana.
          Tu misión es diseñar rutinas basadas en evidencia científica.
          
          REGLAS ESTRICTAS:
          1. Inicia cada día con 1 o 2 ejercicios de CALENTAMIENTO/ACTIVACIÓN (cal: true).
          2. El resto son ejercicios de fuerza/hipertrofia (cal: false).
          3. Usa SOLO los IDs numéricos del catálogo proporcionado.
          4. La propiedad 'n' DEBE ser un nombre motivador (ej: "Espalda de Titán", "Piernas de Acero"). NUNCA uses "Día 1" o "Día 2".
          5. La propiedad 'desc' DEBE explicar el enfoque del entrenamiento. NUNCA la dejes vacía.
          6. Responde ÚNICAMENTE un array JSON.

          FORMATO JSON ESPERADO:
          [
            {
              "d": 1, 
              "n": "Nombre del Bloque", 
              "desc": "Justificación científica del día",
              "ejs": [
                {"id": número, "s": series, "r": "reps_o_seg", "t": descanso_seg, "cal": true_o_false}
              ]
            }
          ]
        `;

        const promptDelUsuario = `
          PERFIL DEL USUARIO:
          - Objetivo: ${respuestas.objetivo}
          - Nivel: ${respuestas.nivel}
          - Días a entrenar: ${respuestas.frecuencia}

          ¡ORDEN ESTRICTA!: DEBES generar EXACTAMENTE ${respuestas.frecuencia} días de entrenamiento. Ni uno más, ni uno menos. Tu array JSON debe tener exactamente ${respuestas.frecuencia} objetos.

          Catálogo:
          ${catalogoSimplificado}
        `;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: 'user', parts: [{ text: promptDelUsuario }] }],
              generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
            }),
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Google API Error: ${errorData.error?.message || response.status}`);
        }

        const data = await response.json();
// ======================================================================
        // 🚀 EL RADAR DE TOKENS (AQUÍ LO PONES)
        // ======================================================================
        if (data.usageMetadata) {
          console.log("📊 REPORTE DE TOKENS (COSTO DE ESTE USUARIO):", {
            enviados: data.usageMetadata.promptTokenCount,
            recibidos: data.usageMetadata.candidatesTokenCount,
            total: data.usageMetadata.totalTokenCount
          });
        } else {
          console.log("📊 REPORTE DE TOKENS: No disponible en esta respuesta.");
        }
        // ======================================================================

        const textoCrudo = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("💬 Respuesta cruda de Gemini:", textoCrudo);
        const resJSON = intentarRecuperarJSON(textoCrudo);        
        
        const diasRaw = Array.isArray(resJSON) ? resJSON : (resJSON.plan || resJSON.rutina || []);

        return diasRaw.map((dia: any, index: number) => ({
          dia_semana_sugerido: dia.d || index + 1,
          dia_nombre: dia.n || `Día ${index + 1}`,
          descripcion: dia.desc || "Entrenamiento del día",
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
        attempt++;
        if (attempt < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, attempt); 
          console.warn(`⚠️ Intento ${attempt} fallido. Reintentando en ${delay}ms...`);
          await sleep(delay);
          return ejecutarConReintentos();
        }
        throw err;
      }
    };

    try {
      return await ejecutarConReintentos();
    } catch (err: any) {
      console.error("❌ Error final useGeminiRoutine:", err.message);
      setError("No se pudo generar la rutina. Revisa tu conexión.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateRoutine, loading, error };
};