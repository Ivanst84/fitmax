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
  
  // ─── ESTADOS GLOBALES Y HOOKS ─────────────────────────────────────────────
  const { session } = useAuth();
  const { rutinaHoy, cargando, refetch, weekStats, perfil } = useRoutines();
  const { data: coachData, loading: loadingCoach, refetch: refetchCoach } = usePeriodization(); 

  const [evolucionando, setEvolucionando] = useState(false);
  const [mostrarInauguracion, setMostrarInauguracion] = useState(false);

  // ─── VARIABLES DERIVADAS ──────────────────────────────────────────────────
  const avatarUrl = session?.user?.user_metadata?.avatar_url;
  const firstName = (session?.user?.user_metadata?.full_name || 'Atleta').split(' ')[0];  
  const initials = useMemo(() => (session?.user?.user_metadata?.full_name || session?.user?.email || 'U').substring(0, 2).toUpperCase(), [session?.user]);
  
  const volumenSemanal = weekStats?.volumen_total || 0;
  const sesionesSemana = weekStats?.sesiones || 0;
  const metaSesiones = perfil?.dias_entrenamiento?.length || 3;
  const progresoPorcentaje = Math.min((sesionesSemana / metaSesiones) * 100, 100);

  // ─── LÓGICA VISUAL DEL COACH (Movida aquí para limpiar el JSX) ────────────
  const visualesCoach = useMemo(() => {
    if (!coachData) return null;
    const sesiones = coachData.dias_en_fase || 1;
    let titulo = "FASE NEURAL";
    let color = colors.primary;

    if (sesiones >= 6 && sesiones <= 10) {
      titulo = "FASE HIPERTRÓFICA";
      color = '#F59E0B'; // Naranja
    } else if (sesiones >= 11) {
      titulo = "SUPERCOMPENSACIÓN";
      color = '#EF4444'; // Rojo
    }

    if (coachData.plateau_detectado) {
      titulo = "ESTANCAMIENTO";
      color = '#EF4444';
    }

    return { titulo, color, sesiones, porcentajeBarra: Math.min((sesiones / 14) * 100, 100) };
  }, [coachData]);

  // ─── EFECTOS DE SINCRONIZACIÓN ────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const sincronizarHome = async () => {
        if (!session?.user?.id) return;
        processOfflineQueue().catch(console.warn); 

        const ticket = await AsyncStorage.getItem(`inauguracion_pendiente_${session.user.id}`);
        if (isActive) setMostrarInauguracion(ticket === 'true');

        await Promise.all([refetch(), refetchCoach()]);
      };
      sincronizarHome();
      return () => { isActive = false; };
    }, [session?.user?.id, refetch, refetchCoach])
  );

  // ─── FUNCIONES DE ACCIÓN ──────────────────────────────────────────────────
  const iniciarMiniRutina = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (session?.user?.id) {
      setMostrarInauguracion(false); 
      router.push('/inauguracion'); 
    }
  };

  const handleRegenerarRutina = async () => {
    try {
      setEvolucionando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: perfilDB } = await supabase.from('USUARIOS').select('objetivo, fase_numero').eq('id', user.id).single();
      const objId = parseInt(perfilDB?.objetivo?.toString() || '2');
      const faseNueva = (perfilDB?.fase_numero || 1) + 1;

      const { data: rutinas, error: errRutinas } = await supabase.from('RUTINAS').select('*, RUTINA_EJERCICIOS(*)').eq('user_id', user.id);
      if (errRutinas || !rutinas) throw new Error("No se encontraron rutinas para evolucionar.");

     // --- INICIO DEL NUEVO CÓDIGO DE RENOMBRAMIENTO ---
      for (const rutina of rutinas) {
        const nombreLimpio = rutina.nombre.replace(/\s*\(Fase \d+\)/g, '').trim();
        const nuevoNombre = `${nombreLimpio} (Fase ${faseNueva})`;
        
        console.log(`Intentando renombrar: "${rutina.nombre}" -> "${nuevoNombre}"`);

        const { error: errRenombrar } = await supabase
          .from('RUTINAS')
          .update({ 
            nombre: nuevoNombre, 
            nivel_id: Math.min(faseNueva, 3) 
          })
          .eq('id', rutina.id);

        if (errRenombrar) {
          console.error(`❌ ERROR SUPABASE RENOMBRANDO (ID: ${rutina.id}):`, errRenombrar.message);
        } else {
          console.log(`✅ Rutina renombrada con éxito en la base de datos a: ${nuevoNombre}`);
        }
      }
      // --- FIN DEL NUEVO CÓDIGO ---

      let mensajeFeedback = "";
      const ejerciciosActualizados = rutinas.flatMap(rutina =>
        rutina.RUTINA_EJERCICIOS.filter((ej: any) => ej.es_calentamiento !== true && ej.es_calentamiento !== 'true').map((ej: any) => {
          let nuevasSeries = parseInt(ej.series || '3');
          let nuevosDescansos = parseInt(ej.descanso_seg || '60');

          if (objId === 1 || objId === 3) { 
            if (nuevosDescansos > 30) { nuevosDescansos = Math.max(30, nuevosDescansos - 15); mensajeFeedback = "⏱️ -15s de descanso para mantener tu ritmo cardíaco elevado."; } 
            else if (nuevasSeries < 5) { nuevasSeries += 1; mensajeFeedback = "🔥 Descanso al límite (30s). Agregamos +1 Serie para máxima quema."; } 
            else { mensajeFeedback = "🏆 Has alcanzado un nivel élite de resistencia en estos ejercicios."; }
          } 
          else if (objId === 2) { 
            if (nuevasSeries < 5) { nuevasSeries += 1; mensajeFeedback = "💪 +1 Serie para generar mayor volumen y crecimiento muscular."; } 
            else if (nuevosDescansos > 60) { nuevosDescansos = Math.max(60, nuevosDescansos - 15); mensajeFeedback = "🧱 Volumen al tope (5 series). Menor descanso = mayor densidad muscular."; } 
            else { mensajeFeedback = "🏆 Rutina hipertrófica maximizada al límite biológico."; }
          } 
          else if (objId === 5) { 
            if (nuevosDescansos < 180) { nuevosDescansos = Math.min(180, nuevosDescansos + 30); mensajeFeedback = "🧱 +30s de descanso para recuperación total y levantar más pesado."; } 
            else if (nuevasSeries < 6) { nuevasSeries += 1; mensajeFeedback = "🦍 Descanso al tope. +1 Serie máxima para romper tus récords."; } 
            else { mensajeFeedback = "🏆 Rutina de fuerza maximizada al límite."; }
          }
          return { ...ej, series: nuevasSeries, descanso_seg: nuevosDescansos };
        })
      );

      if (ejerciciosActualizados.length > 0) await supabase.from('RUTINA_EJERCICIOS').upsert(ejerciciosActualizados);

      await supabase.from('USUARIOS').update({ fecha_registro: new Date().toISOString(), fase_numero: faseNueva }).eq('id', user.id);
      Alert.alert(`¡Nivel ${faseNueva} Desbloqueado! `, `Tus rutinas han evolucionado.\n\n${mensajeFeedback}`);
      await Promise.all([refetch(), refetchCoach()]);

    } catch (e: any) {
      console.error(" ERROR FATAL EVOLUCIÓN:", e);
      Alert.alert("Error de Evolución", "No pudimos actualizar tu fase.");
    } finally {
      setEvolucionando(false);
    }
  };

  // ─── RENDERIZADO DE COMPONENTES SECUNDARIOS ───────────────────────────────
  const renderCoachCard = () => {
    if (loadingCoach || !coachData || !visualesCoach) return null;

    return (
      <PressableCard style={[styles.cardCoach, { borderColor: coachData.plateau_detectado ? colors.primary : colors.border, backgroundColor: coachData.plateau_detectado ? 'rgba(255, 77, 0, 0.1)' : colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.iconBox, { backgroundColor: coachData.plateau_detectado ? colors.primary : colors.surfaceLight }]}>
            <Ionicons name={coachData.plateau_detectado ? "flash" : "analytics"} size={20} color={coachData.plateau_detectado ? "#000" : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.coachTag}>COACH FITMAX</Text>
            <Text style={styles.coachMsg}>{coachData.mensaje_coach}</Text>

            <View style={styles.coachNarrativeBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 10, color: visualesCoach.color, fontWeight: '900', letterSpacing: 0.5 }}>{visualesCoach.titulo}</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>Sesión {visualesCoach.sesiones} de 14</Text>
              </View>
              <View style={styles.narrativeTrack}>
                <View style={[styles.narrativeFill, { width: `${visualesCoach.porcentajeBarra}%`, backgroundColor: visualesCoach.color }]} />
              </View>
            </View>
          </View>
        </View>

        {(coachData.plateau_detectado || (coachData as any).puede_evolucionar || (coachData.dias_en_fase && coachData.dias_en_fase >= 14)) && (
          <PressableCard 
            style={[styles.evolveBtn, { borderColor: coachData.plateau_detectado ? '#EF4444' : colors.primary, borderWidth: 1 }]}
            onPress={handleRegenerarRutina} disabled={evolucionando} haptic="heavy"
          >
            {evolucionando ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.evolveBtnText}>{coachData.plateau_detectado ? 'SUPERAR ESTANCAMIENTO ⚡' : '¡EVOLUCIONAR RUTINA! 🚀'}</Text>}
          </PressableCard>
        )}
      </PressableCard>
    );
  };

  const renderPlanDeHoy = () => {
    if (cargando) return <View style={styles.loaderContainer}><ActivityIndicator color={colors.primary} /></View>;
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
        <View style={styles.playButton}><Ionicons name="play" size={20} color="#000" style={{ marginLeft: 3 }} /></View>
      </PressableCard>
    );
  };

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {firstName} 👋</Text>
          <Text style={styles.appName}>FitMax</Text>
        </View>
        <View style={styles.headerRight}>
          <PressableCard style={styles.addBtn} onPress={() => router.push('/create-routine')}>
            <Ionicons name="add" size={24} color="#000" />
          </PressableCard>
          <PressableCard style={styles.avatarContainer} onPress={() => router.push('/profile')}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{initials}</Text>}
          </PressableCard>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* INAUGURACIÓN */}
        {mostrarInauguracion && (
          <TouchableOpacity activeOpacity={0.9} onPress={iniciarMiniRutina} style={styles.bannerInauguracion}>
            <View style={styles.inauguracionIconBox}><Ionicons name="flame" size={26} color="#000" /></View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.bannerInauguracionTitle}>¡Prueba tu App Ahora!</Text>
              <Text style={styles.bannerInauguracionSub}>Entrenamiento rápido de 3 ejercicios.</Text>
            </View>
            <View style={styles.playButton}><Ionicons name="play" size={20} color="#000" style={{ marginLeft: 3 }} /></View>
          </TouchableOpacity>
        )}

        <StreakWidget />

        {/* TARJETA COACH */}
        {renderCoachCard()}

        {/* PROGRESO SEMANAL */}
        <View style={[styles.banner, { marginTop: spacing.lg }]}>
          <View style={styles.progressHeader}>
            <Text style={styles.bannerTitle}>Progreso Semanal</Text>
            <Text style={[styles.bannerTitle, { color: colors.primary }]}>{volumenSemanal.toLocaleString()} kg</Text>
          </View>
          <Text style={styles.bannerSub}>Has completado {Math.min(sesionesSemana, metaSesiones)} de {metaSesiones} sesiones.</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progresoPorcentaje}%` }]} />
          </View>
        </View>

        {/* PLAN DE HOY */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tu plan de hoy</Text>
          <PressableCard onPress={async () => { await Promise.all([refetch(), refetchCoach()]); }} style={styles.iconButton}>
            <Ionicons name="refresh" size={22} color={colors.textSecondary} />
          </PressableCard>
        </View>

        {renderPlanDeHoy()}
      </ScrollView>
    </View>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  greeting: { ...typography.body, color: colors.textSecondary, marginBottom: 2 },
  appName: { ...typography.h1 },
  addBtn: { backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  avatarText: { ...typography.small, color: colors.primary, fontWeight: '900' },
  bannerInauguracion: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 77, 0, 0.1)', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, marginBottom: spacing.lg },
  inauguracionIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  bannerInauguracionTitle: { ...typography.label, color: colors.primary, marginBottom: 4 },
  bannerInauguracionSub: { ...typography.small, color: colors.textSecondary },
  banner: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  bannerTitle: { ...typography.label, marginBottom: 4 },
  bannerSub: { ...typography.small, marginBottom: spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  progressTrack: { height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.xl },
  sectionTitle: { ...typography.h2 },
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
  cardCoach: { padding: spacing.md, borderRadius: radius.lg, marginTop: spacing.lg, borderWidth: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  coachTag: { ...typography.caption, color: colors.primary, fontWeight: '900', fontSize: 10 },
  coachMsg: { ...typography.body, fontSize: 12, marginTop: 1, color: colors.textPrimary, marginBottom: 10 },
  coachNarrativeBox: { backgroundColor: '#111', padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: '#222' },
  narrativeTrack: { height: 5, backgroundColor: '#222', borderRadius: 2.5, overflow: 'hidden', marginTop: 6 },
  narrativeFill: { height: '100%' },
  evolveBtn: { backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, marginTop: 15, gap: 8 },
  evolveBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 }
});