/**
 * components/ui/SessionReportCard.tsx
 *
 * El "Moment of Delight" post-entreno.
 * Se muestra en el Summary Screen DESPUÉS de guardar la sesión.
 *
 * QUÉ MUESTRA:
 * ┌────────────────────────────────────────┐
 * │  📊 TU RENDIMIENTO HOY                 │
 * │                                        │
 * │  ↑ +12% vs tu promedio                 │  ← Hero metric (grande, naranja)
 * │  ¡Nuevo récord personal! 🏆            │  ← Badge si aplica
 * │                                        │
 * │  ┌──────────┬──────────┬──────────┐   │
 * │  │ 450 kg   │ 401 kg   │ 520 kg   │   │
 * │  │ Hoy      │ Prom.    │ Récord   │   │
 * │  └──────────┴──────────┴──────────┘   │
 * │                                        │
 * │  TENDENCIA ÚLTIMAS SESIONES            │
 * │  ████░ ████░░ ████████                │  ← Mini sparkline
 * │  380kg  401kg  450kg                  │
 * └────────────────────────────────────────┘
 *
 * USO en session.tsx (showSummary = true):
 *   <SessionReportCard
 *     sesionId={savedSessionId}
 *     rutinaId={rutinaId}
 *     onShare={shareWorkout}
 *   />
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography } from '../../constants/theme';

// ─── Tipos del reporte ────────────────────────────────────────────────────────

interface SesionActual {
  volumen: number;
  duracion: number;
  sets: number;
  calorias: number;
}

interface HistoricoRutina {
  total_sesiones: number;
  avg_volumen: number;
  max_volumen: number;
  avg_duracion_seg: number;
  avg_sets: number;
  tendencia_volumen: { volumen: number; fecha: string }[];
}

interface RecordsGlobales {
  max_volumen_historico: number;
  total_sesiones_historico: number;
}

interface SessionReport {
  sesion_actual: SesionActual;
  historico_rutina: HistoricoRutina | null;
  records_globales: RecordsGlobales | null;
  delta_vs_promedio_pct: number | null;
}

// ─── Hook: useSessionReport ───────────────────────────────────────────────────

function useSessionReport(sesionId: string | undefined, rutinaId: string | undefined) {
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sesionId || !rutinaId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);

        const { data, error: rpcError } = await supabase.rpc('get_session_report', {
          p_sesion_id: sesionId,
          p_rutina_id: rutinaId,
        });

        if (rpcError) throw rpcError;
        setReport(data as SessionReport);
      } catch (e: any) {
        console.error('[useSessionReport] Error:', e.message);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sesionId, rutinaId]);

  // Derivados calculados en el cliente (a partir de los datos del servidor)
  const esNuevoRecordRutina =
    report?.sesion_actual?.volumen != null &&
    report?.historico_rutina?.max_volumen != null &&
    report.sesion_actual.volumen > report.historico_rutina.max_volumen;

  const esNuevoRecordGlobal =
    report?.sesion_actual?.volumen != null &&
    report?.records_globales?.max_volumen_historico != null &&
    report.sesion_actual.volumen > report.records_globales.max_volumen_historico;

  const esPrimeraSesion =
    report?.delta_vs_promedio_pct == null &&
    report?.historico_rutina?.total_sesiones === 0;

  return {
    report,
    loading,
    error,
    esNuevoRecordRutina,
    esNuevoRecordGlobal,
    esPrimeraSesion,
  };
}

// ─── Subcomponente: DeltaBadge ────────────────────────────────────────────────
// El número hero: "+12% vs tu promedio"

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;

  const isPositive = delta >= 0;
  const isNeutral  = Math.abs(delta) < 1;

  const icon  = isNeutral ? 'remove' : isPositive ? 'trending-up' : 'trending-down';
  const color = isNeutral ? colors.textSecondary : isPositive ? colors.success : colors.error;
  const label = isNeutral
    ? 'Igual a tu promedio'
    : `${isPositive ? '+' : ''}${delta}% vs tu promedio`;

  return (
    <View style={[db.container, { borderColor: color + '40' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[db.text, { color }]}>{label}</Text>
    </View>
  );
}

const db = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 16,
    fontWeight: '800',
  },
});

// ─── Subcomponente: MetricTriple ──────────────────────────────────────────────
// Las tres columnas: Hoy | Promedio | Récord

function MetricTriple({
  actual,
  promedio,
  record,
}: {
  actual: number;
  promedio: number | null;
  record: number | null;
}) {
  const fmt = (n: number | null) =>
    n != null ? `${Math.round(n).toLocaleString()} kg` : '—';

  return (
    <View style={mt.row}>
      <View style={mt.cell}>
        <Text style={[mt.value, { color: colors.primary }]}>{fmt(actual)}</Text>
        <Text style={mt.label}>HOY</Text>
      </View>
      <View style={mt.divider} />
      <View style={mt.cell}>
        <Text style={mt.value}>{fmt(promedio)}</Text>
        <Text style={mt.label}>PROMEDIO</Text>
      </View>
      <View style={mt.divider} />
      <View style={mt.cell}>
        <Text style={[mt.value, { color: '#F59E0B' }]}>{fmt(record)}</Text>
        <Text style={mt.label}>RÉCORD</Text>
      </View>
    </View>
  );
}

const mt = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cell: { flex: 1, alignItems: 'center', gap: 4 },
  value: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  divider: { width: 1, backgroundColor: colors.border, marginHorizontal: 4 },
});

// ─── Subcomponente: TrendSparkline ────────────────────────────────────────────
// Mini gráfica de barras con las últimas 3 sesiones + la actual

function TrendSparkline({
  tendencia,
  actual,
}: {
  tendencia: { volumen: number; fecha: string }[];
  actual: number;
}) {
  // Mostramos máximo 3 previas + la actual = 4 barras
  const previas = tendencia.slice(0, 3).reverse(); // Cronológico (más antiguo primero)
  const puntos  = [
    ...previas.map((p) => ({ volumen: p.volumen, label: 'ant.', isToday: false })),
    { volumen: actual, label: 'hoy', isToday: true },
  ];

  if (puntos.length < 2) return null;

  const maxVol = Math.max(...puntos.map((p) => p.volumen), 1);

  return (
    <View style={sp.container}>
      <View style={sp.titleRow}>
        <Ionicons name="stats-chart-outline" size={13} color={colors.textMuted} />
        <Text style={sp.title}>TENDENCIA</Text>
      </View>
      <View style={sp.barsRow}>
        {puntos.map((punto, i) => {
          const height = Math.max((punto.volumen / maxVol) * 56, 4);
          return (
            <View key={i} style={sp.barGroup}>
              <Text style={[sp.barValue, punto.isToday && { color: colors.primary }]}>
                {Math.round(punto.volumen)}
              </Text>
              <View style={sp.barTrack}>
                {punto.isToday ? (
                  <LinearGradient
                    colors={[colors.primary, '#FF8C00']}
                    style={[sp.bar, { height }]}
                  />
                ) : (
                  <View style={[sp.bar, { height, backgroundColor: colors.surfaceLight }]} />
                )}
              </View>
              <Text style={[sp.barLabel, punto.isToday && { color: colors.primary }]}>
                {punto.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const sp = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    width: '100%',
    height: 60,
    justifyContent: 'flex-end',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: radius.sm,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});

// ─── Componente principal: SessionReportCard ──────────────────────────────────

interface SessionReportCardProps {
  sesionId: string | undefined;
  rutinaId: string | undefined;
  nombreRutina?: string;
}

export default function SessionReportCard({
  sesionId,
  rutinaId,
  nombreRutina,
}: SessionReportCardProps) {
  const {
    report,
    loading,
    error,
    esNuevoRecordRutina,
    esNuevoRecordGlobal,
    esPrimeraSesion,
  } = useSessionReport(sesionId, rutinaId);

  if (loading) {
    return (
      <View style={s.loadingCard}>
        <ActivityIndicator color={colors.primary} />
        <Text style={s.loadingText}>Analizando tu rendimiento...</Text>
      </View>
    );
  }

  if (error || !report?.sesion_actual) {
    // En caso de error, no mostramos nada — el Summary ya tiene el mensaje de IA.
    // El reporte es un "bonus" no crítico.
    return null;
  }

  const { sesion_actual, historico_rutina, delta_vs_promedio_pct } = report;

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        <Ionicons name="analytics-outline" size={16} color={colors.primary} />
        <Text style={s.cardHeaderText}>TU RENDIMIENTO HOY</Text>
      </View>

      {/* Badge de nuevo récord (aparece solo si aplica) */}
      {esNuevoRecordGlobal && (
        <LinearGradient
          colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.05)']}
          style={s.recordBanner}
        >
          <Text style={s.recordIcon}>🏆</Text>
          <View style={s.recordText}>
            <Text style={s.recordTitle}>¡NUEVO RÉCORD PERSONAL!</Text>
            <Text style={s.recordSub}>Tu mejor sesión de todos los tiempos</Text>
          </View>
        </LinearGradient>
      )}

      {!esNuevoRecordGlobal && esNuevoRecordRutina && (
        <View style={s.recordBannerSmall}>
          <Text style={s.recordIconSmall}>⭐</Text>
          <Text style={s.recordSubSmall}>Récord para esta rutina</Text>
        </View>
      )}

      {/* Delta vs promedio (Hero metric) */}
      {!esPrimeraSesion && (
        <DeltaBadge delta={delta_vs_promedio_pct ?? null} />
      )}

      {esPrimeraSesion && (
        <View style={s.primeraBox}>
          <Text style={s.primeraText}>
            🎯 Primera sesión completada. ¡Aquí empieza tu historial!
          </Text>
        </View>
      )}

      {/* Triple métrica */}
      <MetricTriple
        actual={sesion_actual.volumen}
        promedio={historico_rutina?.avg_volumen ?? null}
        record={historico_rutina?.max_volumen ?? null}
      />

      {/* Sparkline de tendencia */}
      {historico_rutina && historico_rutina.tendencia_volumen?.length > 0 && (
        <TrendSparkline
          tendencia={historico_rutina.tendencia_volumen}
          actual={sesion_actual.volumen}
        />
      )}

      {/* Stats secundarios */}
      <View style={s.secondaryStats}>
        <View style={s.statChip}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={s.statChipText}>
            {Math.floor(sesion_actual.duracion / 60)} min
          </Text>
        </View>
        <View style={s.statChip}>
          <Ionicons name="checkmark-circle-outline" size={13} color={colors.textMuted} />
          <Text style={s.statChipText}>{sesion_actual.sets} series</Text>
        </View>
        <View style={s.statChip}>
          <Ionicons name="flame-outline" size={13} color={colors.textMuted} />
          <Text style={s.statChipText}>{sesion_actual.calorias} kcal</Text>
        </View>
        {historico_rutina && historico_rutina.total_sesiones > 0 && (
          <View style={s.statChip}>
            <Ionicons name="repeat-outline" size={13} color={colors.textMuted} />
            <Text style={s.statChipText}>
              Sesión #{historico_rutina.total_sesiones + 1} de {nombreRutina || 'esta rutina'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    ...typography.small,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHeaderText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  recordBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  recordIcon: { fontSize: 28 },
  recordText: { flex: 1 },
  recordTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  recordSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recordBannerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  recordIconSmall: { fontSize: 14 },
  recordSubSmall: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '700',
  },
  primeraBox: {
    backgroundColor: colors.primaryFaded,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  primeraText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    lineHeight: 18,
  },
  secondaryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});