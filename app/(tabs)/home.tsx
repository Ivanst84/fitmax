import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useRoutines } from '../../hooks/useRoutines';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { rutinaHoy, cargando, refetch } = useRoutines();

  const renderPlanDeHoy = () => {
    if (cargando) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (!rutinaHoy) return null;

    // ESTADO 1: DÍA DE DESCANSO
    if (rutinaHoy.isRest) {
      return (
        <View style={[styles.card, { opacity: 0.7, paddingVertical: spacing.xl, justifyContent: 'center' }]}>
          <Ionicons name="bed-outline" size={36} color={colors.textSecondary} style={{marginBottom: 8}} />
          <Text style={styles.cardTitle}>Día de Descanso</Text>
          <Text style={styles.cardMetaText}>Tus músculos están creciendo hoy. Recupérate.</Text>
        </View>
      );
    }

    // ESTADO 2: DÍA LIBRE (Sin rutinas en la DB)
    if (rutinaHoy.isEmpty) {
      return (
        <TouchableOpacity 
          style={[styles.card, { borderStyle: 'dashed', borderColor: colors.primaryFaded }]} 
          activeOpacity={0.7}
          onPress={() => router.push('/create-routine')}
        >
          <View style={styles.cardLeft}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>HOY</Text>
            </View>
            <Text style={styles.cardTitle}>Entrenamiento Libre</Text>
            <Text style={styles.cardMetaText}>Toca para crear tu rutina de hoy</Text>
          </View>
          <View style={[styles.playButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }]}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
      );
    }

    // ESTADO 3: RUTINA NORMAL (Sistema o Propia)
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => router.push(`/rutina/${rutinaHoy.id}`)}
        style={styles.card}
      >
        <View style={styles.cardLeft}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>HOY {rutinaHoy.isCustom ? '• PROPIA' : ''}</Text>
          </View>
          <Text style={styles.cardTitle}>{rutinaHoy.nombre}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.cardMetaText}>{rutinaHoy.duracion_min || 45} min</Text>
          </View>
        </View>
        <View style={styles.playButton}>
          <Ionicons name="play" size={20} color={colors.textPrimary} style={{ marginLeft: 3 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bienvenido de vuelta 👋</Text>
          <Text style={styles.appName}>FitMax</Text>
        </View>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={styles.avatarText}>JD</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Progreso Semanal</Text>
          <Text style={styles.bannerSub}>Mantén la racha esta semana</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '30%' }]} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tu plan de hoy</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={refetch} activeOpacity={0.7} style={styles.iconButton}>
              <Ionicons name="refresh" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton} 
              activeOpacity={0.8}
              onPress={() => router.push('/create-routine')}
            >
              <Ionicons name="add" size={22} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* MUESTRA SOLO LA TARJETA QUE CORRESPONDE A HOY */}
        {renderPlanDeHoy()}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  greeting: { ...typography.body, color: colors.textSecondary, marginBottom: 2 },
  appName: { ...typography.h1, color: colors.textPrimary },
  avatarContainer: { width: 45, height: 45, borderRadius: 23, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 77, 0, 0.3)' },
  avatarText: { color: colors.primary, fontWeight: 'bold' },
  banner: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  bannerTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 4 },
  bannerSub: { ...typography.body, color: colors.textSecondary, fontSize: 13, marginBottom: spacing.md },
  progressTrack: { height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h2, color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cardLeft: { flex: 1 },
  dayBadge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, alignSelf: 'flex-start', marginBottom: 6 },
  dayBadgeText: { color: colors.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  cardMetaText: { ...typography.caption, color: colors.textSecondary, marginLeft: 4 },
  playButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  loaderContainer: { height: 100, justifyContent: 'center', alignItems: 'center' },
});