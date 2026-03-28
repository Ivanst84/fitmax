import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  StatusBar,
  StyleSheet
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { HistorialSesion } from '../../types/history.types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate, formatDuration, getRelativeTime } from '../../lib/dateUtils';
import { LinearGradient } from 'expo-linear-gradient';

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<HistorialSesion[]>([]);
  const insets = useSafeAreaInsets();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (e) {
      console.error('FitMax Architecture Error [History]:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Premium Estilo Nike Training Club */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HISTORIAL</Text>
        <Text style={styles.headerSubtitle}>Tus victorias acumuladas</Text>
      </View>

      {loading && sessions.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={loading} 
              onRefresh={fetchHistory} 
              tintColor={colors.primary} 
            />
          }
        >
          {sessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="trophy-outline" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>
                El gimnasio te espera.{"\n"}Registra tu primera sesión.
              </Text>
            </View>
          ) : (
            sessions.map((session) => (
              <TouchableOpacity 
                key={session.id}
                activeOpacity={0.85}
                style={styles.cardWrapper}
              >
                <LinearGradient
                  colors={['#1c1c1e', '#000000']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.routineInfo}>
                      <Text style={styles.routineName} numberOfLines={1}>
                        {session.nombre_rutina}
                      </Text>
                      <View style={styles.dateRow}>
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateBadgeText}>
                            {formatDate(session.fecha)}
                          </Text>
                        </View>
                        <View style={styles.dotSeparator} />
                        <Text style={styles.relativeTime}>
                          {getRelativeTime(session.fecha)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.moreOptions}>
                      <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                    </View>
                  </View>

                  {/* Stats Grid con Glassmorphism effect */}
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Ionicons name="time-outline" size={18} color={colors.primary} />
                      <Text style={styles.statValue}>
                        {formatDuration(session.duracion_segundos)}
                      </Text>
                      <Text style={styles.statLabel}>TIEMPO</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.statBox}>
                      <Ionicons name="flame-outline" size={18} color={colors.primary} />
                      <Text style={styles.statValue}>
                        {session.volumen_total_kg} <Text style={styles.unit}>KG</Text>
                      </Text>
                      <Text style={styles.statLabel}>VOLUMEN</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.statBox}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                      <Text style={styles.statValue}>
                        {session.sets_completados}
                      </Text>
                      <Text style={styles.statLabel}>SETS</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerSubtitle: {
    color: '#8e8e93',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  cardWrapper: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardGradient: {
    padding: 24,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3a3a3c',
    marginHorizontal: 10,
  },
  relativeTime: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '700',
  },
  moreOptions: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
  unit: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 9,
    color: '#636366',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrapper: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 32,
    borderRadius: 100,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: {
    color: '#636366',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
});