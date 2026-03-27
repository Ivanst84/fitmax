import { View, Text, FlatList, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';
import { useRouter } from 'expo-router';

interface Rutina {
  id: string;
  nombre: string;
  descripcion: string;
  dia_semana: number;
  duracion_min: number;
}

const DIAS = ['','Lunes','Miércoles','Viernes','Jueves','Sábado'];
const router = useRouter();

export default function HomeScreen() {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargarRutinas(); }, []);

  const cargarRutinas = async () => {
    const { data } = await supabase
      .from('RUTINAS')
      .select('*')
      .order('dia_semana', { ascending: true });
    setRutinas(data || []);
    setCargando(false);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Bienvenido 👋</Text>
          <Text style={s.appName}>FitMax</Text>
        </View>
        <View style={s.avatar}>
          <Text style={s.avatarText}>JD</Text>
        </View>
      </View>
      <View style={s.banner}>
        <Text style={s.bannerTitle}>Semana 1 — Principiante</Text>
        <Text style={s.bannerSub}>3 días esta semana · 0 completados</Text>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: '0%' }]} />
        </View>
      </View>
      <Text style={s.sectionTitle}>Tu rutina de la semana</Text>
      {cargando ? (
        <Text style={s.loading}>Cargando...</Text>
      ) : (
       <FlatList
          data={rutinas}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={s.card} 
              activeOpacity={0.8}
              onPress={() => router.push(`/rutina/${item.id}`)}
            >
              {/* Contenido de la tarjeta que faltaba agregar */}
              <View style={s.cardLeft}>
                <View style={s.dayBadge}>
                  <Text style={s.dayText}>{DIAS[item.dia_semana] || 'Día'}</Text>
                </View>
                <Text style={s.cardName}>{item.nombre}</Text>
                <Text style={s.cardMeta}>{item.duracion_min} min</Text>
              </View>

              <View style={s.playBtn}>
                <Text style={s.playIcon}>▶</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 60 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: spacing.lg },
  greeting: { fontSize:14, color: colors.textSecondary },
  appName: { fontSize:28, fontWeight:'bold', color: colors.primary },
  avatar: { width:42, height:42, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent:'center', alignItems:'center' },
  avatarText: { color:'#fff', fontWeight:'bold', fontSize:14 },
  banner: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderLeftWidth:4, borderLeftColor: colors.primary },
  bannerTitle: { fontSize:16, fontWeight:'bold', color: colors.textPrimary, marginBottom:4 },
  bannerSub: { fontSize:13, color: colors.textSecondary, marginBottom:12 },
  progressBar: { height:6, backgroundColor: colors.border, borderRadius: radius.sm },
  progressFill: { height:6, backgroundColor: colors.primary, borderRadius: radius.sm },
  sectionTitle: { fontSize:18, fontWeight:'bold', color: colors.textPrimary, marginBottom:14 },
  loading: { color: colors.textSecondary, textAlign:'center', marginTop:40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  cardLeft: { flex:1 },
  dayBadge: { backgroundColor: colors.primaryFaded, paddingHorizontal:10, paddingVertical:3, borderRadius: radius.full, alignSelf:'flex-start', marginBottom:8 },
  dayText: { color: colors.primary, fontSize:11, fontWeight:'700' },
  cardName: { fontSize:16, fontWeight:'bold', color: colors.textPrimary, marginBottom:4 },
  cardMeta: { fontSize:12, color: colors.textSecondary },
  playBtn: { width:40, height:40, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent:'center', alignItems:'center' },
  playIcon: { color:'#fff', fontSize:14 },
});