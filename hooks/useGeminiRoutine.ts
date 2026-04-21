import { useState } from 'react';

const intentarRecuperarJSON = (texto: string | undefined | null) => {
  if (!texto) throw new Error("La IA no respondió. Intenta de nuevo.");
  let limpio = texto.replace(/```json/g, '').replace(/```/g, '').trim();
  
  const primerLlave = limpio.indexOf('{');
  const ultimaLlave = limpio.lastIndexOf('}');
  if (primerLlave !== -1 && ultimaLlave !== -1 && ultimaLlave > primerLlave) {
    limpio = limpio.substring(primerLlave, ultimaLlave + 1);
  }

  try { return JSON.parse(limpio); } 
  catch (e) {
    try {
      const matchArray = limpio.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (matchArray) return JSON.parse(matchArray[0]);
      const matchObj = limpio.match(/\{\s*"[\s\S]*\}\s*/);
      if (matchObj) return JSON.parse(matchObj[0]);
    } catch (innerError) {
      console.error(" RAW ERROR IA:", limpio); 
      throw new Error("Formato de rutina inválido.");
    }
  }
  throw new Error("No se pudo procesar la respuesta de la IA.");
};

// 🛡️ FUNCIÓN DE SEGURIDAD CLÍNICA (Actualizada con Catálogo Real)
const obtenerReemplazoSeguro = (nombreMalo: string, catalogo: any[]) => {
  const n = nombreMalo.toLowerCase();
  
  // 🚨 PELIGRO 1: Saltos, Cuerda, Burpees (Impacto de Rodilla) -> Cambiar a Elíptica o Battle Ropes
  if (n.includes('jumping') || n.includes('burpee') || n.includes('cuerda') || n.includes('salto') || n.includes('jack')) {
    return catalogo.find(c => c.nombre.includes('Máquina Elíptica')) 
        || catalogo.find(c => c.nombre.includes('Battle Ropes'));
  }
  
  // 🚨 PELIGRO 2: Sentadillas libres pesadas o Pistol -> Cambiar a Silla o Prensa Horizontal
  if (n.includes('sentadilla libre') || n.includes('barra') || n.includes('pistol') || n.includes('una pierna')) {
    return catalogo.find(c => c.nombre.includes('Sentadilla en Silla')) 
        || catalogo.find(c => c.nombre.includes('Prensa Horizontal'));
  }
  
  // 🚨 PELIGRO 3: Flexiones de piso o Fondos libres -> Cambiar a Flexiones en Pared
  if (n.includes('flexion') || n.includes('push') || n.includes('fondo') || n.includes('dip')) {
    return catalogo.find(c => c.nombre.includes('Flexiones en Pared'));
  }
  
  // 🚨 PELIGRO 4: Dominadas o Remo colgado (Peso muerto en brazos) -> Cambiar a Remo en Polea
  if (n.includes('dominada') || n.includes('pull-up') || n.includes('invertido')) {
    return catalogo.find(c => c.nombre.includes('Remo Sentado en Polea')) 
        || catalogo.find(c => c.nombre.includes('Jalón al Pecho'));
  }

  // 🛡️ FALLBACK ABSOLUTO: Si nada coincide, dale un estiramiento seguro
  return catalogo.find(c => c.tipo === 'movilidad') || catalogo[0];
};

export const useGeminiRoutine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRoutine = async (respuestas: Record<string, any>, catalogoEjercicios: any[]) => {
    setLoading(true); setError(null);
    
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 
    const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    const CEREBRAS_API_KEY = process.env.EXPO_PUBLIC_CEREBRAS_API_KEY;

    if (!apiKey) throw new Error("Falta la clave de Gemini");

    try {
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

      const requiereBajoImpacto = nivelUsuarioNum === 1 || (respuestas.peso_kg && respuestas.peso_kg > 85);

      const diasSugeridos = parseInt(String(respuestas.frecuencia).replace(/\D/g, '')) || 3; 

      let catalogoFiltrado = catalogoEjercicios.filter(ej => {
        const niv = ej.nivel_id || 1;
        if (nivelUsuarioNum === 1) return niv === 1;
        return niv <= nivelUsuarioNum;
      });

      if (catalogoFiltrado.length > 45) {
        catalogoFiltrado = catalogoFiltrado.sort(() => 0.5 - Math.random()).slice(0, 45);
      }

      const mapaReferencia: Record<number, string> = {};
      const catalogoSimplificado = catalogoFiltrado.map((ej, index) => {
        const idCorto = index + 1;
        mapaReferencia[idCorto] = ej.id;
        return `#${idCorto}: ${ej.nombre}`;
      }).join('\n');

      const systemInstruction = `Eres un Master Coach Experto. REGLAS ESTRICTAS E INQUEBRANTABLES:
1. DURACIÓN DEL PLAN: EXACTAMENTE ${diasSugeridos} días de entrenamiento. PROHIBIDO generar más de ${diasSugeridos} días.
2. CANTIDAD EXACTA: EXACTAMENTE ${numEjercicios} ejercicios por día. PROHIBIDO INCLUIR TODO EL CATÁLOGO.
3. VARIEDAD EXTREMA: Cada día debe tener ejercicios DIFERENTES.
4. ESTRUCTURA: Ejercicio #1 SIEMPRE es calentamiento (cal: true), el resto hipertrofia/fuerza (cal: false).
5. CLÍNICA: Si pesa >85kg o es principiante, PROHIBIDO Saltos o Burpees.
6. PROGRAMACIÓN INTELIGENTE (s, r, t): 
   - Si el objetivo es FUERZA: 4-5 series (s), 3-6 reps (r), 120 seg descanso (t).
   - Si el objetivo es HIPERTROFIA: 3-4 series (s), 8-12 reps (r), 60 seg descanso (t).
   - Si el objetivo es PERDER GRASA: 3-4 series (s), 15-20 reps (r), 45 seg descanso (t).
   - Calentamientos SIEMPRE son 1 serie, "60s" reps, 0 descanso.

7. RESTRICCIÓN DE PESO: Si el usuario pesa más de 100kg, PROHIBIDO incluir 
   cualquier ejercicio que requiera soportar el peso corporal colgado 
   (remo invertido bajo mesa, fondos entre sillas con todo el peso).
   Sustitúyelos por variantes en piso o pared.

8. VOLUMEN PARA PRINCIPIANTES PESADOS: Si el usuario pesa más de 90kg 
   y es principiante, máximo 3 series de 10-12 reps por ejercicio. 
   Nunca 4 series de 20 reps en semana 1.

9. PROHIBIDO REPETIR ejercicios entre días del mismo plan. 
    Si el catálogo tiene más de 20 opciones para ese equipo,  cada día debe tener ejercicios completamente distintos.
10. FORMATO OBLIGATORIO: DEVUELVE ÚNICA Y EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO. Usa títulos MUY CORTOS para el día en "n".
Ejemplo exacto de salida (Usa los números calculados, NO copies esto literal):
{
  "rutina": [
    {"d":1,"n":"Pecho/Tríceps","desc":"Breve","ejs":[{"id":numero,"s":numero_series,"r":"numero_reps","t":segundos_descanso,"cal":true}, ...]}
  ]
}`;

      const promptDelUsuario = `PERFIL:
Género: ${respuestas.genero}
Edad: ${respuestas.edad}
Nivel: ${respuestas.nivel}
Objetivo Principal: ${respuestas.objetivo}
Frecuencia: ${respuestas.frecuencia} días
Enfoque Muscular: ${respuestas.enfoque}
Peso exacto: ${respuestas.peso_kg} 
INSTRUCCIÓN: Genera el plan priorizando VARIEDAD EXTREMA y ajustando las series/reps al Objetivo Principal. SOLO usa IDs de este catálogo:
${catalogoSimplificado}`;
      
      let textoCrudo = '';
      let iaUtilizada = ''; 

    try {
        console.log(`📡 CABEZA 1: Probando con [Gemini]...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); 
        
        const response = await fetch(
           `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: 'user', parts: [{ text: promptDelUsuario }] }],
              generationConfig: { temperature: 0.7, response_mime_type: "application/json" },
            }),
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const googleError = await response.text(); 
          console.error(` GOOGLE RECHAZÓ LA PETICIÓN (HTTP ${response.status}):`);
          console.error(googleError); 
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        textoCrudo = data.candidates?.[0]?.content?.parts?.[0]?.text;
        iaUtilizada = "🔥 GEMINI";

      } catch (errGemini: any) {
        console.error(`🔍 DETALLE DEL FALLO GEMINI:`, errGemini);
        console.warn(`⚠️ Gemini abortado. Despertando a Groq...`);
        
        try {
          if (!GROQ_API_KEY) throw new Error("API Groq faltante en .env");
          console.log(`📡 CABEZA 2: Probando con [Groq Llama-3.1]...`);
          const responseGroq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: promptDelUsuario }
              ],
              temperature: 0.2, 
              max_tokens: 3000,
              response_format: { type: "json_object" } 
            })
          });
          if (!responseGroq.ok) throw new Error(`HTTP ${responseGroq.status}`);
          const dataGroq = await responseGroq.json();
          textoCrudo = dataGroq.choices[0].message.content;
          iaUtilizada = "⚡ GROQ (Llama 3.1)";

        } catch (errGroq: any) {
          console.warn(`⚠️ Groq falló (${errGroq.message}). Despertando a Cerebras...`);
       
          try {
            if (!CEREBRAS_API_KEY) throw new Error("API Cerebras faltante en .env");
            console.log(`📡 CABEZA 3: Probando con [Cerebras Llama-3.1]...`);
            const responseCerebras = await fetch('https://api.cerebras.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'llama3.1-8b',
                messages: [
                  { role: 'system', content: systemInstruction },
                  { role: 'user', content: promptDelUsuario }
                ],
                temperature: 0.2, 
                max_tokens: 3000,
                response_format: { type: "json_object" } 
              })
            });
            if (!responseCerebras.ok) throw new Error(`HTTP ${responseCerebras.status}`);
            const dataCerebras = await responseCerebras.json();
            textoCrudo = dataCerebras.choices[0].message.content;
            iaUtilizada = "🧠 CEREBRAS (Llama 3.1)";

          } catch (errCerebras: any) {
            console.error(" TODAS LAS CABEZAS FUERON DESTRUIDAS.");
            throw new Error("Servidores sobrecargados. Todas las APIs fallaron.");
          }
        }
      }

     console.log(` ¡ÉXITO! La rutina fue generada por: ${iaUtilizada}`);

      const resJSON = intentarRecuperarJSON(textoCrudo);        
      const diasRaw = Array.isArray(resJSON) ? resJSON : (resJSON.rutina || resJSON.plan || resJSON.days || resJSON.dias || []);

      if (!diasRaw || diasRaw.length === 0) throw new Error("La IA devolvió un plan vacío.");

      return diasRaw.map((dia: any, index: number) => {
        const calentamientosSeguros = catalogoEjercicios.filter(
          c => c.tipo === 'movilidad' || (c.tipo === 'cardio' && c.nivel_id === 1)
        );
        const calentamientoDelDia = calentamientosSeguros.length > 0 
          ? calentamientosSeguros[Math.floor(Math.random() * calentamientosSeguros.length)] 
          : null;

        return {
          dia_semana_sugerido: dia.d || index + 1,
          dia_nombre: dia.n || `Día ${index + 1}`,
          descripcion: dia.desc || "Entrenamiento del día",
          ejercicios: (dia.ejs || []).map((e: any, idx: number) => {
            
            let finalEjercicioId = mapaReferencia[Number(e.id)] || e.id;
            const esElPrimerEjercicio = idx === 0;

            if (esElPrimerEjercicio && calentamientoDelDia) {
              finalEjercicioId = calentamientoDelDia.id;
            } 
           else if (requiereBajoImpacto && !esElPrimerEjercicio) {
              const ejOriginal = catalogoEjercicios.find(c => c.id === finalEjercicioId);
              if (ejOriginal) {
                const n = ejOriginal.nombre.toLowerCase();
                
                const esPeligroso = n.includes('jumping') || n.includes('burpee') || 
                                    n.includes('cuerda') || n.includes('salto') || 
                                    n.includes('jack') || n.includes('sentadilla libre') || 
                                    n.includes('barra') || n.includes('pistol') || 
                                    n.includes('una pierna') || n.includes('flexion') || 
                                    n.includes('push') || n.includes('fondo') || 
                                    n.includes('dip') || n.includes('dominada') || 
                                    n.includes('pull-up') || n.includes('invertido');
                
                if (esPeligroso) {
                  const reemplazoSeguro = obtenerReemplazoSeguro(ejOriginal.nombre, catalogoEjercicios);
                  if (reemplazoSeguro && reemplazoSeguro.id !== finalEjercicioId) {
                    finalEjercicioId = reemplazoSeguro.id;
                  }
                }
              }
            }

            return {
              ejercicio_id: finalEjercicioId,
              series: esElPrimerEjercicio ? 1 : (e.s || 3),
              repeticiones: esElPrimerEjercicio ? "60" : String(e.r || "12"),
              descanso_segundos: esElPrimerEjercicio ? 0 : (e.t || 60),
              es_calentamiento: esElPrimerEjercicio ? true : (e.cal === true), 
              orden: idx + 1
            };
          }),
        };
      });

    } catch (err: any) {
      console.error(" Error useGeminiRoutine:", err.message);
      if (err.message.includes('503') || err.message.includes('500') || err.message.includes('sobrecargados')) {
        setError("Nuestros servidores de IA están un poco saturados. Por favor, espera un minuto y vuelve a intentarlo.");
      } else if (err.message === 'RATE_LIMIT' || err.message.includes('429')) {
        setError("Demasiadas peticiones. Por favor, espera un momento.");
      } else {
        setError("No se pudo generar la rutina. Revisa tu conexión a internet o intenta de nuevo.");
      }
      throw err;
    } finally { 
      setLoading(false); 
    }
  };

  return { generateRoutine, loading, error };
};