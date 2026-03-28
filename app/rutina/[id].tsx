// Ruta: app/rutina/[id].tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useRoutineDetail } from '../../hooks/useRoutineDetail';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { rutina, ejercicios, cargando, error, refetch } = useRoutineDetail(id);

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !rutina) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Error al cargar'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.lg, 
          paddingBottom: insets.bottom + 120 
        }}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Detalle de Rutina</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ENTRENAMIENTO</Text>
          </View>
          <Text style={styles.title}>{rutina.nombre}</Text>
          <Text style={styles.desc}>{rutina.descripcion}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.statText}>{rutina.duracion_min} min</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="fitness-outline" size={18} color={colors.primary} />
              <Text style={styles.statText}>{ejercicios.length} Ejercicios</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Ejercicios</Text>
        
        {ejercicios.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            onPress={() => router.push(`/exercise/${item.ejercicio_id}`)}
            style={styles.exerciseCard}
            activeOpacity={0.7}
          >
            <View style={styles.imgBox}>
              {item.ejercicio.imagen_url ? (
                <Image source={{ uri: item.ejercicio.imagen_url }} style={styles.img} />
              ) : (
                <Ionicons name="barbell" size={24} color={colors.textSecondary} />
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.exName}>{item.ejercicio.nombre}</Text>
              <Text style={styles.exMeta}>{item.series} Series • {item.repeticiones} Reps</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <TouchableOpacity 
          style={styles.mainBtn}
          onPress={() => router.push({ pathname: "/workout/session", params: { rutinaId: id } })}
        >
          <Text style={styles.mainBtnText}>EMPEZAR ENTRENAMIENTO</Text>
          <Ionicons name="play" size={20} color={colors.background} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  navTitle: { ...typography.h3, color: colors.textPrimary },
  backBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  heroCard: { marginBottom: spacing.xl },
  badge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start', marginBottom: spacing.md },
  badgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  title: { ...typography.h1, fontSize: 34, color: colors.textPrimary, marginBottom: spacing.xs },
  desc: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 10, borderRadius: radius.md },
  statText: { color: colors.textPrimary, fontWeight: '700', marginLeft: 8, fontSize: 14 },
  sectionTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.lg, marginBottom: spacing.md },
  imgBox: { width: 60, height: 60, borderRadius: radius.md, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  info: { flex: 1, marginLeft: spacing.md },
  exName: { ...typography.h3, color: colors.textPrimary, fontSize: 16 },
  exMeta: { color: colors.textSecondary, fontSize: 13 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.background, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  mainBtn: { backgroundColor: colors.primary, height: 60, borderRadius: radius.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  mainBtnText: { color: colors.background, fontSize: 16, fontWeight: '900' },
  errorText: { color: colors.textPrimary, marginTop: 20 },
  retryBtn: { marginTop: 20, backgroundColor: colors.primary, padding: 12, borderRadius: radius.md },
  retryText: { color: colors.background, fontWeight: 'bold' }
});