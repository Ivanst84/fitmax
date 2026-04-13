import { useState } from 'react';

const intentarRecuperarJSON = (texto: string | undefined | null) => {
  if (!texto) throw new Error("La IA no respondió. Intenta de nuevo.");
  let limpio = texto.replace(/```json/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(limpio); } catch (e) {
    try {
      const inicio = limpio.indexOf('['); const fin = limpio.lastIndexOf(']');
      if (inicio !== -1 && fin !== -1) return JSON.parse(limpio.substring(inicio, fin + 1));
    } catch (innerError) { throw new Error("Formato de rutina inválido."); }
  }
  throw new Error("No se pudo procesar la respuesta de la IA.");
};

export const useGeminiRoutine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  const generateRoutine = async (respuestas: Record<string, any>, catalogoEjercicios: any[]) => {
    setLoading(true); setError(null);
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 
    if (!apiKey) throw new Error("Falta la clave de Gemini");

    try {
         // 1. PRE-FILTRO (OPTIMIZADO PARA AHORRAR TOKENS)
      let nivelUsuarioNum = 2; 
      const nivelStr = String(respuestas.nivel).toLowerCase();
      if (nivelStr.includes('principiante') || respuestas.nivel === 1) nivelUsuarioNum = 1;
      if (nivelStr.includes('avanzado') || respuestas.nivel === 3) nivelUsuarioNum = 3;

      let numEjercicios = 6; 
      const duracion = parseInt(respuestas.duracion) || 60;
      if (duracion <= 30) numEjercicios = 4;
      else if (duracion >= 90) numEjercicios = 8;
      else numEjercicios = 6; 

      const objId = parseInt(respuestas.objetivo);
      if (objId === 5) numEjercicios = Math.max(3, numEjercicios - 2); 
      else if (objId === 1 || objId === 3) numEjercicios = numEjercicios + 1; 

      // 🔥 FILTRO MÁS ESTRICTO + LÍMITE MÁS BAJO (esto es lo que ahorra tokens)
      let catalogoFiltrado = catalogoEjercicios.filter(ej => {
        const niv = ej.nivel_id || 1;
        if (nivelUsuarioNum === 1) return niv === 1;           // Principiante → SOLO nivel 1
        return niv <= nivelUsuarioNum;                         // Intermedio/Avanzado → como antes
      });

      // Reducimos el máximo a 45 ejercicios (antes 70) → mucho menos tokens
      if (catalogoFiltrado.length > 45) {
        catalogoFiltrado = catalogoFiltrado.sort(() => 0.5 - Math.random()).slice(0, 45);
      }

      const mapaReferencia: Record<number, string> = {};
      const catalogoSimplificado = catalogoFiltrado.map((ej, index) => {
        const idCorto = index + 1;
        mapaReferencia[idCorto] = ej.id;
        const infoExtra = ej.es_por_tiempo ? ' (Segundos)' : '';
        return `#${idCorto}: ${ej.nombre}${infoExtra}`;
      }).join('\n');
     const systemInstruction = `Eres un Master Coach Experto y Fisioterapeuta. REGLAS ESTRICTAS E INQUEBRANTABLES:
1. ESTRUCTURA: EXACTAMENTE ${numEjercicios} ejercicios por día. El ejercicio #1 SIEMPRE es calentamiento (cal: true), el resto fuerza/hipertrofia (cal: false).
2. CALENTAMIENTO INTELIGENTE: Varía el calentamiento cada día.
3. BALANCE ANATÓMICO: En rutinas de 3+ días, NUNCA omitas las piernas. Si piden "Tren Superior", haz un split lógicamente compensado (ej. 80% arriba, 20% abajo).
4. PROTOCOLO CLÍNICO (PRINCIPIANTES Y SOBREPESO): Si el nivel es 'principiante' o el peso es >85kg, ASUME QUE NUNCA HAN ENTRENADO. 
   - PROHIBIDO: Saltos (Jumping Jacks, Burpees), flexiones completas, sentadillas con barra.
   - OBLIGATORIO: Selecciona ÚNICAMENTE ejercicios marcados con [BAJO IMPACTO] o regresiones de nivel 1. 
   - ISOMETRÍAS: Planchas máximo de 15s a 20s. Nunca más.
5. ADAPTACIÓN DE VOLUMEN (t, s, r): Si el objetivo es perder peso, descansos (t) de 45s-60s. Si es fuerza, descansos (t) de 90s-120s. 
6. FORMATO: Usa SOLO IDs numéricos del catálogo. 'desc': MÁXIMO 5 PALABRAS.
Responde ÚNICAMENTE en este JSON estricto: [{"d":1,"n":"Nombre Rutina","desc":"Máximo 5 palabras","ejs":[{"id":numero,"s":series,"r":"reps_o_seg","t":descanso,"cal":true_o_false}]}]`;

      const promptDelUsuario = `PERFIL DEL ATLETA:
Género: ${respuestas.genero}
Edad: ${respuestas.edad}
Peso: ${respuestas.peso_kg || 75} kg
Estatura: ${respuestas.altura_cm || 170} cm
Objetivo: ${respuestas.objetivo}
Nivel: ${respuestas.nivel}
Días a la semana: ${respuestas.frecuencia}
Prioridad: ${respuestas.enfoque}

INSTRUCCIÓN: Genera un plan de ${respuestas.frecuencia} días. Usa la REGLA 4 estrictamente si el usuario cumple los criterios de novato/sobrepeso.

Catálogo disponible:
${catalogoSimplificado}`;
      const maxAttempts = 3;
      let textoCrudo = '';

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 40000);
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
            if (response.status === 429) throw new Error('RATE_LIMIT');
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          if (data.usageMetadata) console.log("📊 TOKENS:", { env: data.usageMetadata.promptTokenCount, rec: data.usageMetadata.candidatesTokenCount });
          
          textoCrudo = data.candidates?.[0]?.content?.parts?.[0]?.text;
          break; // Salió bien, rompemos el loop
        } catch (err: any) {
          if (err.message === 'RATE_LIMIT' || attempt === maxAttempts) throw err;
          const retryTime = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
          console.warn(` Intento IA ${attempt} falló. Reintento en ${retryTime}ms...`);
          await sleep(retryTime);
        }
      }

      const resJSON = intentarRecuperarJSON(textoCrudo);        
     const diasRaw = Array.isArray(resJSON) 
  ? resJSON 
  : (resJSON.plan || resJSON.rutina || resJSON.days || resJSON.dias || []);

if (diasRaw.length === 0) {
  throw new Error("La IA devolvió un plan vacío. Intenta ajustar tus parámetros.");
}

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
      console.error("❌ Error useGeminiRoutine:", err.message);
      setError("No se pudo generar la rutina. Revisa tu conexión.");
      throw err;
    } finally { setLoading(false); }
  };

  return { generateRoutine, loading, error };
};