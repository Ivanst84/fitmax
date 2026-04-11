import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, StatusBar } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // 
import { supabase } from '../../lib/supabase';
// 🚀 Importamos el Theme y los Botones
import { colors, spacing, radius, typography, buttons } from '../../constants/theme';
import { formatDate, formatDuration, getRelativeTime } from '../../lib/dateUtils';

interface Sesion {
  id: string; nombre_rutina: string; duracion_segundos: number;
  volumen_total_kg: number; sets_completados: number;
  calorias_quemadas: number; fecha: string;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, minutos: 0, volumen: 0, calorias: 0 });

  const fetchHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('HISTORIAL_SESIONES').select('*').eq('user_id', user.id).order('fecha', { ascending: false }).limit(50);
      if (error) throw error;
      
      const datos = data || [];
      setSesiones(datos);

      const totalMin = datos.reduce((acc, s) => acc + Math.floor(s.duracion_segundos / 60), 0);
      const totalVol = datos.reduce((acc, s) => acc + (s.volumen_total_kg || 0), 0);
      const totalKcal = datos.reduce((acc, s) => acc + (s.calorias_quemadas || 0), 0);
      setStats({ total: datos.length, minutos: totalMin, volumen: Math.round(totalVol), calorias: totalKcal });

    } catch (e: any) { console.error('History error:', e.message); } 
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  const onRefresh = () => { setRefreshing(true); fetchHistory(); };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>Historial</Text>
      <Text style={styles.subtitle}>Tus victorias acumuladas</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Sesiones</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{stats.minutos}</Text><Text style={styles.statLabel}>Minutos</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{stats.volumen}</Text><Text style={styles.statLabel}>Kilos</Text></View>
        <View style={[styles.statCard, { backgroundColor: 'rgba(255, 69, 0, 0.1)', borderColor: 'rgba(255, 69, 0, 0.3)' }]}>
          <Text style={[styles.statValue, { color: '#FF4500' }]}>{stats.calorias}</Text>
          <Text style={styles.statLabel}>Kcal 🔥</Text>
        </View>
      </View>

      {loading && sesiones.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {sesiones.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="trophy-outline" size={56} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Vitrina Vacía</Text>
              <Text style={styles.emptyText}>Aún no hay sudor en la arena. Completa tu primera rutina para empezar a escribir tu historia.</Text>
              <TouchableOpacity style={[buttons.primary, { marginTop: spacing.xl }]} onPress={() => router.replace('/(tabs)/home')}>
                <Text style={buttons.primaryText}>Ir a Entrenar</Text>
                <Ionicons name="barbell" size={20} color="#000" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          ) : (
            sesiones.map(sesion => (
              <View key={sesion.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardNombre} numberOfLines={1}>{sesion.nombre_rutina}</Text>
                    <View style={styles.dateRow}>
                      <View style={styles.dateBadge}><Text style={styles.dateBadgeText}>{formatDate(sesion.fecha)}</Text></View>
                      <Text style={styles.relativeTime}>{getRelativeTime(sesion.fecha)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardStats}>
                  <View style={styles.cardStat}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={styles.cardStatValue}>{formatDuration(sesion.duracion_segundos)}</Text>
                    <Text style={styles.cardStatLabel}>TIEMPO</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.cardStat}>
                    <Ionicons name="barbell-outline" size={16} color={colors.primary} />
                    <Text style={styles.cardStatValue}>{sesion.volumen_total_kg} <Text style={styles.unit}>KG</Text></Text>
                    <Text style={styles.cardStatLabel}>VOLUMEN</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.cardStat}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                    <Text style={styles.cardStatValue}>{sesion.sets_completados}</Text>
                    <Text style={styles.cardStatLabel}>SETS</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.cardStat}>
                    <Ionicons name="flame" size={16} color="#FF4500" />
                    <Text style={[styles.cardStatValue, { color: '#FF4500' }]}>{sesion.calorias_quemadas || 0}</Text>
                    <Text style={styles.cardStatLabel}>KCAL</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  title: { ...typography.h1, marginBottom: 4 },
  subtitle: { ...typography.body, marginBottom: spacing.xl },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: { flex: 1, minWidth: '22%', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.caption, marginTop: 4 },

  scrollContent: { paddingBottom: 120 },

  // Empty State Premium
  emptyContainer: { paddingTop: 60, alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyIconBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, marginBottom: spacing.sm },
  emptyText: { ...typography.body, textAlign: 'center' },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  cardHeaderLeft: { flex: 1 },
  cardNombre: { ...typography.label, textTransform: 'uppercase', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateBadge: { backgroundColor: colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  dateBadgeText: { ...typography.caption, color: colors.primary },
  relativeTime: { ...typography.small },

  cardStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md },
  cardStat: { flex: 1, alignItems: 'center', gap: 6 },
  cardStatValue: { ...typography.label },
  cardStatLabel: { ...typography.caption },
  unit: { fontSize: 10, color: colors.textSecondary },
  divider: { width: 1, height: 28, backgroundColor: colors.border },
});