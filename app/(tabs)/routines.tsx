import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';

interface Rutina {
  id: string;
  nombre: string;
  descripcion: string;
  nivel_id: number;
  duracion_min: number;
  dia_semana: number;
}

const DIAS = ['','Lunes','Miércoles','Viernes','Jueves','Sábado'];
const NIVELES = ['','Principiante','Intermedio','Avanzado'];

export default function RoutinesScreen() {
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

      <Text style={s.title}>Mis Rutinas</Text>
      <Text style={s.subtitle}>Programa semanal</Text>

      {cargando ? (
        <Text style={s.loading}>Cargando...</Text>
      ) : (
        <FlatList
          data={rutinas}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} activeOpacity={0.8}>

              {/* Header tarjeta */}
              <View style={s.cardHeader}>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{DIAS[item.dia_semana]}</Text>
                </View>
                <View style={s.levelBadge}>
                  <Text style={s.levelText}>{NIVELES[item.nivel_id]}</Text>
                </View>
              </View>

              {/* Nombre */}
              <Text style={s.cardName}>{item.nombre}</Text>
              {item.descripcion && (
                <Text style={s.cardDesc}>{item.descripcion}</Text>
              )}

              {/* Footer */}
              <View style={s.cardFooter}>
                <Text style={s.metaText}>⏱ {item.duracion_min} min</Text>
                <TouchableOpacity style={s.startBtn}>
                  <Text style={s.startBtnText}>Iniciar</Text>
                </TouchableOpacity>
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
  title: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  loading: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  badge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  levelBadge: { backgroundColor: '#FFFFFF11', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  levelText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  cardName: { fontSize: 17, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  metaText: { fontSize: 13, color: colors.textSecondary },
  startBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.full },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});