import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoutines, RutinaSemana } from '../../hooks/useRoutines';
import { colors, spacing, radius, typography } from '../../constants/theme';
import PressableCard from '../../components/ui/PressableCard';

const DIAS_SHORT = ['', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export default function RoutinesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rutinas, cargando, refetch } = useRoutines();

  const renderItem = ({ item }: { item: RutinaSemana }) => {
    
    // TARJETA DE DESCANSO
    if (item.isRest) {
      return (
        <View style={s.restCard}>
          <View style={s.dateCol}><Text style={s.dateText}>{DIAS_SHORT[item.dia_real_asignado]}</Text></View>
          <View style={s.restInfo}>
            <Text style={s.restTitle}>Descanso</Text>
            <Text style={s.restSub}>Recuperación muscular</Text>
          </View>
          <Ionicons name="bed-outline" size={24} color={colors.textMuted} />
        </View>
      );
    }

    // TARJETA DE DÍA LIBRE (Para agregar)
    if (item.isEmpty) {
      return (
        <PressableCard style={s.emptyCard} onPress={() => router.push('/create-routine')}>
          <View style={s.dateCol}><Text style={s.dateTextActive}>{DIAS_SHORT[item.dia_real_asignado]}</Text></View>
          <View style={s.emptyInfo}>
            <Text style={s.emptyTitle}>Día Libre</Text>
            <Text style={s.emptySub}>Toca para crear rutina</Text>
          </View>
          <View style={s.addBtn}><Ionicons name="add" size={20} color={colors.primary} /></View>
        </PressableCard>
      );
    }

    // TARJETA DE RUTINA NORMAL
    return (
      <PressableCard style={s.activeCard} onPress={() => router.push(`/rutina/${item.id}`)}>
        <View style={s.dateCol}>
          <View style={s.activeDot} />
          <Text style={s.dateTextActive}>{DIAS_SHORT[item.dia_real_asignado]}</Text>
        </View>
        <View style={s.activeInfo}>
          <View style={s.rowBadge}>
            <Text style={s.routineName} numberOfLines={1}>{item.nombre}</Text>
            {item.isCustom && <View style={s.customBadge}><Text style={s.customBadgeText}>PROPIA</Text></View>}
          </View>
          <View style={s.metaRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={s.metaText}>{item.duracion_min || 45} min</Text>
          </View>
        </View>
        <View style={s.playBtn}><Ionicons name="chevron-forward" size={20} color="#000" /></View>
      </PressableCard>
    );
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <View>
          <Text style={s.title}>Semana</Text>
          <Text style={s.subtitle}>Tu plan de 7 días</Text>
        </View>
        <PressableCard style={s.refreshBtn} onPress={refetch}>
          <Ionicons name="refresh" size={22} color={colors.textSecondary} />
        </PressableCard>
      </View>

      {cargando ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={rutinas}
          keyExtractor={(item) => item.dia_real_asignado.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  title: { ...typography.h1 },
  subtitle: { ...typography.body },
  refreshBtn: { padding: 8, backgroundColor: colors.surface, borderRadius: radius.full },
  
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  
  dateCol: { width: 50, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.border, marginRight: spacing.md, paddingRight: spacing.sm },
  dateText: { ...typography.small, fontWeight: '700' },
  dateTextActive: { ...typography.small, fontWeight: '900', color: colors.primary },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginBottom: 4 },

  restCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, marginBottom: spacing.md, opacity: 0.6 },
  restInfo: { flex: 1 },
  restTitle: { ...typography.label, color: colors.textMuted, marginBottom: 2 },
  restSub: { ...typography.small, color: colors.textMuted },

  emptyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  emptyInfo: { flex: 1 },
  emptyTitle: { ...typography.label, marginBottom: 4 },
  emptySub: { ...typography.small },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center' },

  activeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  activeInfo: { flex: 1 },
  rowBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  routineName: { ...typography.label, flexShrink: 1, marginRight: 8 },
  customBadge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  customBadgeText: { ...typography.caption, color: colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { ...typography.small, marginLeft: 4 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
});