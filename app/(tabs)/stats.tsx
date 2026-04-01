import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Dimensions, 
  TouchableOpacity, ActivityIndicator, StatusBar 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useStatistics } from '../../hooks/useStatistics';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { stats, loading } = useStatistics();
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null);
const router = useRouter()
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const handleFilterPress = (id: number | null) => {
    Haptics.selectionAsync();
    setEquipoSeleccionado(id);
setTimeout(() => {
      router.push(`/(tabs)/exercises?equipo=${id}`);
      setEquipoSeleccionado(null); // Reseteamos el botón al volver
    }, 200);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingTop: insets.top + spacing.xl, 
          paddingBottom: 100,
          paddingHorizontal: spacing.lg 
        }}
      >
        <Text style={s.title}>Tu Progreso </Text>

        <LinearGradient 
          colors={[colors.primary, '#FF8C00']} 
          start={{x: 0, y: 0}} 
          end={{x: 1, y: 0}} 
          style={s.totalCard}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.totalLabel}>VOLUMEN TOTAL</Text>
            <Text style={s.totalValue}>{stats.totalKgs.toLocaleString()} KG</Text>
            <View style={s.comparisonBox}>
              <Ionicons name="medal" size={16} color="rgba(0,0,0,0.5)" />
              <Text style={s.totalSub}>
                ¡Equivale a {Math.round(stats.totalKgs / 5000)} elefantes! 🐘
              </Text>
            </View>
          </View>
          <Ionicons name="trophy" size={50} color="rgba(0,0,0,0.15)" />
        </LinearGradient>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Volumen Semanal</Text>
            <Ionicons name="trending-up" size={18} color={colors.primary} />
          </View>
          
          <View style={s.chartWrapper}>
            {stats.volumenSemanal.length > 0 ? (
              <View style={s.chartContainer}>
                {stats.volumenSemanal.map((d, i) => {
                  // Calculamos altura proporcional al máximo
                  const maxVal = Math.max(...stats.volumenSemanal.map(v => v.valor), 1);
                  const barHeight = (d.valor / maxVal) * 100;
                  
                  return (
                    <View key={i} style={s.barGroup}>
                      <View style={[s.bar, { height: `${Math.max(barHeight, 5)}%` }]}>
                        <LinearGradient 
                          colors={[colors.primary, 'rgba(255, 77, 0, 0.3)']} 
                          style={{ flex: 1, borderRadius: 4 }} 
                        />
                      </View>
                      <Text style={s.barLabel}>{d.fecha}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={s.emptyChart}>
                <Text style={s.emptyText}>Entrena para ver tus gráficas</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Entrena donde sea</Text>
          <View style={s.filterRow}>
            <FilterBox 
              icon="home" 
              label="En Casa" 
              sub="Sin equipo" 
              active={equipoSeleccionado === 1}
              onPress={() => handleFilterPress(1)}
            />
            <FilterBox 
              icon="fitness" 
              label="Gimnasio" 
              sub="Equipo completo" 
              active={equipoSeleccionado === 2}
              onPress={() => handleFilterPress(2)}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// Componente de Caja de Filtro
function FilterBox({ icon, label, sub, active, onPress }: any) {
  return (
    <TouchableOpacity 
      style={[s.filterBox, active && s.filterBoxActive]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={24} color={active ? '#000' : colors.primary} />
      <Text style={[s.filterLabel, active && { color: '#000' }]}>{label}</Text>
      <Text style={[s.filterSub, active && { color: 'rgba(0,0,0,0.6)' }]}>{sub}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xl },
  
  // Total Card
  totalCard: { borderRadius: radius.lg, padding: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  totalLabel: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, opacity: 0.7 },
  totalValue: { color: '#000', fontSize: 38, fontWeight: '900', marginVertical: 4 },
  comparisonBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalSub: { color: '#000', fontSize: 12, fontWeight: '700', opacity: 0.8 },

  // Sections
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { ...typography.h2, color: colors.textPrimary },

  // Chart
  chartWrapper: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, height: 200, borderWidth: 1, borderColor: colors.border },
  chartContainer: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barGroup: { alignItems: 'center', flex: 1 },
  bar: { width: 14, borderRadius: 4, marginBottom: 8 },
  barLabel: { color: colors.textMuted, fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  emptyChart: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 12 },
  filterBox: { flex: 1, backgroundColor: colors.surface, padding: 20, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  filterBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  filterSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
});