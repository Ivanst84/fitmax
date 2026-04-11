import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../lib/supabase';
import { useRoutines, RutinaSemana } from '../../hooks/useRoutines';
import { colors, spacing, radius, typography } from '../../constants/theme';

const DIAS_SHORT = ['', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

// Slot = la caja del día. El dia (1-7) NUNCA cambia.
// Lo que cambia es el contenido (rutina, descanso, vacío).
type Slot = RutinaSemana & { dia_real_asignado: number };

export default function RoutinesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rutinas, cargando, refetch } = useRoutines();

  const [semana, setSemana] = useState<Slot[]>([]);
  // null = modo normal | número 1-7 = modo mover (ese día está seleccionado)
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (rutinas && !cargando) {
      setSemana(rutinas as Slot[]);
    }
  }, [rutinas, cargando]);

  // ─── TAP CORTO: navegar o confirmar destino ─────────────────────────────
  const handleTap = useCallback(
    async (dia: number) => {
      const slot = semana[dia - 1];

      // ── MODO MOVER ACTIVO ──
      if (selectedDia !== null) {
        // Toca el mismo → cancelar
        if (selectedDia === dia) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedDia(null);
          return;
        }
        // Toca otro día → ejecutar movimiento
        await executarMovimiento(selectedDia, dia);
        return;
      }

      // ── MODO NORMAL ──
      if (slot.isRest) return;
      if (slot.isEmpty) {
        router.push('/create-routine');
        return;
      }
      router.push(`/rutina/${slot.id}`);
    },
    [selectedDia, semana, router]
  );

  // ─── LONG PRESS: entrar a modo mover ────────────────────────────────────
  const handleLongPress = useCallback(
    (dia: number) => {
      const slot = semana[dia - 1];
      if (slot.isRest || slot.isEmpty || isSyncing) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setSelectedDia(dia);
    },
    [semana, isSyncing]
  );

  // ─── LÓGICA CENTRAL: mover o intercambiar ───────────────────────────────
  const executarMovimiento = useCallback(
    async (diaOrigen: number, diaDestino: number) => {
      const origen = semana[diaOrigen - 1];
      const destino = semana[diaDestino - 1];

      // Construimos la nueva semana: solo cambia el CONTENIDO de los slots,
      // nunca la posición del slot (dia_real_asignado se mantiene).
      const nuevaSemana: Slot[] = semana.map((slot) => {
        if (slot.dia_real_asignado === diaOrigen) {
          // El slot origen recibe lo que tenía el destino
          if (destino.isRest || destino.isEmpty) {
            return {
              ...slot,
              id: `rest-${diaOrigen}`,
              nombre: 'Descanso',
              isRest: true,
              isEmpty: false,
              isCustom: false,
              duracion_min: undefined,
            };
          }
          // Intercambio: origen recibe la rutina del destino
          return {
            ...destino,
            dia_real_asignado: diaOrigen, // <-- el día NO cambia, solo el contenido
          };
        }

        if (slot.dia_real_asignado === diaDestino) {
          // El slot destino siempre recibe la rutina del origen
          return {
            ...origen,
            dia_real_asignado: diaDestino, // <-- el día NO cambia, solo el contenido
          };
        }

        return slot;
      });

      // Actualizar UI de forma inmediata (optimistic update)
      setSemana(nuevaSemana);
      setSelectedDia(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ── Persistir en Supabase ──
      setIsSyncing(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Sin usuario');

        const promesas = [];

        // La rutina del origen se mueve al día destino
        if (origen.id && !origen.id.startsWith('rest-') && !origen.id.startsWith('empty-')) {
          promesas.push(
            supabase.from('RUTINAS').update({ dia_semana: diaDestino }).eq('id', origen.id)
          );
        }

        // Si el destino tenía una rutina real, la movemos al día origen (intercambio)
        if (
          destino.id &&
          !destino.isRest &&
          !destino.isEmpty &&
          !destino.id.startsWith('rest-') &&
          !destino.id.startsWith('empty-')
        ) {
          promesas.push(
            supabase.from('RUTINAS').update({ dia_semana: diaOrigen }).eq('id', destino.id)
          );
        }

        // Actualizamos días de entrenamiento del usuario según la nueva semana
        const nuevosDias = nuevaSemana
          .filter((s) => !s.isRest && !s.isEmpty)
          .map((s) => s.dia_real_asignado);

        promesas.push(
          supabase.from('USUARIOS').update({ dias_entrenamiento: nuevosDias }).eq('id', user.id)
        );

        const resultados = await Promise.all(promesas);
        const errores = resultados.filter((r) => r.error);

        if (errores.length > 0) {
          console.error('❌ Error BD:', errores);
          refetch(); // Rollback visual
        }
      } catch (e) {
        console.error('❌', e);
        refetch();
      } finally {
        setIsSyncing(false);
      }
    },
    [semana, refetch]
  );

  // ─── Render de cada slot ─────────────────────────────────────────────────
  const renderSlot = (slot: Slot) => {
    const dia = slot.dia_real_asignado;
    const isSelected = selectedDia === dia;
    const enModoMover = selectedDia !== null;

    // ── DESCANSO ──
    if (slot.isRest) {
      return (
        <TouchableOpacity
          key={dia}
          style={[s.slotRow, s.restSlot, enModoMover && !isSelected && s.slotDestinable]}
          onPress={() => handleTap(dia)}
          activeOpacity={0.7}
        >
          <DayBadge dia={dia} isSelected={false} isRest />
          <View style={s.slotContent}>
            <Text style={s.restNombre}>Descanso</Text>
            <Text style={s.slotMeta}>Recuperación muscular</Text>
          </View>
          {enModoMover && !isSelected && (
            <View style={s.moverAquiChip}>
              <Text style={s.moverAquiText}>Mover aquí</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // ── DÍA VACÍO ──
    if (slot.isEmpty) {
      return (
        <TouchableOpacity
          key={dia}
          style={[s.slotRow, s.emptySlot, enModoMover && !isSelected && s.slotDestinable]}
          onPress={() => handleTap(dia)}
          activeOpacity={0.7}
        >
          <DayBadge dia={dia} isSelected={false} />
          <View style={s.slotContent}>
            <Text style={s.emptyNombre}>
              {enModoMover ? 'Mover aquí' : 'Día libre'}
            </Text>
            <Text style={s.slotMeta}>
              {enModoMover ? 'Este día quedará con la rutina' : 'Toca para crear rutina'}
            </Text>
          </View>
          <Ionicons
            name={enModoMover ? 'arrow-forward-circle' : 'add-circle-outline'}
            size={22}
            color={enModoMover ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      );
    }

    // ── RUTINA REAL ──
    return (
      <TouchableOpacity
        key={dia}
        style={[
          s.slotRow,
          s.activeSlot,
          isSelected && s.activeSlotSelected,
          enModoMover && !isSelected && s.slotDestinable,
        ]}
        onPress={() => handleTap(dia)}
        onLongPress={() => handleLongPress(dia)}
        delayLongPress={350}
        activeOpacity={0.8}
      >
        <DayBadge dia={dia} isSelected={isSelected} />

        <View style={s.slotContent}>
          <View style={s.nombreRow}>
            <Text style={[s.rutinaNombre, isSelected && { color: colors.primary }]} numberOfLines={1}>
              {slot.nombre}
            </Text>
            {slot.isCustom && (
              <View style={s.propiaChip}>
                <Text style={s.propiaText}>PROPIA</Text>
              </View>
            )}
          </View>
          <View style={s.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={s.slotMeta}>{slot.duracion_min || 45} min</Text>
          </View>
        </View>

        {isSelected ? (
          // Estado: seleccionado para mover
          <View style={s.seleccionadoIcon}>
            <Ionicons name="hand-left" size={18} color={colors.primary} />
          </View>
        ) : enModoMover ? (
          // Estado: destino potencial de intercambio
          <View style={s.moverAquiChip}>
            <Text style={s.moverAquiText}>Intercambiar</Text>
          </View>
        ) : (
          // Estado: normal, navegar al detalle
          <View style={s.playBtn}>
            <Ionicons name="chevron-forward" size={18} color="#000" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <View>
          <Text style={s.title}>Semana</Text>
          <Text style={s.subtitle}>Tu plan de 7 días</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={refetch} disabled={isSyncing}>
          <Ionicons
            name={isSyncing ? 'sync' : 'refresh'}
            size={22}
            color={isSyncing ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Banner contextual: aparece solo en modo mover */}
      {selectedDia !== null && (
        <TouchableOpacity
          style={s.instruccionBanner}
          onPress={() => setSelectedDia(null)}
          activeOpacity={0.8}
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={s.instruccionText}>
            Toca el día destino para mover{' '}
            <Text style={{ fontWeight: '900' }}>
              {semana[selectedDia - 1]?.nombre}
            </Text>
          </Text>
          <View style={s.cancelarChip}>
            <Text style={s.cancelarText}>Cancelar ✕</Text>
          </View>
        </TouchableOpacity>
      )}

      {cargando && semana.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.lista}
        >
          {semana.map(renderSlot)}

          {/* Hint de long press solo cuando no hay selección */}
          {selectedDia === null && (
            <Text style={s.hint}>
              Mantén presionado una rutina para moverla a otro día
            </Text>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Sub-componente: badge del día ───────────────────────────────────────────
function DayBadge({
  dia,
  isSelected,
  isRest = false,
}: {
  dia: number;
  isSelected: boolean;
  isRest?: boolean;
}) {
  return (
    <View
      style={[
        s.dayBadge,
        isSelected && s.dayBadgeSelected,
        isRest && s.dayBadgeRest,
      ]}
    >
      {!isRest && !isSelected && <View style={s.dot} />}
      <Text
        style={[
          s.dayBadgeText,
          isSelected && s.dayBadgeTextSelected,
          isRest && s.dayBadgeTextRest,
        ]}
      >
        {['', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][dia]}
      </Text>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  title: { ...typography.h1 },
  subtitle: { ...typography.body },
  refreshBtn: {
    padding: 8, backgroundColor: colors.surface, borderRadius: radius.full,
  },

  // Banner contextual
  instruccionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primaryFaded,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary,
  },
  instruccionText: {
    flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 18,
  },
  cancelarChip: {
    backgroundColor: colors.primary, paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: radius.full,
  },
  cancelarText: { fontSize: 11, fontWeight: '800', color: '#000' },

  lista: { paddingHorizontal: spacing.lg },

  // ── Slots ──
  slotRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.md, minHeight: 72,
  },
  activeSlot: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  activeSlotSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  restSlot: {
    paddingHorizontal: spacing.sm, opacity: 0.65,
  },
  emptySlot: {
    backgroundColor: colors.surfaceLight, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
  },
  // Cuando hay selección activa, el slot "brilla" como destino disponible
  slotDestinable: {
    borderColor: `${colors.primary}60`,
    borderStyle: 'solid',
    opacity: 1,
  },

  // ── Day badge ──
  dayBadge: {
    width: 46, alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: colors.border,
    marginRight: spacing.md, paddingRight: spacing.sm, alignSelf: 'stretch',
  },
  dayBadgeSelected: { borderRightColor: colors.primary },
  dayBadgeRest: { borderRightColor: 'transparent' },
  dot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: colors.primary, marginBottom: 4,
  },
  dayBadgeText: {
    fontSize: 11, fontWeight: '900', color: colors.primary,
  },
  dayBadgeTextSelected: { color: colors.primary },
  dayBadgeTextRest: { color: colors.textMuted },

  // ── Contenido del slot ──
  slotContent: { flex: 1 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  rutinaNombre: { ...typography.label, flexShrink: 1 },
  restNombre: { ...typography.label, color: colors.textMuted },
  emptyNombre: { ...typography.label, color: colors.textMuted },
  slotMeta: { ...typography.small, marginLeft: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },

  // ── Chips y botones ──
  propiaChip: {
    backgroundColor: colors.primaryFaded, paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: radius.sm,
  },
  propiaText: { ...typography.caption, color: colors.primary },
  moverAquiChip: {
    backgroundColor: colors.primaryFaded, paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.primary,
  },
  moverAquiText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  seleccionadoIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.primary,
  },
  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },

  hint: {
    ...typography.small, textAlign: 'center',
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },
});