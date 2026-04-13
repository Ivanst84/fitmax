import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, Animated } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '../../constants/theme';
import GhostTracker from '../../components/ui/GhostTracker';

const { width } = Dimensions.get('window');

interface GhostCalibrationProps {
  onFinish: () => void;
}

export default function GhostCalibration({ onFinish }: GhostCalibrationProps) {
  const [step, setStep] = useState('intro');
  const [mode, setMode] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [flashActive, setFlashActive] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const startChallenge = (selectedMode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMode(selectedMode);
    setScore(0);
    setTimeLeft(10);
    setStep('challenge');
  };

  useEffect(() => {
    let subscription: any;
    if (step === 'challenge' && mode !== 'taps' && mode !== null) {
      Accelerometer.setUpdateInterval(60); 
      subscription = Accelerometer.addListener(data => {
        const { x, y, z } = data;
        const totalAccel = Math.sqrt(x*x + y*y + z*z);
        if (mode === 'shake' && totalAccel > 2.7) triggerHit(1.2);
        else if (mode === 'punch' && Math.abs(z) > 2.4) triggerHit(2.5);
        else if (mode === 'static' && totalAccel > 1.08) triggerHit(0.8);
      });
    }
    return () => subscription?.remove();
  }, [step, mode]);

  useEffect(() => {
    if (step === 'challenge' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && step === 'challenge') {
      setStep('result');
    }
  }, [timeLeft, step]);

  const triggerHit = (val: number) => {
    setScore(prev => prev + val);
    setFlashActive(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 50, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();

    setTimeout(() => setFlashActive(false), 100);
  };

  // 🚀 JUSTIFICACIONES CIENTÍFICAS DINÁMICAS
 // 🚀 JUSTIFICACIONES HONESTAS (Gamificación sin mentiras)
  const getChallengeData = () => {
    switch (mode) {
      case 'taps': return { instr: "RETO DE VELOCIDAD", desc: "Toca el núcleo rápido para medir tu tiempo de reacción." };
      case 'shake': return { instr: "RETO DE ACTIVACIÓN", desc: "¡Despierta! Agita el teléfono con energía." };
      case 'punch': return { instr: "PRUEBA DE REFLEJOS", desc: "Lanza golpes al aire para medir tu aceleración." };
      case 'static': return { instr: "ENFOQUE MENTAL", desc: "Aprieta con firmeza y mantén la mayor estabilidad posible." };
      default: return { instr: "", desc: "" };
    }
  };

  const challengeInfo = getChallengeData();

  const getResultMessage = () => {
    if (score === 0) return { title: "CALIBRACIÓN ESTÁNDAR", phrase: "Modo base activado. Listo para empezar.", color: colors.textMuted };
    if (score < 25) return { title: "PERFIL CONSTANTE", phrase: "Ritmo estable detectado. Optimizando rutina.", color: colors.primary };
    return { title: "PERFIL EXPLOSIVO", phrase: "¡Gran energía! Ajustando para un entrenamiento dinámico.", color: colors.success };
  };

  const res = getResultMessage();

  return (
    <View style={[s.container, flashActive && { backgroundColor: '#021102' }]}>
      <StatusBar barStyle="light-content" />
      
     {step === 'intro' && (
        <View style={s.center}>
          <Ionicons name="flash" size={80} color={colors.primary} />
          <Text style={s.title}>RETO DE ACTIVACIÓN</Text>
          <Text style={s.desc}>Para adaptar el entrenamiento a ti hoy, vamos a hacer un rápido mini-juego de calentamiento.</Text>
          <TouchableOpacity style={s.mainBtn} onPress={() => setStep('selector')}>
            <Text style={s.mainBtnText}>ELEGIR RETO</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'selector' && (
        <View style={s.center}>
          <Text style={s.title}>ELIGE TU TEST</Text>
          <Text style={s.selectorSub}>Supera un reto rápido antes de empezar a levantar peso.</Text>
          <View style={s.grid}>
            <ModeCard icon="finger-print" title="VELOCIDAD" desc="Reacción" onPress={() => startChallenge('taps')} />
            <ModeCard icon="flash" title="ACTIVACIÓN" desc="Energía" onPress={() => startChallenge('shake')} />
            <ModeCard icon="rocket" title="REFLEJOS" desc="Aceleración" onPress={() => startChallenge('punch')} />
            <ModeCard icon="lock-closed" title="ENFOQUE" desc="Estabilidad" onPress={() => startChallenge('static')} />
          </View>
        </View>
      )}
      {step === 'challenge' && (
        <View style={s.center}>
          <View style={[s.instructionBox, flashActive && { borderColor: colors.success }]}>
            <Text style={[s.instructionText, flashActive && { color: colors.success }]}>{challengeInfo.instr}</Text>
            <Text style={s.instructionSub}>{challengeInfo.desc}</Text>
          </View>

          <Text style={[s.timer, flashActive && { color: colors.success }]}>{timeLeft}s</Text>
          
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {mode === 'taps' ? (
              <TouchableOpacity onPress={() => triggerHit(1)} style={[s.tapTarget, flashActive && s.tapTargetActive]} activeOpacity={1}>
                <View style={[s.tapInner, flashActive && { backgroundColor: colors.success }]} />
                {flashActive && <View style={s.shockwave} />}
              </TouchableOpacity>
            ) : (
              <View style={[s.sensorIcon, flashActive && s.sensorIconActive]}>
                <Ionicons name={mode === 'shake' ? "flash" : mode === 'punch' ? "rocket" : "fitness"} size={100} color={flashActive ? colors.success : colors.primary} />
              </View>
            )}
          </Animated.View>

          <View style={s.trackerWrapper}>
            <Text style={s.scoreLabel}>ANALIZANDO MOVIMIENTO </Text>
            <Text style={[s.scoreValue, flashActive && { color: colors.success }]}>{Math.floor(score * 2.5)}%</Text>
            <GhostTracker currentKg="0" currentReps={score.toString()} ghostSets={[{kg:0, reps: 40, completed: false}]} setIndex={0} />
          </View>
        </View>
      )}

 {step === 'result' && (
        <View style={s.center}>
          <Ionicons name="shield-checkmark" size={80} color={res.color} />
          <Text style={[s.title, { color: res.color }]}>{res.title}</Text>
          <View style={s.resultCard}>
            <Text style={s.ghostIdentity}>RETO COMPLETADO CON ÉXITO</Text>
            <Text style={s.ghostPhrase}>"{res.phrase}"</Text>
          </View>
          <TouchableOpacity style={s.mainBtn} onPress={onFinish}>
            <Text style={s.mainBtnText}>ENTRAR AL SISTEMA</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ModeCard({ icon, title, desc, onPress }: any) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress}>
      <Ionicons name={icon} size={30} color={colors.primary}/>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.cardDesc}>{desc}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 30, justifyContent: 'center' },
  center: { alignItems: 'center', width: '100%' },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 10, textAlign: 'center', textTransform: 'uppercase' },
  desc: { color: colors.textSecondary, textAlign: 'center', marginBottom: 40, fontSize: 15, lineHeight: 22 },
  selectorSub: { color: colors.textMuted, textAlign: 'center', marginBottom: 30, fontSize: 13 },
  timer: { fontSize: 80, fontWeight: '900', color: colors.primary, marginBottom: 10 },
  instructionBox: { padding: 15, borderWidth: 1, borderColor: '#222', borderRadius: 12, marginBottom: 30, width: '100%', backgroundColor: '#0A0A0A' },
  instructionText: { color: colors.primary, textAlign: 'center', fontWeight: '900', letterSpacing: 2, fontSize: 16 },
  instructionSub: { color: colors.textMuted, textAlign: 'center', fontSize: 11, marginTop: 4 },
  tapTarget: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primary },
  tapTargetActive: { borderColor: colors.success },
  tapInner: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary },
  shockwave: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: colors.success, opacity: 0.5 },
  sensorIcon: { padding: 40, backgroundColor: '#0A0A0A', borderRadius: 100, borderWidth: 1, borderColor: '#222' },
  sensorIconActive: { borderColor: colors.success, backgroundColor: 'rgba(0,255,0,0.05)' },
  trackerWrapper: { width: '100%', marginTop: 50 },
  scoreLabel: { color: '#444', fontSize: 9, fontWeight: '900', textAlign: 'center', letterSpacing: 1.5, marginBottom: 5 },
  scoreValue: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 5 },
  mainBtn: { backgroundColor: colors.primary, padding: 20, borderRadius: 50, width: '100%', alignItems: 'center' },
  mainBtnText: { fontWeight: '900', color: '#000', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  card: { width: (width - 80) / 2, padding: 20, backgroundColor: '#0A0A0A', borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  cardTitle: { color: '#fff', marginTop: 10, fontWeight: '900', fontSize: 13 },
  cardDesc: { color: colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 2 },
  resultCard: { backgroundColor: '#0A0A0A', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#222', width: '100%', marginBottom: 30, alignItems: 'center' },
  ghostIdentity: { fontSize: 10, color: colors.textMuted, letterSpacing: 2, marginBottom: 10, fontWeight: 'bold' },
  ghostPhrase: { ...typography.body, color: '#fff', textAlign: 'center', fontStyle: 'italic' }
});