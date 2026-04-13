import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics'; 

import StreakWidget from '../../components/ui/StreakWidget';
import { usePeriodization } from '../../hooks/usePeriodization';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useRoutines } from '../../hooks/useRoutines';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase'; 
import PressableCard from '../../components/ui/PressableCard';
import { processOfflineQueue } from '../../lib/offlineQueue';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { session } = useAuth();
  const avatarUrl = session?.user?.user_metadata?.avatar_url;
  const fullName = session?.user?.user_metadata?.full_name || 'Atleta';
  const firstName = fullName.split(' ')[0];  

  const { rutinaHoy, cargando, refetch, weekStats, perfil } = useRoutines();
  const { data: coachData, loading: loadingCoach, refetch: refetchCoach } = usePeriodization(); 

  const [evolucionando, setEvolucionando] = useState(false);
  const [mostrarInauguracion, setMostrarInauguracion] = useState(false);

  const volumenSemanal = weekStats?.volumen_total || 0;
  const sesionesSemana = weekStats?.sesiones || 0;
  const metaSesiones = perfil?.dias_entrenamiento?.length || 3;
  const cargandoStats = cargando;

  useEffect(() => {
    if (coachData) {
      console.log("🧠 COACH DATA:", coachData.mensaje_coach);
    }
  }, [coachData]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const sincronizarHome = async () => {
        if (!session?.user?.id) return;
        
        processOfflineQueue().catch(console.warn); 

        const ticket = await AsyncStorage.getItem(`inauguracion_pendiente_${session.user.id}`);
        if (ticket === 'true' && isActive) {
          setMostrarInauguracion(true);
        } else if (isActive) {
          setMostrarInauguracion(false); // Refresca por si el ticket se destruyó
        }

        await Promise.all([
          refetch(),
          refetchCoach()
        ]);
      };
      
      sincronizarHome();

      return () => { isActive = false; };
    }, [session?.user?.id, refetch, refetchCoach])
  );

  const initials = useMemo(() => {
    const fullNameStr = session?.user?.user_metadata?.full_name || session?.user?.email || 'U';
    return fullNameStr.substring(0, 2).toUpperCase();
  }, [session?.user]);

  // 🚀 Navegamos ANTES de destruir el ticket. El ticket se destruirá en la sig. pantalla.
  const iniciarMiniRutina = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (session?.user?.id) {
      setMostrarInauguracion(false); // Ocultar visualmente al instante
      router.push('/inauguracion'); 
    }
  };

  const handleRegenerarRutina = async () => {
    try {
      setEvolucionando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: rutinas, error: errRutinas } = await supabase
        .from('RUTINAS')
        .select('*, RUTINA_EJERCICIOS(*)')
        .eq('user_id', user.id);

      if (errRutinas || !rutinas) throw new Error("No se encontraron rutinas para evolucionar.");

      const rutinasPromises = rutinas.map(rutina => {
        let nuevoNombre = rutina.nombre;
        if (!nuevoNombre.includes('(Fase 2)')) nuevoNombre = `${nuevoNombre} (Fase 2)`;
        return supabase.from('RUTINAS').update({ nombre: nuevoNombre, nivel_id: 2 }).eq('id', rutina.id);
      });
      await Promise.all(rutinasPromises);

      const ejerciciosActualizados = rutinas.flatMap(rutina =>
        rutina.RUTINA_EJERCICIOS
          .filter((ej: any) => ej.es_calentamiento !== true && ej.es_calentamiento !== 'true')
          .map((ej: any) => {
            let nuevasSeries = parseInt(ej.series);
            let nuevosDescansos = parseInt(ej.descanso_seg);
            const objId = parseInt(rutina.objetivo_id);

            if (objId === 1 || objId === 3) { nuevosDescansos = Math.max(30, nuevosDescansos - 15); } 
            else if (objId === 2) { nuevasSeries = nuevasSeries + 1; } 
            else if (objId === 5) { nuevosDescansos = nuevosDescansos + 30; }

            return { ...ej, series: nuevasSeries, descanso_seg: nuevosDescansos };
          })
      );

      if (ejerciciosActualizados.length > 0) {
        const { error: errUpdateEj } = await supabase.from('RUTINA_EJERCICIOS').upsert(ejerciciosActualizados);
        if (errUpdateEj) console.error("❌ Error actualizando ejercicios batch:", errUpdateEj.message);
      }

      await supabase.from('USUARIOS').update({ fecha_registro: new Date().toISOString() }).eq('id', user.id);

      Alert.alert("¡Nivel Superado! 🦍🔥", "Tus rutinas han evolucionado. ¡A darle con todo!");
      await Promise.all([refetch(), refetchCoach()]);

    } catch (e: any) {
      console.error(" ERROR FATAL EVOLUCIÓN:", e);
      Alert.alert("Error de Evolución", "No pudimos actualizar tu fase.");
    } finally {
      setEvolucionando(false);
    }
  };

  const renderPlanDeHoy = () => {
    if (cargando || cargandoStats) return <View style={styles.loaderContainer}><ActivityIndicator color={colors.primary} /></View>;
    if (!rutinaHoy) return null;

    if (rutinaHoy.isRest) {
      return (
        <View style={[styles.card, { opacity: 0.7, paddingVertical: spacing.xl, justifyContent: 'center', flexDirection: 'column' }]}>
          <Ionicons name="bed-outline" size={36} color={colors.textSecondary} />
          <Text style={[styles.cardTitle, { marginTop: 8 }]}>Día de Descanso</Text>
          <Text style={styles.cardMetaText}>Recuperación activa hoy.</Text>
        </View>
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
          <Text style={styles.greeting}>Hola, {firstName} 👋</Text>
          <Text style={styles.appName}>FitMax</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <PressableCard 
            style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => router.push('/create-routine')} 
          >
            <Ionicons name="add" size={24} color="#000" />
          </PressableCard>

          <PressableCard style={styles.avatarContainer} onPress={() => router.push('/profile')}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </PressableCard>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {mostrarInauguracion && (
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={iniciarMiniRutina} 
            style={styles.bannerInauguracion}
          >
            <View style={styles.inauguracionIconBox}>
              <Ionicons name="flame" size={26} color="#000" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.bannerInauguracionTitle}>¡Prueba tu App Ahora!</Text>
              <Text style={styles.bannerInauguracionSub}>
                Entrenamiento rápido de 3 ejercicios para que conozcas la experiencia.
              </Text>
            </View>
            <View style={styles.playButton}>
              <Ionicons name="play" size={20} color="#000" style={{ marginLeft: 3 }} />
            </View>
          </TouchableOpacity>
        )}

        <StreakWidget />

        {!loadingCoach && coachData && (
          <PressableCard 
            style={{
              backgroundColor: coachData.plateau_detectado ? 'rgba(255, 77, 0, 0.1)' : colors.surface,
              padding: spacing.md,
              borderRadius: radius.lg,
              marginTop: spacing.lg,
              borderWidth: 1,
              borderColor: coachData.plateau_detectado ? colors.primary : colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ 
                width: 36, height: 36, borderRadius: 18, 
                backgroundColor: coachData.plateau_detectado ? colors.primary : colors.surfaceLight,
                justifyContent: 'center', alignItems: 'center'
              }}>
                <Ionicons name={coachData.plateau_detectado ? "flash" : "analytics"} size={20} color={coachData.plateau_detectado ? "#000" : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '900', fontSize: 10 }}>
                  COACH FITMAX • FASE: {coachData.fase_actual.toUpperCase()}
                </Text>
                <Text style={{ ...typography.body, fontSize: 12, marginTop: 1, color: colors.textPrimary }}>
                  {coachData.mensaje_coach}
                </Text>

                {/* 🚀 NUEVA BARRA DE PROGRESO DE LA FASE */}
                {!coachData.plateau_detectado && (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>Progreso de Fase</Text>
                      <Text style={{ fontSize: 10, color: colors.primary }}>
                        Día {coachData.dias_en_fase || 1} de 14
                      </Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ 
                        width: `${Math.min(((coachData.dias_en_fase || 1) / 14) * 100, 100)}%`, 
                        height: '100%', 
                        backgroundColor: colors.primary 
                      }} />
                    </View>
                  </View>
                )}
                {/* 🚀 FIN DE LA BARRA DE PROGRESO */}

              </View>
            </View>

            {coachData.plateau_detectado && (
              <PressableCard 
                style={styles.evolveBtn}
                onPress={handleRegenerarRutina}
                disabled={evolucionando}
                haptic="heavy"
              >
                {evolucionando ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Text style={styles.evolveBtnText}>Evolucionar Mi Rutina</Text>
                    <Ionicons name="trending-up" size={16} color="#000" />
                  </>
                )}
              </PressableCard>
            )}

          </PressableCard>
        )}

        <View style={[styles.banner, { marginTop: spacing.lg }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
            <Text style={styles.bannerTitle}>Progreso Semanal</Text>
            <Text style={[styles.bannerTitle, { color: colors.primary }]}>{volumenSemanal.toLocaleString()} kg</Text>
          </View>
          <Text style={styles.bannerSub}>
            Has completado {sesionesSemana} de {metaSesiones} sesiones.
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progresoPorcentaje}%` }]} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tu plan de hoy</Text>
          <View style={styles.headerActions}>
            <PressableCard onPress={async () => { 
                await Promise.all([refetch(), refetchCoach()]); 
              }} 
              style={styles.iconButton}>
              <Ionicons name="refresh" size={22} color={colors.textSecondary} />
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
  greeting: { ...typography.body, color: colors.textSecondary, marginBottom: 2 },
  appName: { ...typography.h1 },
  avatarContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  avatarText: { ...typography.small, color: colors.primary, fontWeight: '900' },
  bannerInauguracion: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 77, 0, 0.1)', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, marginBottom: spacing.lg },
  inauguracionIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  bannerInauguracionTitle: { ...typography.label, color: colors.primary, marginBottom: 4 },
  bannerInauguracionSub: { ...typography.small, color: colors.textSecondary },
  banner: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  bannerTitle: { ...typography.label, marginBottom: 4 },
  bannerSub: { ...typography.small, marginBottom: spacing.md },
  progressTrack: { height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.xl },
  sectionTitle: { ...typography.h2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cardLeft: { flex: 1, paddingRight: spacing.md },
  dayBadge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start', marginBottom: 8 },
  dayBadgeText: { ...typography.caption, color: colors.primary },
  cardTitle: { ...typography.label, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  cardMetaText: { ...typography.small, marginLeft: 4 },
  playButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  loaderContainer: { height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  evolveBtn: { backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, marginTop: 15, gap: 8 },
  evolveBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 }
});