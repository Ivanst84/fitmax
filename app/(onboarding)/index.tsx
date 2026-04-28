import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, ActivityIndicator, 
  StatusBar, Alert, TextInput, KeyboardAvoidingView, Platform,
  TouchableOpacity
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

import PressableCard from '../../components/ui/PressableCard';

const DIAS_SEMANA = [
  { id: 1, label: 'L', full: 'Lunes' },
  { id: 2, label: 'M', full: 'Martes' },
  { id: 3, label: 'M', full: 'Miércoles' },
  { id: 4, label: 'J', full: 'Jueves' },
  { id: 5, label: 'V', full: 'Viernes' },
  { id: 6, label: 'S', full: 'Sábado' },
  { id: 7, label: 'D', full: 'Domingo' }
];

// 🚀 MEJORA 1: Eliminado el nivel Avanzado
const PASOS = [
  { id: 'genero', titulo: '¿Cuál es tu género?', subtitulo: 'Calculamos tu metabolismo basal.', opciones: [{ id: 'hombre', label: 'Hombre', desc: 'Prioridad estándar', icon: 'man-outline' }, { id: 'mujer', label: 'Mujer', desc: 'Mayor recuperación', icon: 'woman-outline' }, { id: 'otro', label: 'Otro', desc: 'Plan balanceado', icon: 'person-outline' }] },
  { id: 'edad', titulo: '¿Qué edad tienes?', subtitulo: 'Ajustamos carga articular.', opciones: [{ id: '18_25', label: '18-25 años', desc: 'Recuperación Full', icon: 'battery-full-outline' }, { id: '26_35', label: '26-35 años', desc: 'Pico de fuerza', icon: 'battery-half-outline' }, { id: '36_45', label: '36-45 años', desc: 'Fuerza y movilidad', icon: 'shield-checkmark-outline' }, { id: '46_mas', label: '46+ años', desc: 'Longevidad', icon: 'heart-outline' }] },
  { id: 'peso', titulo: '¿Cuánto pesas?', subtitulo: 'Vital para calcular calorías e IMC.', custom: true, type: 'input' },
  { id: 'estatura', titulo: '¿Cuánto mides?', subtitulo: 'Para tus palancas musculares.', custom: true, type: 'input' },
  { id: 'nivel', titulo: '¿Cuál es tu nivel?', subtitulo: 'Técnica y volumen de carga.', opciones: [{ id: 'principiante', label: 'Principiante', desc: '< 6 meses entrenando', icon: 'leaf-outline' }, { id: 'intermedio', label: 'Intermedio', desc: '6+ meses de experiencia', icon: 'barbell-outline' }] },
  { id: 'objetivo', titulo: '¿Tu meta principal?', subtitulo: 'Define rangos de reps y series.', opciones: [{ id: 'perder_peso', label: 'Perder Grasa', desc: 'Déficit y cardio', icon: 'flame-outline' }, { id: 'hipertrofia', label: 'Ganar Músculo', desc: '8-12 reps', icon: 'trending-up-outline' }, { id: 'fuerza', label: 'Fuerza Pura', desc: '1-5 reps', icon: 'fitness-outline' }] },
  { id: 'enfoque', titulo: '¿Qué zona priorizar?', subtitulo: 'Volumen extra en esta área.', opciones: [{ id: 'fullbody', label: 'Cuerpo Completo', desc: 'Armónico', icon: 'body-outline' }, { id: 'superior', label: 'Tren Superior', desc: 'Torso y brazos', icon: 'shirt-outline' }, { id: 'inferior', label: 'Tren Inferior', desc: 'Pierna y glúteo', icon: 'walk-outline' }] },
  { id: 'frecuencia', titulo: '¿Qué días entrenarás?', subtitulo: 'Selecciona los días que irás al gimnasio.', custom: true, type: 'days' },
  { id: 'duracion', titulo: '¿Tiempo por sesión?', subtitulo: 'Número de ejercicios.', opciones: [{ id: 30, label: '30 Minutos', desc: 'Sin descansos', icon: 'timer-outline' }, { id: 45, label: '45 Minutos', desc: 'Recomendado', icon: 'hourglass-outline' }, { id: 60, label: '60+ Minutos', desc: 'Completo', icon: 'stopwatch-outline' }] },
  { id: 'equipo', titulo: '¿Dónde entrenarás?', subtitulo: 'Solo ejercicios disponibles.', opciones: [{ id: 'casa', label: 'En Casa', desc: 'Peso corporal', icon: 'home-outline' }, { id: 'mancuernas', label: 'Mancuernas', desc: 'Gym básico', icon: 'disc-outline' }, { id: 'gym', label: 'Gym Completo', desc: 'Máquinas y racks', icon: 'business-outline' }] }
];

// TIPS PARA MATAR EL TIEMPO EN EL LOADER
const CURIOSIDADES = [
  "Analizando biometría...", 
  "💡 Tip: El músculo crece mientras duermes, no en el gimnasio.",
  "Estructurando series y repeticiones...",
  "💡 Tip: Tomar agua entre series mejora tu rendimiento un 15%.",
  "Ajustando cargas articulares...",
  "💡 Tip: La constancia vence a la intensidad. ¡No te rindas!",
  "Casi listo..."
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
  
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);

  const totalPasos = PASOS.length;
  const infoPaso = PASOS[pasoActual];

  useEffect(() => {
    if (!generando) return;
    const interval = setInterval(() => setMensajeCarga(prev => (prev + 1) % CURIOSIDADES.length), 3000);
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
    
    if (infoPaso.id === 'peso') {
      const peso = parseFloat(pesoInput);
      if (isNaN(peso) || peso < 30 || peso > 350) {
        Alert.alert("Peso inválido", "Por favor ingresa un peso realista (entre 30 y 350 kg). 🏋️‍♂️");
        return;
      }
      nuevas.peso_kg = peso;
    }

    if (infoPaso.id === 'estatura') {
      const estatura = parseFloat(estaturaInputCM);
      if (isNaN(estatura) || estatura < 100 || estatura > 250) {
        Alert.alert("Estatura inválida", "Ingresa una estatura entre 100 y 250 cm. 📏");
        return;
      }
      nuevas.altura_cm = estatura;
    }
    
    if (infoPaso.id === 'frecuencia') {
      if (diasSeleccionados.length < 2) {
        Alert.alert("Atención", "Selecciona al menos 2 días para que valga la pena el sudor.");
        return;
      }
      nuevas.dias_entrenamiento = diasSeleccionados;
      nuevas.frecuencia = diasSeleccionados.length; 
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

  const finalizarCuestionario = async (perfilFinal: any) => {
    setGenerando(true); 

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no encontrado');

      const { data: rutinasExistentes } = await supabase.from('RUTINAS').select('id').eq('user_id', user.id).limit(1);

      if (rutinasExistentes && rutinasExistentes.length > 0) {
        await AsyncStorage.setItem(`onboarding_${user.id}`, 'true');
        router.replace('/(tabs)/home');
        return;
      }

      const { data: musculosDB } = await supabase.from('CAT_MUSCULOS').select('id, grupo_key');
      const mapaMusculos: Record<number, string> = {};
      if (musculosDB) musculosDB.forEach(m => { mapaMusculos[m.id] = m.grupo_key; });

      let query = supabase.from('EJERCICIOS').select(`id, nombre, nivel_id, es_por_tiempo, musculo_id`);

      if (perfilFinal.equipo === 'casa') query = query.in('equipo_id', [1]); 
      else if (perfilFinal.equipo === 'mancuernas') query = query.in('equipo_id', [1, 2]); 

      const { data: catalogoDB, error: errorCat } = await query;
      if (errorCat || !catalogoDB) throw new Error('Error al cargar catálogo de ejercicios');

      const catalogoConGrupos = catalogoDB.map((ej: any) => ({
        ...ej, CAT_MUSCULOS: { grupo_key: mapaMusculos[ej.musculo_id] || 'other' }
      }));
      
      let catalogoOptimizado = catalogoConGrupos;

      if (perfilFinal.enfoque !== 'fullbody') {
        const shuffle = (arr: any[]) => [...arr].sort(() => 0.5 - Math.random());
        const upper = catalogoConGrupos.filter((e: any) => e.CAT_MUSCULOS.grupo_key === 'upper_body');
        const lower = catalogoConGrupos.filter((e: any) => e.CAT_MUSCULOS.grupo_key === 'lower_body');
        const core = catalogoConGrupos.filter((e: any) => e.CAT_MUSCULOS.grupo_key === 'core' || e.CAT_MUSCULOS.grupo_key === 'general');

        if (perfilFinal.enfoque === 'superior') catalogoOptimizado = [...shuffle(upper).slice(0, 30), ...shuffle(lower).slice(0, 10), ...shuffle(core).slice(0, 10)];
        else if (perfilFinal.enfoque === 'inferior') catalogoOptimizado = [...shuffle(lower).slice(0, 30), ...shuffle(upper).slice(0, 10), ...shuffle(core).slice(0, 10)];
      }

      // 🚀 MEJORA 5: EL ESCUDO ANTI-CAÍDAS (FALLBACK)
      let planFinal;
      try {
        // Intentamos con la Hidra de IA
        planFinal = await generateRoutine(perfilFinal, catalogoOptimizado);
      } catch (errorIA) {
        console.warn("⚠️ Las APIs de IA fallaron. Activando Protocolo de Plantilla Local.");
        
        // Generamos una rutina base nosotros mismos mezclando el catálogo
        const dias = perfilFinal.dias_entrenamiento?.length || 3;
        planFinal = Array.from({ length: dias }).map((_, i) => {
           const mezclado = [...catalogoOptimizado].sort(() => 0.5 - Math.random());
           const calentamiento = mezclado.find(e => e.es_por_tiempo) || mezclado[0];
           const fuerza = mezclado.filter(e => !e.es_por_tiempo).slice(0, 4);
           
           return {
             dia_nombre: `Fase Adaptación ${i+1}`,
             descripcion: "Entrenamiento base generado offline.",
             ejercicios: [
               { ejercicio_id: calentamiento.id, series: 1, repeticiones: '60', descanso_segundos: 0, es_calentamiento: true },
               ...fuerza.map(f => ({ ejercicio_id: f.id, series: 3, repeticiones: '12', descanso_segundos: 60, es_calentamiento: false }))
             ]
           };
        });
      }

      const agendaOrdenada = [...perfilFinal.dias_entrenamiento].sort((a, b) => a - b);

      await Promise.all(planFinal.map(async (diaIA: any, index: number) => {
        const diaSemanaAsignado = agendaOrdenada[index % agendaOrdenada.length];
        const nombreFinal = `Día ${index + 1} - ${diaIA.dia_nombre}`;

        const { data: rutinaData, error: errR } = await supabase
          .from('RUTINAS')
          .insert([{ 
            user_id: user.id, 
            nombre: nombreFinal, 
            descripcion: diaIA.descripcion,
            objetivo_id: perfilFinal.objetivo === 'perder_peso' ? 1 : perfilFinal.objetivo === 'hipertrofia' ? 2 : 3,
            nivel_id: perfilFinal.nivel === 'principiante' ? 1 : 2,
            dia_semana: diaSemanaAsignado, 
            duracion_min: perfilFinal.duracion || 45,
            es_personalizada: true
          }])
          .select()
          .single();

        if (errR) return; 

        const ejerciciosAInsertar = diaIA.ejercicios.map((ej: any, idx: number) => ({
          rutina_id: rutinaData.id,
          ejercicio_id: ej.ejercicio_id,
          orden: idx + 1,
          series: parseInt(ej.series) || 3,
          reps: parseInt(ej.repeticiones) || 12,
          descanso_seg: parseInt(ej.descanso_segundos) || 60,
          es_calentamiento: ej.es_calentamiento !== undefined ? ej.es_calentamiento : (idx < 2)
        }));

        if (ejerciciosAInsertar.length > 0) {
          await supabase.from('RUTINA_EJERCICIOS').insert(ejerciciosAInsertar);
        }
      }));

      const pesoFinal = parseFloat(perfilFinal.peso_kg) || 75;
      const alturaFinal = parseInt(perfilFinal.altura_cm) || 170;
      let objetivoId = 2; if (perfilFinal.objetivo === 'perder_peso') objetivoId = 1; if (perfilFinal.objetivo === 'fuerza') objetivoId = 5;
      let nivelId = 1; if (perfilFinal.nivel === 'intermedio') nivelId = 2;
      let generoId = 3; if (perfilFinal.genero === 'hombre') generoId = 1; if (perfilFinal.genero === 'mujer') generoId = 2;

      const añoActual = new Date().getFullYear();
      let añoNacimiento = añoActual - 25; 
      if (perfilFinal.edad === '18_25') añoNacimiento = añoActual - 22;
      if (perfilFinal.edad === '26_35') añoNacimiento = añoActual - 30;
      if (perfilFinal.edad === '36_45') añoNacimiento = añoActual - 40;
      if (perfilFinal.edad === '46_mas') añoNacimiento = añoActual - 50;
      
      await supabase.from('USUARIOS').upsert({
        id: user.id, email: user.email, dias_entrenamiento: perfilFinal.dias_entrenamiento, 
        peso_kg: pesoFinal, altura_cm: alturaFinal, objetivo: objetivoId,      
        nivel: nivelId, genero: generoId, fecha_nacimiento: `${añoNacimiento}-01-01` 
      });

      await supabase.from('MEDIDAS').insert({
        user_id: user.id, peso_kg: pesoFinal, fecha: new Date().toISOString()
      });

      // 🚀 MEJORA 2: Adiós Ghost Calibration. Transición directa.
      await AsyncStorage.setItem(`onboarding_${user.id}`, 'true');
      await AsyncStorage.setItem(`inauguracion_pendiente_${user.id}`, 'true');
      
      setGenerando(false);
      router.replace('/(tabs)/home');

    } catch (e: any) {
      console.error(' FALLO CRÍTICO:', e.message);
      Alert.alert('¡Ups!', 'Hubo un problema de conexión. Por favor, intenta de nuevo.'); 
      setGenerando(false); 
    }
  };

  if (generando) {
    return (
      <View style={s.loaderContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#000', '#111']} style={StyleSheet.absoluteFill} />
        
        {/* Spinner más estilizado */}
        <View style={s.spinnerBox}>
          <ActivityIndicator size="large" color={colors.primary} style={{transform: [{scale: 1.8}]}} />
        </View>

        <Text style={s.loaderTitle}>ARMANDO PROTOCOLO</Text>
        
        {/* Tips dinámicos */}
        <View style={s.tipContainer}>
           <Text style={s.loaderSub}>{CURIOSIDADES[mensajeCarga]}</Text>
        </View>
      </View>
    );
  }

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
          
          <PressableCard style={s.continueBtn} onPress={handleCustomNext}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={s.continueBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </View>
          </PressableCard>
        </View>
      );
    }

    if (infoPaso.type === 'days') {
      // 🚀 MEJORA 3: Lógica inteligente de recomendación
      const esPesado = respuestas.peso_kg ? parseFloat(respuestas.peso_kg) > 85 : false;
      const esNovato = respuestas.nivel === 'principiante';
      const diasRecomendados = (esPesado || esNovato) ? "3 o 4" : "4 a 5";

      return (
        <View style={s.customContainer}>
          
          {/* Mensaje de Coach Proactivo */}
          <View style={s.coachAdviceBox}>
             <Ionicons name="bulb-outline" size={20} color={colors.primary} />
             <Text style={s.coachAdviceText}>
                Para tu nivel y peso, recomendamos empezar con <Text style={{fontWeight: 'bold', color: '#fff'}}>{diasRecomendados} días</Text> a la semana.
             </Text>
          </View>

          <View style={s.daysRow}>
            {DIAS_SEMANA.map((dia) => {
              const isSelected = diasSeleccionados.includes(dia.id);
              return (
                <PressableCard
                  key={dia.id}
                  style={[s.dayBubble, isSelected && s.dayBubbleSelected]}
                  onPress={() => toggleDia(dia.id)}
                >
                  <Text style={[s.dayBubbleText, isSelected && s.dayBubbleTextSelected]}>
                    {dia.label}
                  </Text>
                </PressableCard>
              );
            })}
          </View>
          <Text style={s.daysHelperText}>Has seleccionado {diasSeleccionados.length} días</Text>
          
          <TouchableOpacity 
            style={s.continueBtn}
            activeOpacity={0.8}
            onPress={handleCustomNext}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={s.continueBtnText}>CONTINUAR</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </View>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <KeyboardAvoidingView style={[s.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        {pasoActual > 0 && (
          <PressableCard onPress={volverAtras} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </PressableCard>
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
              <PressableCard
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
              </PressableCard>
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
  
  // 🚀 ESTILOS DEL COACH PROACTIVO
  coachAdviceBox: { flexDirection: 'row', backgroundColor: 'rgba(255, 77, 0, 0.1)', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryFaded, marginBottom: 25, alignItems: 'center', gap: 10 },
  coachAdviceText: { color: '#bbb', fontSize: 14, flex: 1, lineHeight: 20 },
  
  daysRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
  dayBubble: { width: 55, height: 55, borderRadius: 30, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1A1A1A' },
  dayBubbleSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayBubbleText: { color: '#666', fontSize: 18, fontWeight: 'bold' },
  dayBubbleTextSelected: { color: '#000' },
  daysHelperText: { color: '#666', fontSize: 14, marginBottom: 40 },
  continueBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 30, width: '100%', gap: 10 },
  continueBtnText: { color: '#000', fontSize: 18, fontWeight: '900' },
  
  // 🚀 ESTILOS DEL LOADER MEJORADO
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  spinnerBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 2, borderColor: colors.primaryFaded },
  loaderTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2, marginBottom: 20 },
  tipContainer: { backgroundColor: '#111', padding: 15, borderRadius: 12, width: '90%', alignItems: 'center', minHeight: 80, justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
  loaderSub: { fontSize: 15, color: '#aaa', textAlign: 'center', fontStyle: 'italic', lineHeight: 22 },
});