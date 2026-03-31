import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, StatusBar } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { formatDate, formatDuration, getRelativeTime } from '../../lib/dateUtils';

interface Sesion {
  id: string;
  nombre_rutina: string;
  duracion_segundos: number;
  volumen_total_kg: number;
  sets_completados: number;
  fecha: string;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, minutos: 0, volumen: 0 });

  const fetchHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('*')
        .eq('user_id', user.id)           // Solo las del usuario logueado
        .order('fecha', { ascending: false })
        .limit(50);

      if (error) throw error;

      const datos = data || [];
      setSesiones(datos);

      // Calcular stats totales
      const totalMin = datos.reduce((acc, s) => acc + Math.floor(s.duracion_segundos / 60), 0);
      const totalVol = datos.reduce((acc, s) => acc + (s.volumen_total_kg || 0), 0);
      setStats({ total: datos.length, minutos: totalMin, volumen: Math.round(totalVol) });

    } catch (e: any) {
      console.error('History error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const onRefresh = () => { setRefreshing(true); fetchHistory(); };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>Historial</Text>
      <Text style={styles.subtitle}>Tus victorias acumuladas</Text>

      {/* Stats totales */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Sesiones</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.minutos}</Text>
          <Text style={styles.statLabel}>Minutos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.volumen}</Text>
          <Text style={styles.statLabel}>Kg totales</Text>
        </View>
      </View>

      {loading && sesiones.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {sesiones.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={56} color={colors.primary} />
              <Text style={styles.emptyTitle}>Sin sesiones aún</Text>
              <Text style={styles.emptyText}>Completa tu primer entrenamiento para verlo aquí</Text>
            </View>
          ) : (
            sesiones.map(sesion => (
              <View key={sesion.id} style={styles.card}>

                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardNombre} numberOfLines={1}>
                      {sesion.nombre_rutina}
                    </Text>
                    <View style={styles.dateRow}>
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>
                          {formatDate(sesion.fecha)}
                        </Text>
                      </View>
                      <Text style={styles.relativeTime}>
                        {getRelativeTime(sesion.fecha)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Stats de la sesión */}
                <View style={styles.cardStats}>
                  <View style={styles.cardStat}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={styles.cardStatValue}>
                      {formatDuration(sesion.duracion_segundos)}
                    </Text>
                    <Text style={styles.cardStatLabel}>TIEMPO</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.cardStat}>
                    <Ionicons name="barbell-outline" size={16} color={colors.primary} />
                    <Text style={styles.cardStatValue}>
                      {sesion.volumen_total_kg} <Text style={styles.unit}>KG</Text>
                    </Text>
                    <Text style={styles.cardStatLabel}>VOLUMEN</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.cardStat}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                    <Text style={styles.cardStatValue}>{sesion.sets_completados}</Text>
                    <Text style={styles.cardStatLabel}>SETS</Text>
                  </View>
                </View>

              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  title: { ...typography.h1, fontSize: 32, marginBottom: 4 },
  subtitle: { ...typography.body, marginBottom: spacing.lg },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.primary },
  statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },

  scrollContent: { paddingBottom: 120 },

  emptyContainer: { paddingTop: 60, alignItems: 'center', gap: spacing.md },
  emptyTitle: { ...typography.h2, color: colors.textPrimary },
  emptyText: { ...typography.body, textAlign: 'center', color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  cardHeaderLeft: { flex: 1 },
  cardNombre: { color: '#fff', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateBadge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  dateBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  relativeTime: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  cardStats: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md,
  },
  cardStat: { flex: 1, alignItems: 'center', gap: 4 },
  cardStatValue: { color: '#fff', fontSize: 15, fontWeight: '900' },
  cardStatLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '800', letterSpacing: 0.5 },
  unit: { fontSize: 10, color: colors.textSecondary },
  divider: { width: 1, height: 28, backgroundColor: colors.border },
});