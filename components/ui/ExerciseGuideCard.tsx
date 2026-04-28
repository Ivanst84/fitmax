import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  LayoutAnimation, Platform, UIManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

import MuscleMap from './MuscleMap';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { Ejercicio } from '../../types/database.types';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface ExerciseGuideCardProps {
  ejercicio: Ejercicio;
  compact?: boolean;
}

const NIVELES: Record<number, { label: string; color: string }> = {
  1: { label: 'Principiante', color: '#1D9E75' },
  2: { label: 'Intermedio',   color: '#EF9F27' },
  3: { label: 'Avanzado',     color: '#E24B4A' },
};

const EQUIPOS: Record<number, string> = {
  1: 'Sin equipo', 2: 'Mancuernas', 3: 'Banda elástica', 4: 'Barra',
  5: 'Polea', 6: 'Máquina', 7: 'Kettlebell', 8: 'Banco',
  9: 'Barra dominadas', 10: 'TRX',
};

const SAFETY_TIPS: Record<number, string[]> = {
  1: ['Mantén los codos a 45° del torso', 'No bloquees los codos al extender', 'Exhala en el esfuerzo'],
  2: ['Retrae los omóplatos antes de jalar', 'Evita redondear la espalda', 'Controla la bajada'],
  3: ['Mantén la columna neutral', 'Activa el core durante todo el movimiento', 'Evita hiperextender'],
  4: ['No eleves los hombros al subir', 'Mantén el core activo', 'Controla la bajada 2 segundos'],
  5: ['No balancees el torso', 'Codos fijos a los costados', 'Rango completo de movimiento'],
  6: ['No bloquees los codos', 'Baja controlado', 'Mantén la tensión en tríceps'],
  7: ['Agarre firme pero sin tensión', 'Muñecas neutras', 'Trabaja ambos lados'],
  8: ['Espalda baja pegada al piso', 'Exhala al contraer', 'No jales el cuello'],
  9: ['Rota desde la cintura, no el cuello', 'Pies fijos en el suelo', 'Movimiento controlado'],
  10: ['Aprieta los glúteos en la cima', 'Pies a ancho de cadera', 'Empuja con talones'],
  11: ['Rodillas detrás de los pies', 'Baja hasta 90° de flexión', 'Peso en los talones'],
  12: ['Espalda recta durante todo el movimiento', 'Baja controlado', 'Activa los isquios antes'],
  13: ['Sube hasta el máximo', 'Baja lento (3 segundos)', 'Una sola articulación activa'],
  14: ['Hidratación constante', 'Respira de forma controlada', 'Escucha a tu cuerpo'],
  15: ['Mantén la frecuencia cardíaca en zona objetivo', 'Hidratación constante', 'Calienta 5 min antes'],
};

export default function ExerciseGuideCard({ ejercicio, compact = false }: ExerciseGuideCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 🚀 Lógica de datos preparada para ser usada por la voz y el render
  const nivel = NIVELES[ejercicio.nivel_id ?? 1];
  const equipo = EQUIPOS[ejercicio.equipo_id ?? 1];
  
  const pasos = ejercicio.descripcion
    ? ejercicio.descripcion.split(/[.;]/).map(s => s.trim()).filter(s => s.length > 10)
    : [];

  const tipsArray = ejercicio.tips 
    ? ejercicio.tips.split('|').map(t => t.trim()).filter(t => t.length > 0)
    : (SAFETY_TIPS[ejercicio.musculo_id ?? 14] ?? SAFETY_TIPS[14]);

  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  const toggleSpeech = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    // 🚀 IMPORTANTE: Marcamos que está hablando ANTES de empezar
    setIsSpeaking(true);

    const guion = `
      Ejercicio: ${ejercicio.nombre}.
      Instrucciones: ${pasos.length > 0 ? pasos.join('. ') : 'Sigue el movimiento con técnica y control.'}
      Atención a los tips de seguridad: ${tipsArray.join('. ')}.
      Recuerda mantener una ejecución controlada.
    `;

    Speech.speak(guion, {
      language: 'es-MX',
      rate: 0.85,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Cómo hacerlo</Text>
          <View style={styles.badgesRow}>
            {nivel && (
              <View style={[styles.badge, { borderColor: nivel.color }]}>
                <Text style={[styles.badgeText, { color: nivel.color }]}>{nivel.label}</Text>
              </View>
            )}
            <View style={styles.badge}>
              <Ionicons name="barbell-outline" size={11} color={colors.textSecondary} />
              <Text style={styles.badgeText}>{equipo}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.audioBtn, isSpeaking && styles.audioBtnActive]} 
            onPress={toggleSpeech}
          >
            <Ionicons 
              name={isSpeaking ? "stop-circle" : "volume-medium"} 
              size={22} 
              color={isSpeaking ? colors.background : colors.primary} 
            />
          </TouchableOpacity>

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View>
          <View style={styles.bodyRow}>
            <View style={styles.muscleCol}>
              <MuscleMap muscleId={ejercicio.musculo_id ?? 14} size="sm" showLabel={true} showToggle={true} />
            </View>

            <View style={styles.stepsCol}>
              {pasos.length > 0 ? (
                pasos.slice(0, 4).map((paso, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{paso}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noStepsText}>Realiza el movimiento de forma lenta y controlada...</Text>
              )}
            </View>
          </View>

          <View style={styles.tipsSection}>
            <View style={styles.tipsTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={styles.tipsTitle}>Tips de seguridad</Text>
            </View>
            {/* 🚀 CORREGIDO: Usamos tipsArray para el render */}
            {tipsArray.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={14} color="#EF9F27" style={{ marginRight: 6 }} />
            <Text style={styles.warningText}>
              Velocidad controlada: Usa el 60–70% del peso máximo para dominar la técnica.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { ...typography.h1, fontSize: 16, color: colors.textPrimary, marginBottom: 6 },
  audioBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  audioBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  badgeText: { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },
  bodyRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  muscleCol: { alignItems: 'center', width: 110 },
  stepsCol: { flex: 1, gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText: { fontSize: 11, fontWeight: '900', color: colors.primary },
  stepText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  noStepsText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontStyle: 'italic' },
  tipsSection: { marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, backgroundColor: colors.background, borderRadius: radius.md },
  tipsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tipsTitle: { fontSize: 12, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  tipDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary, marginTop: 5, flexShrink: 0 },
  tipText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.sm, backgroundColor: 'rgba(239,159,39,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(239,159,39,0.2)' },
  warningText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
});