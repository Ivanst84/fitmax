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
// 🧠 HOOK DE GENERACIÓN CIENTÍFICA (VERSIÓN LITE + CÁLCULO DINÁMICO)
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
        // 🛡️ 1. PRE-FILTRO INTELIGENTE DE NIVEL
        // ======================================================================
        let nivelUsuarioNum = 2; // Default Intermedio
        const nivelStr = String(respuestas.nivel).toLowerCase();
        if (nivelStr.includes('principiante') || respuestas.nivel === 1) nivelUsuarioNum = 1;
        if (nivelStr.includes('avanzado') || respuestas.nivel === 3) nivelUsuarioNum = 3;

        // ======================================================================
        // 🧬 2. CÁLCULO DINÁMICO DE VOLUMEN (Basado en Fisiología y Catálogo)
        // ======================================================================
        let numEjercicios = 6; // Base estándar

        // A) Ajuste por Tiempo (Asumiendo que trae minutos: 30, 45, 60...)
        const duracion = parseInt(respuestas.duracion) || 60;
        if (duracion <= 30) numEjercicios = 4;
        else if (duracion >= 90) numEjercicios = 8;
        else numEjercicios = 6; 

        // B) Ajuste Fisiológico por Objetivo (Tus IDs exactos)
        const objId = parseInt(respuestas.objetivo);
        if (objId === 5) {
          // ID 5 = Fuerza: Menos ejercicios, pesados, más descanso
          numEjercicios = Math.max(3, numEjercicios - 2); 
        } else if (objId === 1 || objId === 3) {
          // ID 1 (Perder peso) o 3 (Tonificar): Circuitos más densos, más ejercicios
          numEjercicios = numEjercicios + 1; 
        }

        // ======================================================================
        // 🛡️ 3. FILTRADO DEL CATÁLOGO
        // ======================================================================
        let catalogoFiltrado = catalogoEjercicios.filter(ej => {
          const nivelEj = ej.nivel_id || 1;
          return nivelEj <= nivelUsuarioNum;
        });

        if (catalogoFiltrado.length > 70) {
          catalogoFiltrado = catalogoFiltrado.sort(() => 0.5 - Math.random()).slice(0, 70);
        }

        const mapaReferencia: Record<number, string> = {};
        const catalogoSimplificado = catalogoFiltrado.map((ej, index) => {
          const idCorto = index + 1;
          mapaReferencia[idCorto] = ej.id;
          const infoExtra = ej.es_por_tiempo ? ' (Medir en Segundos)' : '';
          return `#${idCorto}: ${ej.nombre}${infoExtra}`;
        }).join('\n');

        // ======================================================================
        // 🗺️ 4. CREACIÓN DEL PROMPT (Inyectando numEjercicios)
        // ======================================================================
        const systemInstruction = `
          Eres un Coach Experto. Diseña rutinas basadas en evidencia.
          
          REGLAS ESTRICTAS PARA AHORRAR TOKENS:
          1. CADA DÍA DEBE TENER EXACTAMENTE ${numEjercicios} EJERCICIOS EN TOTAL. 1 de calentamiento (cal: true) y el resto de fuerza (cal: false).
          2. Usa SOLO los IDs numéricos del catálogo.
          3. 'n': Nombre corto (ej: "Espalda Fuerte").
          4. 'desc': MÁXIMO 5 PALABRAS. Sé directo.
          5. NO agregues introducciones ni explicaciones fuera del JSON.

          FORMATO JSON ESPERADO:
          [
            {
              "d": 1, 
              "n": "Nombre", 
              "desc": "Máximo cinco palabras aquí",
              "ejs": [
                {"id": número, "s": series, "r": "reps_o_seg", "t": descanso_seg, "cal": true_o_false}
              ]
            }
          ]
        `;

        const promptDelUsuario = `
          PERFIL:
          - Objetivo ID: ${respuestas.objetivo}
          - Nivel ID: ${respuestas.nivel}
          - Días a entrenar: ${respuestas.frecuencia}

          GENERA EXACTAMENTE ${respuestas.frecuencia} DÍAS.

          Catálogo:
          ${catalogoSimplificado}
        `;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        // Usamos Flash-Lite-Latest para máxima velocidad
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
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

        // RADAR DE TOKENS
        if (data.usageMetadata) {
          console.log("📊 REPORTE DE TOKENS:", {
            enviados: data.usageMetadata.promptTokenCount,
            recibidos: data.usageMetadata.candidatesTokenCount,
            total: data.usageMetadata.totalTokenCount
          });
        }

        const textoCrudo = data.candidates?.[0]?.content?.parts?.[0]?.text;
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