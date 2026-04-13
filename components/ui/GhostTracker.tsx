import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native'; 
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '../../constants/theme';

interface GhostSet {
  kg: number | string;
  reps: number | string;
  completed: boolean;
}

interface GhostTrackerProps {
  currentKg: string;
  currentReps: string;
  ghostSets: GhostSet[];
  setIndex: number;
  isCompleted?: boolean;
}

const toNum = (v: string | number): number => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  return isNaN(n) || n < 0 ? 0 : n;
};

const setVolume = (kg: string | number, reps: string | number): number => toNum(kg) * toNum(reps);
const safePct = (value: number, max: number): number => {
  if (max <= 0) return 0;
  return Math.min((value / max) * 100, 200);
};

const deltaPct = (current: number, ghost: number): number | null => {
  if (ghost <= 0) return null;
  return Math.round(((current - ghost) / ghost) * 1000) / 10;
};

export default function GhostTracker({
  currentKg,
  currentReps,
  ghostSets,
  setIndex,
  isCompleted = false,
}: GhostTrackerProps) {

  const ghostSet   = ghostSets[setIndex];
  const ghostKg    = toNum(ghostSet?.kg   ?? 0);
  const ghostReps  = toNum(ghostSet?.reps ?? 0);
  const ghostVol   = setVolume(ghostKg, ghostReps);

  const userKgNum   = toNum(currentKg);
  const userRepsNum = toNum(currentReps);
  const userVol     = setVolume(userKgNum, userRepsNum);

  const ghostBarAnim = useRef(new Animated.Value(100)).current;
  const userBarAnim  = useRef(new Animated.Value(ghostVol > 0 ? safePct(userVol, ghostVol) : 0)).current;
  
  const hasBeatRef = useRef(false);

  useEffect(() => {
    if (ghostVol <= 0) return;

    const maxVol = Math.max(userVol, ghostVol);
    const newGhostPct = safePct(ghostVol, maxVol);
    const newUserPct  = safePct(userVol, maxVol);
    const isBeating = userVol > ghostVol && userVol > 0;

    Animated.spring(ghostBarAnim, {
      toValue: newGhostPct,
      useNativeDriver: false, 
      friction: 8
    }).start();

    Animated.spring(userBarAnim, {
      toValue: newUserPct,
      useNativeDriver: false,
      friction: 8
    }).start();

    if (isBeating && !hasBeatRef.current && !isCompleted) {
      hasBeatRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (!isBeating && hasBeatRef.current) {
      hasBeatRef.current = false;
    }
  }, [currentKg, currentReps, setIndex, ghostVol, isCompleted]);

  if (ghostVol <= 0) return null;

  const delta = deltaPct(userVol, ghostVol);
  const isBeating = userVol > ghostVol && userVol > 0;
  const isLosing  = userVol < ghostVol && userVol > 0;

  // 🚀 LA MATEMÁTICA DEL SUDOR: Calcula cuántas reps necesitas para ganar
  let repsNeededText = null;
  if (!isBeating && !isCompleted && userKgNum > 0) {
    // Si ya pusiste un peso, calculamos cuántas reps necesitas para superar el volumen del fantasma
    const repsToWin = Math.floor((ghostVol / userKgNum)) + 1;
    repsNeededText = `Saca ${repsToWin} reps para romper tu récord.`;
  } else if (!isBeating && !isCompleted && userKgNum === 0 && ghostKg === 0) {
     // Caso peso corporal
     repsNeededText = `Saca ${ghostReps + 1} reps para romper tu récord.`;
  }

  // TICKET DE VICTORIA (Cuando ya acabaste el set)
  if (isCompleted) {
    return (
      <View style={[s.container, { opacity: 0.8, borderColor: isBeating ? 'rgba(34, 197, 94, 0.4)' : '#1A1A1A' }]}>
        <View style={s.headerRow}>
          <View style={s.labelGroup}>
            <View style={[s.ghostDot, { backgroundColor: isBeating ? colors.success : colors.textMuted }]} />
            <Text style={[s.ghostLabel, { color: isBeating ? colors.success : colors.textMuted }]}>
              {isBeating ? '¡RÉCORD ANTERIOR DESTRUIDO!' : 'SET REGISTRADO'}
            </Text>
          </View>
          {delta !== null && (
            <Text style={[s.deltaText, isBeating ? s.deltaTextWin : { color: colors.textMuted }]}>
              {isBeating ? `+${delta}% Volumen` : `${delta}% Volumen`}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // ESTADO ACTIVO (Mientras entrenas)
  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <View style={s.labelGroup}>
          <View style={s.ghostDot} />
          <Text style={s.ghostLabel}>TU ÚLTIMA VEZ</Text>
          <Text style={s.ghostStat}>{ghostKg}kg × {ghostReps}</Text>
        </View>

        {delta !== null && userVol > 0 && (
          <View style={[s.deltaBadge, isBeating && s.deltaBadgeWin, isLosing  && s.deltaBadgeLose]}>
            <Text style={[s.deltaText, isBeating && s.deltaTextWin, isLosing  && s.deltaTextLose]}>
              {isBeating ? '+' : ''}{delta}%
            </Text>
          </View>
        )}
      </View>

      <View style={s.barsContainer}>
        <View style={s.barTrack}>
          <Animated.View style={[s.barFill, s.ghostBarFill, { width: ghostBarAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <View style={s.barTrack}>
          <Animated.View style={[s.barFill, s.userBarFill, { width: userBarAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>

      {/* 🚀 EL GRITO DEL ENTRENADOR EN TEXTO GRIS */}
      {repsNeededText && (
        <Text style={s.coachWhisper}>{repsNeededText}</Text>
      )}

      {isBeating && (
        <View style={s.victoryRow}>
          <View style={s.victoryDot} />
          <Text style={s.victoryText}>¡Ya lo superaste!</Text>
        </View>
      )}
    </View>
  );
}

const GHOST_COLOR = '#4A9EFF';
const USER_COLOR  = colors.primary;

const s = StyleSheet.create({
  container: { backgroundColor: '#0C0C0C', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#1A1A1A', gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ghostDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: GHOST_COLOR, opacity: 0.8 },
  ghostLabel: { fontSize: 11, fontWeight: '900', color: GHOST_COLOR, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.8 },
  ghostStat: { fontSize: 11, color: GHOST_COLOR, fontWeight: '500', opacity: 0.65 },
  deltaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  deltaBadgeWin: { backgroundColor: 'rgba(34, 197, 94, 0.10)', borderColor: 'rgba(34, 197, 94, 0.25)' },
  deltaBadgeLose: { backgroundColor: 'rgba(255, 77, 0, 0.08)', borderColor: 'rgba(255, 77, 0, 0.2)' },
  deltaText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  deltaTextWin:  { color: colors.success },
  deltaTextLose: { color: colors.primary },
  barsContainer: { gap: 5 },
  barTrack: { height: 8, backgroundColor: '#1A1A1A', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, minWidth: 4 },
  ghostBarFill: { backgroundColor: GHOST_COLOR },
  userBarFill: { backgroundColor: USER_COLOR },
  victoryRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  victoryDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.success },
  victoryText: { fontSize: 10, fontWeight: '900', color: colors.success, letterSpacing: 0.8, textTransform: 'uppercase' },
  coachWhisper: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 2 } // 👈 Estilo para el nuevo texto motivacional
});