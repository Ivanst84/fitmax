// Ruta: app/onboarding/index.tsx
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Dimensions, TextInput
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Catálogos
const OBJETIVOS = [
  { id: 1, icon: 'trending-down', label: 'Perder peso', desc: 'Quemar grasa y definir' },
  { id: 2, icon: 'barbell',       label: 'Ganar músculo', desc: 'Aumentar masa muscular' },
  { id: 3, icon: 'body',          label: 'Tonificar',    desc: 'Definir y fortalecer' },
];

const NIVELES = [
  { id: 1, icon: 'star-outline',  label: 'Principiante', desc: 'Menos de 6 meses' },
  { id: 2, icon: 'star-half',     label: 'Intermedio',   desc: '6 meses a 2 años' },
];

const DIAS_SEMANA = [
  { id: 1, label: 'Lunes', short: 'Lun' }, { id: 2, label: 'Martes', short: 'Mar' },
  { id: 3, label: 'Miércoles', short: 'Mié' }, { id: 4, label: 'Jueves', short: 'Jue' },
  { id: 5, label: 'Viernes', short: 'Vie' }, { id: 6, label: 'Sábado', short: 'Sáb' },
  { id: 7, label: 'Domingo', short: 'Dom' },
];

const LUGARES = [
  { id: 1, icon: 'home', label: 'En Casa', desc: 'Sin equipo o equipo básico' },
  { id: 2, icon: 'fitness', label: 'Gimnasio', desc: 'Máquinas y pesas libres' },
];

const GENEROS = [
  { id: 1, icon: 'female', label: 'Mujer' },
  { id: 2, icon: 'male',   label: 'Hombre' },
];

const TOTAL_PASOS = 6;

export default function OnboardingScreen() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  
  // Estados
  const [objetivo, setObjetivo] = useState<number | null>(null);
  const [nivel, setNivel]       = useState<number | null>(null);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const [lugar, setLugar]       = useState<number | null>(null);
  const [edad, setEdad]         = useState<string>('');
  const [genero, setGenero]     = useState<number | null>(null);
  
  const [guardando, setGuardando] = useState(false);

  const toggleDia = (id: number) => {
    setDiasSeleccionados(prev => 
      prev.includes(id) ? prev.filter(dia => dia !== id) : [...prev, id].sort((a, b) => a - b)
    );
  };

  const puedeAvanzar = () => {
    if (paso === 1) return objetivo !== null;
    if (paso === 2) return nivel !== null;
    if (paso === 3) return diasSeleccionados.length > 0;
    if (paso === 4) return lugar !== null;
    if (paso === 5) return edad.trim().length > 1 && parseInt(edad) > 10;
    if (paso === 6) return genero !== null;
    return false;
  };

  const avanzar = async () => {
    if (paso < TOTAL_PASOS) {
      setPaso(p => p + 1);
      return;
    }
    await guardarPerfil();
  };

  const guardarPerfil = async () => {
    try {
      setGuardando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sin sesión');

      // Convertimos edad a un aproximado de fecha nacimiento para tu tabla
      const anioNacimiento = new Date().getFullYear() - parseInt(edad);
      const fechaNacimiento = `${anioNacimiento}-01-01`;

      const { error } = await supabase
        .from('USUARIOS')
        .upsert({
          id: user.id,
          email: user.email,
          nombre: user.user_metadata?.full_name?.split(' ')[0] || 'Usuario',
          objetivo: objetivo,
          nivel: nivel,
          genero: genero,
          fecha_nacimiento: fechaNacimiento,
          dias_entrenamiento: diasSeleccionados,
          // NOTA: Asegúrate de tener una columna "lugar_entrenamiento" (int) en tu tabla USUARIOS
          fecha_registro: new Date().toISOString(),
        });

      if (error) throw error;
      await AsyncStorage.setItem(`onboarding_${user.id}`, 'done');
      router.replace('/(tabs)/home');
      
    } catch (e: any) {
      console.error('Error guardando perfil:', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const titulos = [
    '¿Cuál es tu objetivo?', '¿Cuál es tu nivel?', '¿Qué días vas a entrenar?',
    '¿Dónde entrenarás?', '¿Cuántos años tienes?', '¿Cómo te identificas?'
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.progressBar}>
        {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
          <View key={i} style={[s.progressDot, i < paso && s.progressDotActive]} />
        ))}
      </View>

      <View style={s.headerArea}>
        <Text style={s.stepLabel}>PASO {paso} DE {TOTAL_PASOS}</Text>
        <Text style={s.titulo}>{titulos[paso - 1]}</Text>
      </View>

      <ScrollView style={s.opcionesScroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.opcionesContent}>
        
        {paso === 1 && OBJETIVOS.map(op => (
          <TouchableOpacity key={op.id} style={[s.opcion, objetivo === op.id && s.opcionActiva]} onPress={() => setObjetivo(op.id)}>
            <Ionicons name={op.icon as any} size={24} color={objetivo === op.id ? colors.primary : colors.textSecondary} style={s.opcionIconSimple} />
            <View style={s.opcionTexto}><Text style={s.opcionLabel}>{op.label}</Text></View>
          </TouchableOpacity>
        ))}

        {paso === 2 && NIVELES.map(op => (
          <TouchableOpacity key={op.id} style={[s.opcion, nivel === op.id && s.opcionActiva]} onPress={() => setNivel(op.id)}>
            <Ionicons name={op.icon as any} size={24} color={nivel === op.id ? colors.primary : colors.textSecondary} style={s.opcionIconSimple} />
            <View style={s.opcionTexto}><Text style={s.opcionLabel}>{op.label}</Text></View>
          </TouchableOpacity>
        ))}

        {paso === 3 && (
          <View style={s.diasGrid}>
            {DIAS_SEMANA.map(op => (
              <TouchableOpacity key={op.id} style={[s.diaCard, diasSeleccionados.includes(op.id) && s.diaCardActivo]} onPress={() => toggleDia(op.id)}>
                <Text style={[s.diaNum, diasSeleccionados.includes(op.id) && s.diaNumActivo]}>{op.short}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 🚀 NUEVO PASO 4: LUGAR */}
        {paso === 4 && LUGARES.map(op => (
          <TouchableOpacity key={op.id} style={[s.opcion, lugar === op.id && s.opcionActiva]} onPress={() => setLugar(op.id)}>
            <Ionicons name={op.icon as any} size={24} color={lugar === op.id ? colors.primary : colors.textSecondary} style={s.opcionIconSimple} />
            <View style={s.opcionTexto}>
              <Text style={s.opcionLabel}>{op.label}</Text>
              <Text style={s.opcionDesc}>{op.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* 🚀 NUEVO PASO 5: EDAD */}
        {paso === 5 && (
          <View style={s.inputContainer}>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              maxLength={2}
              placeholder="Ej: 28"
              placeholderTextColor={colors.textMuted}
              value={edad}
              onChangeText={setEdad}
              autoFocus
            />
            <Text style={s.inputSuffix}>años</Text>
          </View>
        )}

        {paso === 6 && GENEROS.map(op => (
          <TouchableOpacity key={op.id} style={[s.opcion, genero === op.id && s.opcionActiva]} onPress={() => setGenero(op.id)}>
            <Ionicons name={op.icon as any} size={24} color={genero === op.id ? colors.primary : colors.textSecondary} style={s.opcionIconSimple} />
            <View style={s.opcionTexto}><Text style={s.opcionLabel}>{op.label}</Text></View>
          </TouchableOpacity>
        ))}

      </ScrollView>

      <View style={s.footer}>
        {paso > 1 && (
          <TouchableOpacity style={s.backBtn} onPress={() => setPaso(p => p - 1)}>
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.nextBtn, !puedeAvanzar() && s.nextBtnDisabled]} onPress={avanzar} disabled={!puedeAvanzar() || guardando}>
          <Text style={s.nextBtnText}>{guardando ? 'Guardando...' : paso < TOTAL_PASOS ? 'Siguiente' : '¡Empezar!'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  progressBar: { flexDirection: 'row', gap: 6, marginBottom: spacing.xl },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface },
  progressDotActive: { backgroundColor: colors.primary },
  headerArea: { marginBottom: spacing.xl },
  stepLabel: { fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  titulo: { fontSize: 30, fontWeight: '900', color: colors.textPrimary, marginBottom: 8 },
  opcionesScroll: { flex: 1 },
  opcionesContent: { gap: 12, paddingBottom: 20 },
  opcion: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1.5, borderColor: 'transparent' },
  opcionActiva: { borderColor: colors.primary, backgroundColor: 'rgba(255,77,0,0.1)' },
  opcionIconSimple: { marginRight: spacing.md },
  opcionTexto: { flex: 1 },
  opcionLabel: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  opcionDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  diasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  diaCard: { width: (width - spacing.lg * 2 - 20) / 3, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.xl, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  diaCardActivo: { borderColor: colors.primary, backgroundColor: colors.primary },
  diaNum: { fontSize: 18, fontWeight: '900', color: colors.textSecondary },
  diaNumActivo: { color: '#000' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  input: { flex: 1, color: colors.textPrimary, fontSize: 32, fontWeight: 'bold', paddingVertical: 20 },
  inputSuffix: { color: colors.textSecondary, fontSize: 20, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  backBtn: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  nextBtn: { flex: 1, height: 56, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: colors.surface },
  nextBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
});