import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 🚀 IMPORTAMOS EL FERRARI
import PressableCard from '../../components/ui/PressableCard';
import { colors, spacing, radius, typography, buttons } from '../../constants/theme';
import { useRoutineDetail } from '../../hooks/useRoutineDetail';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { rutina, ejercicios, cargando, error, refetch } = useRoutineDetail(id);
  const [energia, setEnergia] = useState<'agotado' | 'normal' | 'bestia'>('normal');

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (error || !rutina) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Error al cargar la rutina'}</Text>
        <PressableCard 
          style={[buttons.primary, { marginTop: 20 }]} 
          onPress={() => refetch()}
          haptic="medium"
        >
          <Text style={buttons.primaryText}>Reintentar</Text>
        </PressableCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ 
        paddingHorizontal: spacing.lg, 
        paddingTop: insets.top + spacing.lg, 
        paddingBottom: insets.bottom + 120 
      }}>
        
        <View style={styles.headerNav}>
          <PressableCard onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </PressableCard>
          <Text style={styles.navTitle}>Detalle de Rutina</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.badge}><Text style={styles.badgeText}>ENTRENAMIENTO</Text></View>
          <Text style={styles.title}>{rutina.nombre}</Text>
          <Text style={styles.desc}>{rutina.descripcion}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.statText}>{rutina.duracion_min || 0} min</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="fitness-outline" size={18} color={colors.primary} />
              <Text style={styles.statText}>{ejercicios.length} Ejercicios</Text>
            </View>
          </View>
        </View>

        {/* Selector de Energía con Animación Física */}
        <View style={styles.energyCard}>
          <Text style={styles.energyTitle}>¿Cómo te sientes hoy?</Text>
          <View style={styles.energyRow}>
            <EnergyBtn icon="battery-dead" label="Agotado" activo={energia === 'agotado'} type="agotado" onPress={() => setEnergia('agotado')} />
            <EnergyBtn icon="battery-half" label="Normal" activo={energia === 'normal'} type="normal" onPress={() => setEnergia('normal')} />
            <EnergyBtn icon="battery-full" label="¡Bestia!" activo={energia === 'bestia'} type="bestia" onPress={() => setEnergia('bestia')} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Ejercicios</Text>
        
        {ejercicios.map((item) => {
          const seriesMostrar = energia === 'agotado' ? Math.max(1, item.series - 1) : item.series;
          return (
            <PressableCard 
              key={item.id} 
              onPress={() => router.push(`/exercise/${item.ejercicio_id}`)} 
              style={styles.exerciseCard}
            >
              <View style={styles.imgBox}>
                {item.ejercicio?.imagen_url ? (
                  <Image source={{ uri: item.ejercicio.imagen_url }} style={styles.img} />
                ) : (
                  <Ionicons name="barbell" size={24} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.exName}>{item.ejercicio?.nombre || 'Ejercicio'}</Text>
                <Text style={[styles.exMeta, energia === 'agotado' && { color: colors.warning }]}>
                  {seriesMostrar} Series • {item.repeticiones} Reps
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.border} />
            </PressableCard>
          );
        })}
      </ScrollView>

      {/* Footer Fijo con Botón de Acción Principal (CTA) */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <PressableCard 
          style={[buttons.primary, { flexDirection: 'row' }]} 
          onPress={() => router.push({ pathname: "/workout/session", params: { rutinaId: id, nivelEnergia: energia } })}
          glowColor={colors.primary} // 👈 ¡EFECTO GLOW PARA EL BOTÓN PRINCIPAL!
          haptic="heavy" // 👈 UN CLIC MÁS FUERTE PARA EL COMIENZO
        >
          <Text style={buttons.primaryText}>EMPEZAR ENTRENAMIENTO</Text>
          <Ionicons name="play" size={20} color="#000" style={{ marginLeft: 8 }} />
        </PressableCard>
      </View>
    </View>
  );
}

// Componente Interno para los botones de energía mejorado
function EnergyBtn({ icon, label, activo, onPress, type }: any) {
  const activeColor = type === 'agotado' ? colors.warning : type === 'bestia' ? colors.success : colors.primary;
  return (
    <PressableCard 
      style={[styles.energyBtn, activo && { borderColor: activeColor, backgroundColor: activeColor + '15' }]} 
      onPress={onPress}
      haptic="light"
    >
      <Ionicons name={icon} size={26} color={activo ? activeColor : colors.textMuted} />
      <Text style={[styles.energyLabel, activo && { color: activeColor }]}>{label}</Text>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  navTitle: { ...typography.label },
  backBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  heroCard: { marginBottom: spacing.xl },
  badge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start', marginBottom: spacing.md },
  badgeText: { ...typography.caption, color: colors.primary },
  title: { ...typography.h1, marginBottom: spacing.xs },
  desc: { ...typography.body, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 10, borderRadius: radius.md },
  statText: { ...typography.small, color: colors.textPrimary, marginLeft: 8 },
  sectionTitle: { ...typography.h2, marginBottom: spacing.md },
  energyCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  energyTitle: { ...typography.label, marginBottom: 2 },
  energyRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  energyBtn: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  energyLabel: { ...typography.caption, marginTop: 8 },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.lg, marginBottom: spacing.md },
  imgBox: { width: 60, height: 60, borderRadius: radius.md, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  info: { flex: 1, marginLeft: spacing.md },
  exName: { ...typography.label },
  exMeta: { ...typography.small, marginTop: 4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.background, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  errorText: { ...typography.body, marginTop: 20 },
});