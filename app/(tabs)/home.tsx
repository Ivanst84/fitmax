import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; 

// 🔥 IMPORTAMOS EL NUEVO WIDGET
import StreakWidget from '../../components/ui/StreakWidget';

import { colors, spacing, radius, typography } from '../../constants/theme';
import { useRoutines } from '../../hooks/useRoutines';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase'; 
import PressableCard from '../../components/ui/PressableCard';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { session } = useAuth();
  const { rutinaHoy, cargando, refetch } = useRoutines();

  const [volumenSemanal, setVolumenSemanal] = useState(0);
  const [sesionesSemana, setSesionesSemana] = useState(0);
  const [metaSesiones, setMetaSesiones] = useState(3);

  const getInitials = () => {
    const fullName = session?.user?.user_metadata?.full_name || session?.user?.email || 'Usuario';
    const names = fullName.split(' ');
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return names[0].substring(0, 2).toUpperCase();
  };

  const getUserFirstName = () => {
    const fullName = session?.user?.user_metadata?.full_name || 'Atleta';
    return fullName.split(' ')[0];
  };

  // 🚀 FUNCIÓN MAESTRA SIMPLIFICADA (Solo Stats)
  const fetchEstadisticas = async () => {
    if (!session?.user?.id) return;

    try {
      const hoy = new Date();
      const diaSemana = hoy.getDay() || 7; 
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - diaSemana + 1);
      lunes.setHours(0, 0, 0, 0);

      const { data: homeData, error: homeError } = await supabase.rpc('get_home_data', {
        p_week_start: lunes.toISOString()
      });

      if (!homeError && homeData) {
        setVolumenSemanal(homeData.stats_semana?.volumen_total || 0);
        setSesionesSemana(homeData.stats_semana?.sesiones || 0);
        if (homeData.perfil?.dias_entrenamiento) {
          setMetaSesiones(homeData.perfil.dias_entrenamiento.length);
        }
      }
    } catch (err) {
      console.error("Error cargando Home Stats:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEstadisticas();
    }, [session?.user?.id])
  );

  const renderPlanDeHoy = () => {
    if (cargando) return <View style={styles.loaderContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
    if (!rutinaHoy) return null;

    if (rutinaHoy.isRest) {
      return (
        <View style={[styles.card, { opacity: 0.7, paddingVertical: spacing.xl, justifyContent: 'center' }]}>
          <Ionicons name="bed-outline" size={36} color={colors.textSecondary} style={{marginBottom: 8}} />
          <Text style={styles.cardTitle}>Día de Descanso</Text>
          <Text style={styles.cardMetaText}>Tus músculos están creciendo hoy. Recupérate.</Text>
        </View>
      );
    }

    if (rutinaHoy.isEmpty) {
      return (
        <PressableCard style={[styles.card, { borderStyle: 'dashed', borderColor: colors.primaryFaded }]} onPress={() => router.push('/create-routine')}>
          <View style={styles.cardLeft}>
            <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>HOY</Text></View>
            <Text style={styles.cardTitle}>Entrenamiento Libre</Text>
            <Text style={styles.cardMetaText}>Toca para crear tu rutina de hoy</Text>
          </View>
          <View style={[styles.playButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }]}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </View>
        </PressableCard>
      );
    }

    return (
      <PressableCard onPress={() => router.push(`/rutina/${rutinaHoy.id}`)} style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>HOY {rutinaHoy.isCustom ? '• PROPIA' : ''}</Text></View>
          <Text style={styles.cardTitle} numberOfLines={1}>{rutinaHoy.nombre}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.cardMetaText}>{rutinaHoy.duracion_min || 45} min</Text>
          </View>
        </View>
        <View style={styles.playButton}>
          <Ionicons name="play" size={20} color="#000" style={{ marginLeft: 3 }} />
        </View>
      </PressableCard>
    );
  };

  const progresoPorcentaje = Math.min((sesionesSemana / metaSesiones) * 100, 100);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {getUserFirstName()} 👋</Text>
          <Text style={styles.appName}>FitMax</Text>
        </View>
        <PressableCard style={styles.avatarContainer} onPress={() => router.push('/profile')}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </PressableCard>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* 🔥 EL NUEVO WIDGET CON ESTEROIDES */}
        <StreakWidget />

        <View style={[styles.banner, { marginTop: spacing.lg }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
            <Text style={styles.bannerTitle}>Progreso Semanal</Text>
            <Text style={[styles.bannerTitle, { color: colors.primary }]}>{volumenSemanal.toLocaleString()} kg</Text>
          </View>
          <Text style={styles.bannerSub}>
            Has completado {sesionesSemana} de {metaSesiones} sesiones esta semana.
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progresoPorcentaje}%` }]} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tu plan de hoy</Text>
          <View style={styles.headerActions}>
            <PressableCard onPress={() => { refetch(); fetchEstadisticas(); }} style={styles.iconButton}>
              <Ionicons name="refresh" size={22} color={colors.textSecondary} />
            </PressableCard>
            <PressableCard style={styles.addButton} onPress={() => router.push('/create-routine')} glowColor={colors.primary}>
              <Ionicons name="add" size={22} color="#000" />
            </PressableCard>
          </View>
        </View>

        {renderPlanDeHoy()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  greeting: { ...typography.body, color: colors.textSecondary, marginBottom: 2, textTransform: 'capitalize' },
  appName: { ...typography.h1 },
  avatarContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  avatarText: { ...typography.small, color: colors.primary, fontWeight: '900' },
  banner: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  bannerTitle: { ...typography.label, marginBottom: 4 },
  bannerSub: { ...typography.small, marginBottom: spacing.md },
  progressTrack: { height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cardLeft: { flex: 1, paddingRight: spacing.md },
  dayBadge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start', marginBottom: 8 },
  dayBadgeText: { ...typography.caption, color: colors.primary },
  cardTitle: { ...typography.label, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  cardMetaText: { ...typography.small, marginLeft: 4 },
  playButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  loaderContainer: { height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
});