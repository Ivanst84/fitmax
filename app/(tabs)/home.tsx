import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import StreakWidget from '../../components/ui/StreakWidget';
import { usePeriodization } from '../../hooks/usePeriodization';
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
  const { data: coachData, loading: loadingCoach, refetch: refetchCoach } = usePeriodization(); 

  const [volumenSemanal, setVolumenSemanal] = useState(0);
  const [sesionesSemana, setSesionesSemana] = useState(0);
  const [metaSesiones, setMetaSesiones] = useState(3);
  
  // 🔥 Estado para el botón de evolución
  const [evolucionando, setEvolucionando] = useState(false);

  useEffect(() => {
    if (coachData) {
      console.log("🧠 COACH DATA:", coachData.mensaje_coach);
    }
  }, [coachData]);

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
      refetch(); 
      refetchCoach(); 
    }, [session?.user?.id])
  );

  const getInitials = () => {
    const fullName = session?.user?.user_metadata?.full_name || session?.user?.email || 'U';
    return fullName.substring(0, 2).toUpperCase();
  };

  // ============================================================================
  // 🧠 LÓGICA DE EVOLUCIÓN (14 DÍAS) - BLINDADA Y CON LOGS
  // ============================================================================
  const handleRegenerarRutina = async () => {
    try {
      setEvolucionando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // 1. Traemos las rutinas y ejercicios ACTUALES
      const { data: rutinas, error: errRutinas } = await supabase
        .from('RUTINAS')
        .select('*, RUTINA_EJERCICIOS(*)')
        .eq('user_id', user.id);

      if (errRutinas || !rutinas) throw new Error("No se encontraron rutinas para evolucionar.");

      // 2. Iteramos sobre cada rutina
      for (const rutina of rutinas) {
        
        // A) Actualizamos el Título a Fase 2
        let nuevoNombre = rutina.nombre;
        if (!nuevoNombre.includes('(Fase 2)')) {
          nuevoNombre = `${nuevoNombre} (Fase 2)`;
        }

        const { error: errUpdateRutina } = await supabase.from('RUTINAS')
          .update({ nombre: nuevoNombre, nivel_id: 2 })
          .eq('id', rutina.id);
        
        if (errUpdateRutina) console.error("❌ Error actualizando rutina:", errUpdateRutina.message);

        // B) Actualizamos cada ejercicio
        for (const ej of rutina.RUTINA_EJERCICIOS) {
          // Si es calentamiento, lo ignoramos
          if (ej.es_calentamiento === true || ej.es_calentamiento === 'true') continue; 

          let nuevasSeries = parseInt(ej.series);
          let nuevosDescansos = parseInt(ej.descanso_seg);
          const objId = parseInt(rutina.objetivo_id); // Aseguramos que sea número

          // 🧬 LÓGICA DE SOBRECARGA
          if (objId === 1 || objId === 3) { 
            nuevosDescansos = Math.max(30, nuevosDescansos - 15); 
          } else if (objId === 2) { 
            nuevasSeries = nuevasSeries + 1;
          } else if (objId === 5) { 
            nuevosDescansos = nuevosDescansos + 30; 
          }

          console.log(`🏋️ Actualizando EJ_ID: ${ej.id} | Series: ${ej.series} -> ${nuevasSeries} | Descanso: ${ej.descanso_seg} -> ${nuevosDescansos}`);

          // Hacemos el Update explícito
          const { error: errUpdateEj } = await supabase.from('RUTINA_EJERCICIOS')
            .update({ series: nuevasSeries, descanso_seg: nuevosDescansos })
            .eq('id', ej.id);

          if (errUpdateEj) console.error(`❌ Error actualizando EJ ${ej.id}:`, errUpdateEj.message);
        }
      }

      // 3. 🧹 LIMPIEZA DEL PLATEAU (Para que desaparezca el botón)
      // OPCIÓN B: Actualizamos la fecha de registro en el usuario temporalmente para "engañar" al cálculo
      await supabase.from('USUARIOS').update({ fecha_registro: new Date().toISOString() }).eq('id', user.id);

      Alert.alert("¡Nivel Superado! 🦍🔥", "Tus rutinas han evolucionado. ¡A darle con todo!");
      
      // Refrescamos la UI
      refetch();
      refetchCoach();

    } catch (e: any) {
      console.error("❌ ERROR FATAL EVOLUCIÓN:", e);
      Alert.alert("Error de Evolución", "No pudimos actualizar tu fase.");
    } finally {
      setEvolucionando(false);
    }
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
          <Text style={styles.greeting}>Hola, Atleta 👋</Text>
          <Text style={styles.appName}>FitMax</Text>
        </View>
        <PressableCard style={styles.avatarContainer} onPress={() => router.push('/profile')}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </PressableCard>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <StreakWidget />

        {/* 🧠 BANNER DEL COACH */}
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
                <Ionicons 
                  name={coachData.plateau_detectado ? "flash" : "analytics"} 
                  size={20} 
                  color={coachData.plateau_detectado ? "#000" : colors.primary} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '900', fontSize: 10 }}>
                  COACH FITMAX • FASE: {coachData.fase_actual.toUpperCase()}
                </Text>
                <Text style={{ ...typography.body, fontSize: 12, marginTop: 1, color: colors.textPrimary }}>
                  {coachData.mensaje_coach}
                </Text>
              </View>
            </View>

            {/* 🔥 BOTÓN PARA PRUEBAS (En producción cambiar a coachData.plateau_detectado) */}
            {coachData.plateau_detectado && (
              <TouchableOpacity 
                style={styles.evolveBtn}
                onPress={handleRegenerarRutina}
                disabled={evolucionando}
              >
                {evolucionando ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Text style={styles.evolveBtnText}>Evolucionar Mi Rutina</Text>
                    <Ionicons name="trending-up" size={16} color="#000" />
                  </>
                )}
              </TouchableOpacity>
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
            <PressableCard onPress={() => { refetch(); fetchEstadisticas(); }} style={styles.iconButton}>
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
  
  // 🔥 ESTILOS PARA EL BOTÓN DE EVOLUCIÓN
  evolveBtn: { backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, marginTop: 15, gap: 8 },
  evolveBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 }
});