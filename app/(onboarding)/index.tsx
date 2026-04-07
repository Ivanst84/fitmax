import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, ActivityIndicator, StatusBar, Alert, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useGeminiRoutine } from '../../hooks/useGeminiRoutine';

// 🧠 DEFINICIÓN DE LOS DÍAS DE LA SEMANA PARA EL NUEVO SELECTOR
const DIAS_SEMANA = [
  { id: 1, label: 'L', full: 'Lunes' },
  { id: 2, label: 'M', full: 'Martes' },
  { id: 3, label: 'M', full: 'Miércoles' },
  { id: 4, label: 'J', full: 'Jueves' },
  { id: 5, label: 'V', full: 'Viernes' },
  { id: 6, label: 'S', full: 'Sábado' },
  { id: 7, label: 'D', full: 'Domingo' }
];

const PASOS = [
  { id: 'genero', titulo: '¿Cuál es tu género?', subtitulo: 'Calculamos tu metabolismo basal.', opciones: [{ id: 'hombre', label: 'Hombre', desc: 'Prioridad estándar', icon: 'man-outline' }, { id: 'mujer', label: 'Mujer', desc: 'Mayor recuperación', icon: 'woman-outline' }, { id: 'otro', label: 'Otro', desc: 'Plan balanceado', icon: 'person-outline' }] },
  { id: 'edad', titulo: '¿Qué edad tienes?', subtitulo: 'Ajustamos carga articular.', opciones: [{ id: '18_25', label: '18-25 años', desc: 'Recuperación Full', icon: 'battery-full-outline' }, { id: '26_35', label: '26-35 años', desc: 'Pico de fuerza', icon: 'battery-half-outline' }, { id: '36_45', label: '36-45 años', desc: 'Fuerza y movilidad', icon: 'shield-checkmark-outline' }, { id: '46_mas', label: '46+ años', desc: 'Longevidad', icon: 'heart-outline' }] },
  { id: 'peso', titulo: '¿Cuánto pesas?', subtitulo: 'Vital para calcular calorías e IMC.', custom: true, type: 'input' },
  { id: 'estatura', titulo: '¿Cuánto mides?', subtitulo: 'Para tus palancas musculares.', custom: true, type: 'input' },
  { id: 'nivel', titulo: '¿Cuál es tu nivel?', subtitulo: 'Técnica y volumen de carga.', opciones: [{ id: 'principiante', label: 'Principiante', desc: '< 6 meses', icon: 'leaf-outline' }, { id: 'intermedio', label: 'Intermedio', desc: '1-2 años', icon: 'barbell-outline' }, { id: 'avanzado', label: 'Avanzado', desc: '> 2 años', icon: 'skull-outline' }] },
  { id: 'objetivo', titulo: '¿Tu meta principal?', subtitulo: 'Define rangos de reps y series.', opciones: [{ id: 'perder_peso', label: 'Perder Grasa', desc: 'Déficit y cardio', icon: 'flame-outline' }, { id: 'hipertrofia', label: 'Ganar Músculo', desc: '8-12 reps', icon: 'trending-up-outline' }, { id: 'fuerza', label: 'Fuerza Pura', desc: '1-5 reps', icon: 'fitness-outline' }] },
  { id: 'enfoque', titulo: '¿Qué zona priorizar?', subtitulo: 'Volumen extra en esta área.', opciones: [{ id: 'fullbody', label: 'Cuerpo Completo', desc: 'Armónico', icon: 'body-outline' }, { id: 'superior', label: 'Tren Superior', desc: 'Torso y brazos', icon: 'shirt-outline' }, { id: 'inferior', label: 'Tren Inferior', desc: 'Pierna y glúteo', icon: 'walk-outline' }] },
  
  // 🔥 AQUÍ CAMBIA: El nuevo paso de "frecuencia" con selector múltiple
  { id: 'frecuencia', titulo: '¿Qué días vas a entrenar?', subtitulo: 'Toca los días que irás al gimnasio.', custom: true, type: 'days' },
  
  { id: 'duracion', titulo: '¿Tiempo por sesión?', subtitulo: 'Número de ejercicios.', opciones: [{ id: 30, label: '30 Minutos', desc: 'Sin descansos', icon: 'timer-outline' }, { id: 45, label: '45 Minutos', desc: 'Recomendado', icon: 'hourglass-outline' }, { id: 60, label: '60+ Minutos', desc: 'Completo', icon: 'stopwatch-outline' }] },
  { id: 'equipo', titulo: '¿Dónde entrenarás?', subtitulo: 'Solo ejercicios disponibles.', opciones: [{ id: 'casa', label: 'En Casa', desc: 'Peso corporal', icon: 'home-outline' }, { id: 'mancuernas', label: 'Mancuernas', desc: 'Gym básico', icon: 'disc-outline' }, { id: 'gym', label: 'Gym Completo', desc: 'Máquinas y racks', icon: 'business-outline' }] }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { generateRoutine } = useGeminiRoutine();
  
  const [pasoActual, setPasoActual] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [generando, setGenerando] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState(0);

  const [pesoInput, setPesoInput] = useState('75');
  const [estaturaInputCM, setEstaturaInputCM] = useState('170');
  
  // Estado para guardar los días seleccionados (Ej: [1, 3, 5] para L, M, V)
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);

  const totalPasos = PASOS.length;
  const infoPaso = PASOS[pasoActual];

  useEffect(() => {
    if (!generando) return;
    const interval = setInterval(() => setMensajeCarga(prev => (prev + 1) % 5), 2000);
    return () => clearInterval(interval);
  }, [generando]);

  const avanzar = (nuevasResp: any) => {
    if (pasoActual < totalPasos - 1) {
      setPasoActual(prev => prev + 1);
    } else {
      finalizarCuestionario(nuevasResp);
    }
  };

  const handleSelect = (optionId: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nuevas = { ...respuestas, [infoPaso.id]: optionId };
    setRespuestas(nuevas);
    avanzar(nuevas);
  };

  const handleCustomNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nuevas = { ...respuestas };
    
    if (infoPaso.id === 'peso') nuevas.peso_kg = parseFloat(pesoInput);
    if (infoPaso.id === 'estatura') nuevas.altura_cm = parseFloat(estaturaInputCM);
    
    // Validamos que haya seleccionado al menos 2 días
    if (infoPaso.id === 'frecuencia') {
      if (diasSeleccionados.length < 2) {
        Alert.alert("Atención", "Por favor selecciona al menos 2 días para ver resultados.");
        return;
      }
      nuevas.dias_entrenamiento = diasSeleccionados;
      nuevas.frecuencia = diasSeleccionados.length; // Guardamos el conteo para Gemini
    }

    setRespuestas(nuevas);
    avanzar(nuevas);
  };

  const toggleDia = (diaId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (diasSeleccionados.includes(diaId)) {
      setDiasSeleccionados(diasSeleccionados.filter(d => d !== diaId));
    } else {
      setDiasSeleccionados([...diasSeleccionados, diaId].sort((a, b) => a - b));
    }
  };

  const volverAtras = () => {
    if (pasoActual > 0) setPasoActual(prev => prev - 1);
  };

  // 🚀 LÓGICA DE GUARDADO FINAL
  const finalizarCuestionario = async (perfilFinal: any) => {
    try {
      setGenerando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no encontrado');

      // ======================================================================
      // 🛡️ FILTROS CON TUS IDs REALES (Para ahorrar tokens y dinero)
      // ======================================================================
      let query = supabase.from('EJERCICIOS').select('id, nombre');

      // 1. Filtro por Equipo (Basado en tu tabla CAT_EQUIPO)
      if (perfilFinal.equipo === 'casa') {
        query = query.in('equipo_id', [1]); // 1 = Sin equipo
      } else if (perfilFinal.equipo === 'mancuernas') {
        query = query.in('equipo_id', [1, 2]); // 1 = Sin equipo, 2 = Mancuernas
      }

      // 2. Filtro por Enfoque Muscular (Basado en tu tabla CAT_MUSCULOS)
      if (perfilFinal.enfoque === 'superior') {
        query = query.in('musculo_id', [1, 2, 3, 4, 5, 6, 7, 8, 9]); 
      } else if (perfilFinal.enfoque === 'inferior') {
        query = query.in('musculo_id', [8, 9, 10, 11, 12, 13]); 
      }

      const { data: catalogoDB, error: errorCat } = await query;
      console.log("🏋️ Ejercicios encontrados para mandar a Gemini:", catalogoDB?.length);
      if (errorCat || !catalogoDB) throw new Error('No se pudo cargar el catálogo filtrado');
      // ====================================================================== 

      // 2. Generar Plan con Gemini (Le pasamos los días exactos)
      const planFinal = await generateRoutine(perfilFinal, catalogoDB);

      // 3. Bucle para guardar cada día (RUTINA + EJERCICIOS)
      for (let i = 0; i < planFinal.length; i++) {
        const dia = planFinal[i];
        // Aquí le asignamos el día real de la semana (1=Lunes, etc) basado en lo que eligió el usuario
        const diaSemanaReal = perfilFinal.dias_entrenamiento[i] || dia.dia_semana_sugerido;

        // A) INSERTAR LA RUTINA
        const { data: rutinaData, error: errR } = await supabase
          .from('RUTINAS')
          .insert([{ 
            user_id: user.id, 
            nombre: dia.dia_nombre, 
            descripcion: dia.descripcion,
            objetivo_id: perfilFinal.objetivo === 'perder_peso' ? 1 : perfilFinal.objetivo === 'hipertrofia' ? 2 : 3,
            nivel_id: perfilFinal.nivel === 'principiante' ? 1 : perfilFinal.nivel === 'intermedio' ? 2 : 3,
            dia_semana: diaSemanaReal, // Se guarda el día que él tocó en la burbuja
            duracion_min: perfilFinal.duracion || 45,
            es_personalizada: true
          }])
          .select()
          .single();

        if (errR) {
          console.error("Error al crear Rutina:", errR.message);
          continue; 
        }

        // B) PREPARAR LOS EJERCICIOS
        const ejerciciosAInsertar = dia.ejercicios.map((ej: any, idx: number) => ({
          rutina_id: rutinaData.id,
          ejercicio_id: ej.ejercicio_id,
          orden: idx + 1,
          series: parseInt(ej.series) || 3,
          reps: parseInt(ej.repeticiones) || 12,
          descanso_seg: parseInt(ej.descanso_segundos) || 60,
          es_calentamiento: ej.es_calentamiento !== undefined ? ej.es_calentamiento : (idx < 2)
        }));

        // C) INSERTAR EN RUTINA_EJERCICIOS
        if (ejerciciosAInsertar.length > 0) {
          const { error: errEj } = await supabase
            .from('RUTINA_EJERCICIOS')
            .insert(ejerciciosAInsertar);
          if (errEj) console.error(`Error insertando ejercicios para ${dia.dia_nombre}:`, errEj.message);
        }
      }

      // 4. GUARDAR PERFIL FÍSICO Y FINALIZAR 
      const pesoFinal = parseFloat(perfilFinal.peso_kg) || 75;
      const alturaFinal = parseInt(perfilFinal.altura_cm) || 170;

      let objetivoId = 2; 
      if (perfilFinal.objetivo === 'perder_peso') objetivoId = 1;
      if (perfilFinal.objetivo === 'fuerza') objetivoId = 5;

      let nivelId = 1; 
      if (perfilFinal.nivel === 'intermedio') nivelId = 2;
      if (perfilFinal.nivel === 'avanzado') nivelId = 3;

      let generoId = 3; 
      if (perfilFinal.genero === 'hombre') generoId = 1;
      if (perfilFinal.genero === 'mujer') generoId = 2;

      const añoActual = new Date().getFullYear();
      let añoNacimiento = añoActual - 25; 
      if (perfilFinal.edad === '18_25') añoNacimiento = añoActual - 22;
      if (perfilFinal.edad === '26_35') añoNacimiento = añoActual - 30;
      if (perfilFinal.edad === '36_45') añoNacimiento = añoActual - 40;
      if (perfilFinal.edad === '46_mas') añoNacimiento = añoActual - 50;
      const fechaNacAprox = `${añoNacimiento}-01-01`;

      // Guardamos en USUARIOS incluyendo el arreglo de días reales
      const { error: updateError } = await supabase.from('USUARIOS').upsert({
        id: user.id,
        email: user.email,
        dias_entrenamiento: perfilFinal.dias_entrenamiento, // Ej: [1, 3, 5]
        peso_kg: pesoFinal,
        altura_cm: alturaFinal,
        objetivo: objetivoId,      
        nivel: nivelId,            
        genero: generoId,          
        fecha_nacimiento: fechaNacAprox 
      });

      if (updateError) {
        console.error('❌ ERROR AL GUARDAR EN TABLA USUARIOS:', updateError.message);
        Alert.alert("Error de Guardado", updateError.message);
      } else {
        console.log("✅ Perfil de usuario guardado correctamente.");
      }

      const { error: medidaError } = await supabase.from('MEDIDAS').insert({
        usuario_id: user.id,
        peso_kg: pesoFinal,
        fecha: new Date().toISOString()
      });

      await AsyncStorage.setItem(`onboarding_${user.id}`, 'true');
      router.replace('/(tabs)/home');

    } catch (e: any) {
      console.error('❌ FALLO TOTAL:', e.message);
      Alert.alert('Error', e.message);
    } finally {
      setGenerando(false);
    }
  };

  if (generando) {
    const msgs = ["Analizando biometría...", "Consultando catálogo...", "Generando ADN Fitness...", "Ajustando series...", "Finalizando protocolo..."];
    return (
      <View style={s.loaderContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#000', '#111']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary} style={{transform: [{scale: 1.5}], marginBottom: 30}} />
        <Text style={s.loaderTitle}>PROCESANDO PROTOCOLO</Text>
        <Text style={s.loaderSub}>{msgs[mensajeCarga]}</Text>
      </View>
    );
  }

  // RENDERIZADO CONDICIONAL DE LOS PASOS CUSTOM
  const renderCustomStep = () => {
    if (infoPaso.type === 'input') {
      return (
        <View style={s.customContainer}>
          <View style={s.inputRow}>
            <TextInput
              style={s.bigInput}
              keyboardType="number-pad"
              value={infoPaso.id === 'peso' ? pesoInput : estaturaInputCM}
              onChangeText={infoPaso.id === 'peso' ? setPesoInput : setEstaturaInputCM}
              autoFocus
            />
            <Text style={s.unitText}>{infoPaso.id === 'peso' ? 'kg' : 'cm'}</Text>
          </View>
          <TouchableOpacity style={s.continueBtn} onPress={handleCustomNext}>
            <Text style={s.continueBtnText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      );
    }

    if (infoPaso.type === 'days') {
      return (
        <View style={s.customContainer}>
          <View style={s.daysRow}>
            {DIAS_SEMANA.map((dia) => {
              const isSelected = diasSeleccionados.includes(dia.id);
              return (
                <TouchableOpacity
                  key={dia.id}
                  style={[s.dayBubble, isSelected && s.dayBubbleSelected]}
                  onPress={() => toggleDia(dia.id)}
                >
                  <Text style={[s.dayBubbleText, isSelected && s.dayBubbleTextSelected]}>
                    {dia.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.daysHelperText}>Has seleccionado {diasSeleccionados.length} días</Text>
          <TouchableOpacity 
            style={[s.continueBtn, diasSeleccionados.length < 2 && { opacity: 0.5 }]} 
            onPress={handleCustomNext}
          >
            <Text style={s.continueBtnText}>Crear mi Rutina</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <KeyboardAvoidingView style={[s.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        {pasoActual > 0 && (
          <TouchableOpacity onPress={volverAtras} style={s.backBtn}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        )}
        <View style={s.progressContainer}>
          <View style={[s.progressBar, { width: `${((pasoActual + 1) / totalPasos) * 100}%` }]} />
        </View>
        <Text style={s.stepText}>{pasoActual + 1}/{totalPasos}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.titleSection}>
          <Text style={s.titulo}>{infoPaso.titulo}</Text>
          <Text style={s.subtitulo}>{infoPaso.subtitulo}</Text>
        </View>

        {infoPaso.custom ? renderCustomStep() : (
          <View style={s.optionsContainer}>
            {infoPaso.opciones?.map((op) => (
              <TouchableOpacity
                key={op.id}
                style={[s.card, respuestas[infoPaso.id] === op.id && s.cardSelected]}
                onPress={() => handleSelect(op.id)}
              >
                <View style={[s.iconBox, respuestas[infoPaso.id] === op.id && s.iconBoxSelected]}>
                  <Ionicons name={op.icon as any} size={26} color={respuestas[infoPaso.id] === op.id ? '#000' : colors.primary} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={[s.cardLabel, respuestas[infoPaso.id] === op.id && {color: colors.primary}]}>{op.label}</Text>
                  <Text style={s.cardDesc}>{op.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 60, gap: 15 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', borderRadius: 20 },
  progressContainer: { flex: 1, height: 6, backgroundColor: '#111', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: colors.primary },
  stepText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 50 },
  titleSection: { marginBottom: 30 },
  titulo: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8 },
  subtitulo: { fontSize: 16, color: '#999' },
  optionsContainer: { gap: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0C0C0C', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#1A1A1A' },
  cardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(255, 77, 0, 0.05)' },
  iconBox: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconBoxSelected: { backgroundColor: colors.primary },
  cardLabel: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  cardDesc: { fontSize: 12, color: '#666' },
  customContainer: { alignItems: 'center', marginTop: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 50 },
  bigInput: { color: '#fff', fontSize: 72, fontWeight: '900', borderBottomWidth: 2, borderBottomColor: colors.primary, textAlign: 'center', minWidth: 120 },
  unitText: { color: '#666', fontSize: 24, marginLeft: 10, marginBottom: 15 },
  
  // 🔥 ESTILOS NUEVOS PARA EL SELECTOR DE DÍAS
  daysRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20, marginTop: 10 },
  dayBubble: { width: 55, height: 55, borderRadius: 30, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1A1A1A' },
  dayBubbleSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayBubbleText: { color: '#666', fontSize: 18, fontWeight: 'bold' },
  dayBubbleTextSelected: { color: '#000' },
  daysHelperText: { color: '#666', fontSize: 14, marginBottom: 40 },
  
  continueBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 30, width: '100%', gap: 10 },
  continueBtnText: { color: '#000', fontSize: 18, fontWeight: '900' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loaderTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2, marginBottom: 10 },
  loaderSub: { fontSize: 14, color: '#666' },
});