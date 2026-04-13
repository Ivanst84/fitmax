import { useState } from 'react';

// 🚀 EXTRACTOR BLINDADO: Ignora texto antes o después del JSON
const intentarRecuperarJSON = (texto: string | undefined | null) => {
  if (!texto) throw new Error("La IA no respondió. Intenta de nuevo.");
  
  let limpio = texto.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Intento 1: Parseo directo (si la IA se portó bien)
  try { 
    return JSON.parse(limpio); 
  } catch (e) {
    // Intento 2: Extracción por fuerza bruta (buscar el arreglo [...])
    try {
      const matchArray = limpio.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (matchArray) return JSON.parse(matchArray[0]);

      // Intento 3: Por si lo envolvió en un objeto { "rutina": [...] }
      const matchObj = limpio.match(/\{\s*"[\s\S]*\}\s*/);
      if (matchObj) return JSON.parse(matchObj[0]);
    } catch (innerError) {
      console.error("❌ RAW ERROR IA:", limpio); // Para ver qué tontería mandó la IA
      throw new Error("Formato de rutina inválido.");
    }
  }
  
  console.error("❌ RAW TEXTO IMPARSEABLE:", limpio);
  throw new Error("No se pudo procesar la respuesta de la IA.");
};

// 🛡️ FUNCIÓN DE SEGURIDAD CLÍNICA (FUERA DE LA IA)
const obtenerReemplazoSeguro = (nombreMalo: string, catalogo: any[]) => {
  const n = nombreMalo.toLowerCase();
  let keyword = '';
  
  if (n.includes('jumping') || n.includes('burpee') || n.includes('cuerda')) keyword = 'marcha'; 
  else if (n.includes('sentadilla') || n.includes('barra')) keyword = 'silla'; 
  else if (n.includes('flexion') || n.includes('push')) keyword = 'inclinada'; 
  else if (n.includes('climber')) keyword = 'plancha'; 

  let seguro = catalogo.find(c => c.nombre.toLowerCase().includes(keyword) && c.nivel_id === 1);
  if (!seguro) seguro = catalogo.find(c => c.nivel_id === 1 && !c.nombre.toLowerCase().includes('jumping')); 
  return seguro;
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

      // 🚀 PROMPT LIMPIO Y DIRECTO AL GRANO
      const systemInstruction = `Eres un Master Coach. REGLAS ESTRICTAS:
1. ESTRUCTURA: EXACTAMENTE ${numEjercicios} ejercicios por día. Ejercicio #1 siempre es calentamiento (cal: true).
2. CLÍNICA: Si el usuario es principiante o pesa >85kg, NUNCA incluyas Saltos, Burpees ni flexiones en piso. Usa variantes de bajo impacto.
3. FORMATO DE RESPUESTA: DEVUELVE ÚNICA Y EXCLUSIVAMENTE UN ARREGLO JSON. CERO PALABRAS ANTES O DESPUÉS.
[{"d":1,"n":"Nombre Rutina","desc":"Breve","ejs":[{"id":numero_del_catalogo,"s":3,"r":"12","t":60,"cal":true}]}]`;

      const promptDelUsuario = `PERFIL:
Género: ${respuestas.genero}
Edad: ${respuestas.edad}
Peso: ${respuestas.peso_kg || 75} kg
Nivel: ${respuestas.nivel}
Días: ${respuestas.frecuencia}
Enfoque: ${respuestas.enfoque}

Catálogo:
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
                generationConfig: { temperature: 0.1, response_mime_type: "application/json" },
              }),
              signal: controller.signal
            }
          );
          clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          textoCrudo = data.candidates?.[0]?.content?.parts?.[0]?.text;
          break; 
        } catch (err: any) {
          if (attempt === maxAttempts) throw err;
          await sleep(2000);
        }
      }

      const resJSON = intentarRecuperarJSON(textoCrudo);        
      const diasRaw = Array.isArray(resJSON) ? resJSON : (resJSON.plan || resJSON.rutina || resJSON.days || resJSON.dias || []);

      if (diasRaw.length === 0) throw new Error("La IA devolvió un plan vacío.");

      return diasRaw.map((dia: any, index: number) => ({
        dia_semana_sugerido: dia.d || index + 1,
        dia_nombre: dia.n || `Día ${index + 1}`,
        descripcion: dia.desc || "Entrenamiento del día",
        ejercicios: (dia.ejs || []).map((e: any, idx: number) => {
          
          let finalEjercicioId = mapaReferencia[Number(e.id)] || e.id;

          // 🛡️ LÓGICA SMART SWAP
          if (requiereBajoImpacto) {
            const ejOriginal = catalogoEjercicios.find(c => c.id === finalEjercicioId);
            if (ejOriginal) {
              const n = ejOriginal.nombre.toLowerCase();
              const prohibidos = ['jumping', 'burpee', 'cuerda', 'climber', 'sentadilla con barra', 'push-up'];
              
              if (prohibidos.some(p => n.includes(p)) || n === 'flexiones') {
                const reemplazoSeguro = obtenerReemplazoSeguro(ejOriginal.nombre, catalogoEjercicios);
                if (reemplazoSeguro) finalEjercicioId = reemplazoSeguro.id;
              }
            }
          }

          return {
            ejercicio_id: finalEjercicioId,
            series: e.s || 3,
            repeticiones: String(e.r || "12"),
            descanso_segundos: e.t || 60,
            es_calentamiento: e.cal === true, 
            orden: idx + 1
          };
        }),
      }));

    } catch (err: any) {
      console.error("Error useGeminiRoutine:", err.message);
      setError("No se pudo generar la rutina. Revisa tu conexión.");
      throw err;
    } finally { setLoading(false); }
  };

  return { generateRoutine, loading, error };
};