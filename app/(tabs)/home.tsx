import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // 👈 Añadido para recargar al volver

import { colors, spacing, radius, typography } from '../../constants/theme';
import { useRoutines } from '../../hooks/useRoutines';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase'; // 👈 Añadido para consultar la DB

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { session } = useAuth();
  const { rutinaHoy, cargando, refetch } = useRoutines();

  // 🚀 ESTADOS PARA LAS ESTADÍSTICAS REALES
  const [volumenSemanal, setVolumenSemanal] = useState(0);
  const [sesionesSemana, setSesionesSemana] = useState(0);
  const metaSesiones = 3; // Meta por defecto (puedes ajustarla al perfil del usuario)

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

  // 🚀 FUNCIÓN PARA TRAER EL VOLUMEN Y SESIONES DE LA SEMANA
  const fetchEstadisticas = async () => {
    if (!session?.user?.id) return;

    // Calculamos el lunes de esta semana
    const hoy = new Date();
    const diaSemana = hoy.getDay() || 7; // Convertimos domingo (0) a 7
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diaSemana + 1);
    lunes.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('HISTORIAL_SESIONES')
      .select('volumen_total_kg')
      .eq('user_id', session.user.id)
      .gte('created_at', lunes.toISOString()); // Filtramos desde el lunes

    if (data && !error) {
      const volTotal = data.reduce((acc, curr) => acc + (curr.volumen_total_kg || 0), 0);
      setVolumenSemanal(volTotal);
      setSesionesSemana(data.length);
    }
  };

  // 🚀 RECARGAR DATOS CADA VEZ QUE LA PANTALLA SE ENFOCA (Por si viene de terminar rutina)
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
        <TouchableOpacity style={[styles.card, { borderStyle: 'dashed', borderColor: colors.primaryFaded }]} activeOpacity={0.7} onPress={() => router.push('/create-routine')}>
          <View style={styles.cardLeft}>
            <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>HOY</Text></View>
            <Text style={styles.cardTitle}>Entrenamiento Libre</Text>
            <Text style={styles.cardMetaText}>Toca para crear tu rutina de hoy</Text>
          </View>
          <View style={[styles.playButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }]}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/rutina/${rutinaHoy.id}`)} style={styles.card}>
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
      </TouchableOpacity>
    );
  };

  // 🚀 CÁLCULO DE LA BARRA DE PROGRESO (Máximo 100%)
  const progresoPorcentaje = Math.min((sesionesSemana / metaSesiones) * 100, 100);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {getUserFirstName()} 👋</Text>
          <Text style={styles.appName}>FitMax</Text>
        </View>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/profile')}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 🚀 BANNER ACTUALIZADO CON DATOS REALES */}
        <View style={styles.banner}>
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
            <TouchableOpacity onPress={() => { refetch(); fetchEstadisticas(); }} activeOpacity={0.7} style={styles.iconButton}>
              <Ionicons name="refresh" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={() => router.push('/create-routine')}>
              <Ionicons name="add" size={22} color="#000" />
            </TouchableOpacity>
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