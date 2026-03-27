import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';

interface Ejercicio {
  id: string;
  nombre: string;
  descripcion: string;
  musculo_id: number;
  nivel_id: number;
  video_url: string;
  duracion_seg: number;
  es_premium: boolean;
}

const MUSCULOS: Record<number, string> = {
  1:'Pecho', 2:'Espalda', 3:'Espalda baja', 4:'Hombros',
  5:'Bíceps', 6:'Tríceps', 8:'Abdomen', 11:'Cuádriceps',
  12:'Isquiotibiales',
};

const NIVELES: Record<number, string> = {
  1:'Principiante', 2:'Intermedio', 3:'Avanzado'
};

export default function ExercisesScreen() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => { cargarEjercicios(); }, []);

  const cargarEjercicios = async () => {
    const { data } = await supabase
      .from('EJERCICIOS')
      .select('*')
      .order('nombre', { ascending: true });
    setEjercicios(data || []);
    setCargando(false);
  };

  const filtrados = filtro
    ? ejercicios.filter(e => e.musculo_id === filtro)
    : ejercicios;

  const filtros = [
    { id: null, label: 'Todos' },
    { id: 1,    label: 'Pecho' },
    { id: 2,    label: 'Espalda' },
    { id: 4,    label: 'Hombros' },
    { id: 11,   label: 'Piernas' },
    { id: 8,    label: 'Core' },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <Text style={s.title}>Ejercicios</Text>
      <Text style={s.subtitle}>{ejercicios.length} ejercicios disponibles</Text>

      {/* Filtros */}
      <View style={s.filtros}>
        {filtros.map(f => (
          <TouchableOpacity
            key={String(f.id)}
            style={[s.filtroBtn, filtro === f.id && s.filtroBtnActivo]}
            onPress={() => setFiltro(f.id)}
          >
            <Text style={[s.filtroText, filtro === f.id && s.filtroTextActivo]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {cargando ? (
        <Text style={s.loading}>Cargando...</Text>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.8}
              onPress={() => router.push(`/exercise/${item.id}`)}
            >
              {/* Thumbnail placeholder */}
              <View style={s.thumbnail}>
                <Text style={s.thumbnailIcon}>▶</Text>
              </View>

              <View style={s.cardInfo}>
                <Text style={s.cardName}>{item.nombre}</Text>
                <View style={s.tags}>
                  <View style={s.tag}>
                    <Text style={s.tagText}>{MUSCULOS[item.musculo_id] || 'General'}</Text>
                  </View>
                  <View style={[s.tag, s.tagNivel]}>
                    <Text style={s.tagText}>{NIVELES[item.nivel_id] || ''}</Text>
                  </View>
                </View>
                {item.duracion_seg && (
                  <Text style={s.duracion}>⏱ {item.duracion_seg} seg</Text>
                )}
              </View>

              {item.es_premium && (
                <View style={s.premiumBadge}>
                  <Text style={s.premiumText}>PRO</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 60 },
  title: { fontSize:28, fontWeight:'bold', color: colors.textPrimary, marginBottom:4 },
  subtitle: { fontSize:14, color: colors.textSecondary, marginBottom: spacing.md },
  filtros: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom: spacing.md },
  filtroBtn: { paddingHorizontal:14, paddingVertical:6, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth:1, borderColor: colors.border },
  filtroBtnActivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  filtroText: { fontSize:12, color: colors.textSecondary, fontWeight:'600' },
  filtroTextActivo: { color:'#fff' },
  loading: { color: colors.textSecondary, textAlign:'center', marginTop:40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom:12, flexDirection:'row', alignItems:'center' },
  thumbnail: { width:64, height:64, borderRadius: radius.sm, backgroundColor: colors.primaryFaded, justifyContent:'center', alignItems:'center', marginRight: spacing.md },
  thumbnailIcon: { fontSize:22, color: colors.primary },
  cardInfo: { flex:1 },
  cardName: { fontSize:15, fontWeight:'bold', color: colors.textPrimary, marginBottom:6 },
  tags: { flexDirection:'row', gap:6, marginBottom:4 },
  tag: { backgroundColor:'#FFFFFF11', paddingHorizontal:8, paddingVertical:2, borderRadius: radius.full },
  tagNivel: { backgroundColor: colors.primaryFaded },
  tagText: { fontSize:10, color: colors.textSecondary, fontWeight:'600' },
  duracion: { fontSize:12, color: colors.textMuted },
  premiumBadge: { backgroundColor:'#F59E0B', paddingHorizontal:8, paddingVertical:3, borderRadius: radius.sm },
  premiumText: { fontSize:10, fontWeight:'bold', color:'#000' },
});