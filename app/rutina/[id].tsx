import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';

interface EjercicioRutina {
  id: number;
  orden: number;
  series: number;
  reps: number;
  descanso_seg: number;
  EJERCICIOS: {
    id: string;
    nombre: string;
    descripcion: string;
    musculo_id: number;
    video_url: string;
    duracion_seg: number;
  };
}

const MUSCULOS: Record<number, string> = {
  1:'Pecho', 2:'Espalda', 4:'Hombros',
  8:'Abdomen', 11:'Cuádriceps', 12:'Isquiotibiales',
};

export default function RutinaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [rutina, setRutina] = useState<any>(null);
  const [ejercicios, setEjercicios] = useState<EjercicioRutina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [completados, setCompletados] = useState<Set<number>>(new Set());

  useEffect(() => { cargarDatos(); }, [id]);

  const cargarDatos = async () => {
    const [{ data: rut }, { data: ejs }] = await Promise.all([
      supabase.from('RUTINAS').select('*').eq('id', id).single(),
      supabase.from('RUTINA_EJERCICIOS')
        .select('*, EJERCICIOS(*)')
        .eq('rutina_id', id)
        .order('orden', { ascending: true }),
    ]);
    setRutina(rut);
    setEjercicios(ejs || []);
    setCargando(false);
  };

  const toggleCompletado = (orden: number) => {
    setCompletados(prev => {
      const next = new Set(prev);
      next.has(orden) ? next.delete(orden) : next.add(orden);
      return next;
    });
  };

  const todosCompletados = ejercicios.length > 0 && 
    completados.size === ejercicios.length;

  if (cargando) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>‹ Volver</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.title}>{rutina?.nombre}</Text>
      <Text style={s.subtitle}>
        {ejercicios.length} ejercicios · {rutina?.duracion_min} min
      </Text>

      {/* Progreso */}
      <View style={s.progressContainer}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { 
            width: `${(completados.size / ejercicios.length) * 100}%` 
          }]} />
        </View>
        <Text style={s.progressText}>
          {completados.size}/{ejercicios.length} completados
        </Text>
      </View>

      <FlatList
        data={ejercicios}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const ej = item.EJERCICIOS;
          const completado = completados.has(item.orden);
          return (
            <View style={[s.card, completado && s.cardDone]}>

              {/* Número orden */}
              <View style={[s.ordenCircle, completado && s.ordenDone]}>
                <Text style={s.ordenText}>
                  {completado ? '✓' : index + 1}
                </Text>
              </View>

              <View style={s.cardInfo}>
                <Text style={s.cardName}>{ej?.nombre}</Text>
                <Text style={s.cardMeta}>
                  {item.series} series · {item.reps} reps · {item.descanso_seg}s descanso
                </Text>
                {ej?.musculo_id && (
                  <View style={s.musculoBadge}>
                    <Text style={s.musculoText}>
                      {MUSCULOS[ej.musculo_id] || 'General'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.cardActions}>
                {/* Ver ejercicio */}
                <TouchableOpacity
                  style={s.verBtn}
                  onPress={() => router.push(`/exercise/${ej?.id}`)}
                >
                  <Text style={s.verText}>▶</Text>
                </TouchableOpacity>

                {/* Marcar completado */}
                <TouchableOpacity
                  style={[s.checkBtn, completado && s.checkBtnDone]}
                  onPress={() => toggleCompletado(item.orden)}
                >
                  <Text style={s.checkText}>{completado ? '✓' : '○'}</Text>
                </TouchableOpacity>
              </View>

            </View>
          );
        }}
      />

      {/* Botón finalizar */}
      {todosCompletados && (
        <TouchableOpacity 
          style={s.finalizarBtn}
          onPress={() => router.back()}
        >
          <Text style={s.finalizarText}>🎉 ¡Rutina completada!</Text>
        </TouchableOpacity>
      )}

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 60 },
  center: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor: colors.background },
  header: { marginBottom: spacing.sm },
  back: { color: colors.primary, fontSize:16, fontWeight:'600' },
  title: { fontSize:24, fontWeight:'bold', color: colors.textPrimary, marginBottom:4 },
  subtitle: { fontSize:14, color: colors.textSecondary, marginBottom: spacing.md },
  progressContainer: { marginBottom: spacing.lg },
  progressBar: { height:6, backgroundColor: colors.border, borderRadius: radius.sm, marginBottom:6 },
  progressFill: { height:6, backgroundColor: colors.primary, borderRadius: radius.sm },
  progressText: { fontSize:12, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom:10, flexDirection:'row', alignItems:'center' },
  cardDone: { opacity:0.6, borderLeftWidth:3, borderLeftColor: colors.success },
  ordenCircle: { width:36, height:36, borderRadius: radius.full, backgroundColor: colors.primaryFaded, justifyContent:'center', alignItems:'center', marginRight: spacing.sm },
  ordenDone: { backgroundColor: colors.success },
  ordenText: { color: colors.primary, fontWeight:'bold', fontSize:15 },
  cardInfo: { flex:1 },
  cardName: { fontSize:15, fontWeight:'bold', color: colors.textPrimary, marginBottom:3 },
  cardMeta: { fontSize:12, color: colors.textSecondary, marginBottom:4 },
  musculoBadge: { backgroundColor: colors.primaryFaded, alignSelf:'flex-start', paddingHorizontal:8, paddingVertical:2, borderRadius: radius.full },
  musculoText: { color: colors.primary, fontSize:10, fontWeight:'700' },
  cardActions: { gap: spacing.sm, alignItems:'center' },
  verBtn: { width:36, height:36, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent:'center', alignItems:'center' },
  verText: { color:'#fff', fontSize:13 },
  checkBtn: { width:36, height:36, borderRadius: radius.full, borderWidth:2, borderColor: colors.border, justifyContent:'center', alignItems:'center' },
  checkBtnDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkText: { color: colors.textSecondary, fontSize:16, fontWeight:'bold' },
  finalizarBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: spacing.md, alignItems:'center', marginBottom: spacing.lg },
  finalizarText: { color:'#fff', fontWeight:'bold', fontSize:16 },
});