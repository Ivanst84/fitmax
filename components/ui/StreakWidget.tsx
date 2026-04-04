import React, { useEffect, useRef, useState as useLocalState } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useStreak } from '../../hooks/useStreak';

// --- Sub-componente: AnimatedNumber ---
function AnimatedNumber({ value, style }: { value: number; style?: any }) {
  const [displayed, setDisplayed] = useLocalState(value);
  const prevValueRef = useRef(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === prevValueRef.current) return;
    const startVal = prevValueRef.current;
    const endVal = value;
    const duration = 700;
    const startTime = Date.now();

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) animFrameRef.current = requestAnimationFrame(animate);
      else prevValueRef.current = endVal;
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [value]);

  return <Text style={style}>{displayed}</Text>;
}

// --- Sub-componente: FlamePulse ---
function FlamePulse({ enRiesgo, active }: { enRiesgo: boolean; active: boolean }) {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    if (!active) return;
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(scaleAnim, { toValue: enRiesgo ? 1.3 : 1.1, duration: enRiesgo ? 400 : 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        RNAnimated.timing(scaleAnim, { toValue: 1, duration: enRiesgo ? 400 : 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [enRiesgo, active]);

  return (
    <RNAnimated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Ionicons name="flame" size={32} color={enRiesgo ? '#F59E0B' : colors.primary} />
    </RNAnimated.View>
  );
}

export default function StreakWidget() {
  const { rachaActual, mejorRacha, enRiesgo, mensajeEstado, proximoHito, loading } = useStreak();

  if (loading && rachaActual === 0) return <View style={s.skeleton} />;

  const progressPercent = Math.min((rachaActual / proximoHito) * 100, 100);
  const isActive = rachaActual > 0;

  return (
    <View style={[s.container, enRiesgo && s.containerAtRisk]}>
      <View style={s.header}>
        <FlamePulse enRiesgo={enRiesgo} active={isActive} />
        <View style={s.numberBlock}>
          <AnimatedNumber value={rachaActual} style={[s.streakNumber, enRiesgo && { color: '#F59E0B' }, !isActive && { color: colors.textMuted }]} />
          <Text style={s.streakUnit}>días</Text>
        </View>
        {mejorRacha > 0 && (
          <View style={s.bestBadge}>
            <Ionicons name="trophy-outline" size={11} color={colors.textMuted} />
            <Text style={s.bestText}>Récord: {mejorRacha}</Text>
          </View>
        )}
      </View>
      {isActive && (
        <View style={s.progressSection}>
          <View style={s.progressTrack}>
            <LinearGradient colors={enRiesgo ? ['#F59E0B', '#EF4444'] : [colors.primary, '#FF8C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={s.progressLabel}>{rachaActual}/{proximoHito} días para el próximo hito</Text>
        </View>
      )}
      {mensajeEstado && (
        <View style={[s.messageBox, enRiesgo && s.messageBoxRisk]}>
          <Ionicons name={enRiesgo ? 'warning-outline' : 'checkmark-circle-outline'} size={13} color={enRiesgo ? '#F59E0B' : colors.success} />
          <Text style={[s.messageText, enRiesgo && { color: '#F59E0B' }]}>{mensajeEstado}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  skeleton: { height: 110, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, opacity: 0.5 },
  container: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  containerAtRisk: { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.04)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numberBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flex: 1 },
  streakNumber: { fontSize: 40, fontWeight: '900', color: colors.primary, lineHeight: 44 },
  streakUnit: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  bestBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  bestText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  progressSection: { gap: 4 },
  progressTrack: { height: 4, backgroundColor: colors.background, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  messageBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34, 197, 94, 0.08)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
  messageBoxRisk: { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)' },
  messageText: { flex: 1, fontSize: 12, color: colors.success, fontWeight: '600', lineHeight: 16 },
});