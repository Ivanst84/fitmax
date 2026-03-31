// Ruta: app/exercise/[id].tsx
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, StatusBar, ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { getRelativeTime } from '../../lib/dateUtils'; // Ajusta la ruta si es necesario

interface Ejercicio {
  id: string;
  nombre: string;
  descripcion: string;
  musculo_id: number;
  nivel_id: number;
  video_url: string;
  duracion_seg: number;
  calorias_estimadas: number;
  es_premium: boolean;
  regresion_de: string | null; // 🚀 NUEVO CAMPO AÑADIDO
}

interface HistorialPersonal {
  max_peso: number;
  ultima_vez: string | null;
  total_sesiones: number;
}

const MUSCULOS: Record<number, string> = {
  1: 'Pecho', 2: 'Espalda', 3: 'Espalda baja', 4: 'Hombros',
  5: 'Bíceps', 6: 'Tríceps', 8: 'Abdomen', 10: 'Glúteos', 11: 'Piernas', 15: 'Cardio'
};

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [historial, setHistorial] = useState<HistorialPersonal>({ max_peso: 0, ultima_vez: null, total_sesiones: 0 });
  const [cargando, setCargando] = useState(true);
  const [series, setSeries] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const TOTAL_SERIES = 3;

  useEffect(() => { 
    cargarDatosCompletos(); 
  }, [id]);

  const cargarDatosCompletos = async () => {
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Cargar datos del ejercicio (incluyendo regresion_de)
      const { data: ejData } = await supabase
        .from('EJERCICIOS')
        .select('*')
        .eq('id', id)
        .single();
      
      setEjercicio(ejData);

      // 2. Cargar el historial personal
      if (user && ejData) {
        const { data: histData } = await supabase
          .from('HISTORIAL_EJERCICIOS')
          .select('series_json, HISTORIAL_SESIONES(fecha)')
          .eq('ejercicio_id', id)
          .order('created_at', { ascending: false });

        if (histData && histData.length > 0) {
          let maxKg = 0;
          histData.forEach(sesion => {
            const series = sesion.series_json as any[];
            series?.forEach(serie => {
              if (serie.completed && serie.kg > maxKg) {
                maxKg = serie.kg;
              }
            });
          });

          setHistorial({
            max_peso: maxKg,
            ultima_vez: histData[0].HISTORIAL_SESIONES?.[0]?.fecha || null,
            total_sesiones: histData.length
          });
        }
      }
    } catch (e) {
      console.error('Error cargando detalle:', e);
    } finally {
      setCargando(false);
    }
  };

  const player = useVideoPlayer(
    ejercicio?.video_url ?? null,
    (p) => {
      p.loop = true;
      p.addListener('playingChange', (payload) => setIsPlaying(payload.isPlaying));
    }
  );

  const toggleVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) player.pause();
    else player.play();
  };

  const marcarSerie = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSeries(index < series ? index : index + 1);
  };

  // 🚀 FUNCIÓN PARA CAMBIAR A LA VERSIÓN MÁS FÁCIL
  const handleRegresion = () => {
    if (ejercicio?.regresion_de) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.replace(`/exercise/${ejercicio.regresion_de}`);
    }
  };

  if (cargando) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!ejercicio) return (
    <View style={s.center}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
      <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Ejercicio no encontrado</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Video Container */}
      <View style={s.videoContainer}>
        {ejercicio.video_url ? (
          <TouchableOpacity activeOpacity={1} style={s.video} onPress={toggleVideo}>
            <VideoView style={s.video} player={player} allowsFullscreen allowsPictureInPicture contentFit="contain" nativeControls={false} />
            {!isPlaying && (
              <View style={s.playOverlay}>
                <Ionicons name="play-circle" size={70} color="rgba(255,255,255,0.8)" />
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={s.videoPlaceholder}>
            <Ionicons name="videocam-outline" size={48} color={colors.primary} style={{ opacity: 0.5 }} />
            <Text style={s.videoPlaceholderText}>Video de técnica próximamente</Text>
          </View>
        )}

        {!isPlaying && (
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <View style={s.infoHeader}>
          <View style={s.musculoBadge}>
            <Text style={s.musculoText}>{MUSCULOS[ejercicio.musculo_id] || 'General'}</Text>
          </View>
          {ejercicio.es_premium && (
            <View style={s.premiumBadge}>
              <Ionicons name="star" size={12} color="#000" style={{marginRight: 4}} />
              <Text style={s.premiumText}>PRO</Text>
            </View>
          )}
        </View>

        <Text style={s.nombre}>{ejercicio.nombre}</Text>

        {/* 🚀 BOTÓN DE REGRESIÓN (Si existe versión fácil) */}
        {ejercicio.regresion_de && (
          <TouchableOpacity style={s.regresionBtn} onPress={handleRegresion} activeOpacity={0.8}>
            <Ionicons name="arrow-down-circle" size={20} color={colors.primary} />
            <Text style={s.regresionText}>¿Muy difícil? Cambiar a versión fácil</Text>
          </TouchableOpacity>
        )}

        {/* Historial */}
        <View style={s.historyPanel}>
          <Text style={s.historyTitle}>TU HISTORIAL</Text>
          <View style={s.historyMetrics}>
            <View style={s.historyMetricBox}>
              <Ionicons name="trophy-outline" size={20} color={colors.primary} />
              <View>
                <Text style={s.historyMetricValue}>{historial.max_peso > 0 ? `${historial.max_peso} kg` : '--'}</Text>
                <Text style={s.historyMetricLabel}>Récord (1RM)</Text>
              </View>
            </View>
            <View style={s.historyDivider} />
            <View style={s.historyMetricBox}>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <View>
                <Text style={s.historyMetricValue}>
                  {historial.ultima_vez ? getRelativeTime(historial.ultima_vez) : 'Nunca'}
                </Text>
                <Text style={s.historyMetricLabel}>Última vez entrenado</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Instrucciones */}
        {ejercicio.descripcion && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Técnica correcta</Text>
            <Text style={s.descripcion}>{ejercicio.descripcion}</Text>
          </View>
        )}

        {/* Práctica */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Práctica rápida</Text>
          <View style={s.seriesRow}>
            {Array.from({ length: TOTAL_SERIES }).map((_, i) => (
              <TouchableOpacity key={i} style={[s.serieBtn, i < series && s.serieBtnDone]} onPress={() => marcarSerie(i)} activeOpacity={0.7}>
                <Text style={[s.serieBtnText, i < series && s.serieBtnTextDone]}>{i < series ? '✓' : i + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Footer Fijo */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.completarBtn, series < TOTAL_SERIES && s.completarBtnDisabled]}
          disabled={series < TOTAL_SERIES}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          }}
          activeOpacity={0.85}
        >
          <Text style={[s.completarText, series < TOTAL_SERIES && s.completarTextDisabled]}>
            {series < TOTAL_SERIES ? `Completa ${TOTAL_SERIES} series para finalizar` : '✓ Listo para la rutina'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Video
  videoContainer: { width: '100%', height: 320, backgroundColor: '#000', position: 'relative', borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  videoPlaceholderText: { color: colors.textSecondary, fontSize: 14, marginTop: 12 },
  backBtn: { position: 'absolute', top: 50, right: spacing.lg, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  // Content
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  infoHeader: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm, alignItems: 'center' },
  musculoBadge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  musculoText: { color: colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  premiumText: { fontSize: 11, fontWeight: '900', color: '#000' },
  nombre: { ...typography.h1, fontSize: 32, marginBottom: spacing.md, lineHeight: 36 },

  // 🚀 Botón Regresión
  regresionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 77, 0, 0.1)', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: 'rgba(255, 77, 0, 0.3)' },
  regresionText: { color: colors.primary, fontWeight: '700', fontSize: 14, marginLeft: 8 },

  // Historial Panel
  historyPanel: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  historyTitle: { fontSize: 10, fontWeight: '900', color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 12 },
  historyMetrics: { flexDirection: 'row', alignItems: 'center' },
  historyMetricBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyMetricValue: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
  historyMetricLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  historyDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: spacing.md },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h3, fontSize: 18, marginBottom: 8 },
  descripcion: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },

  // Series
  seriesRow: { flexDirection: 'row', gap: spacing.md },
  serieBtn: { width: 48, height: 48, borderRadius: radius.full, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  serieBtnDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  serieBtnText: { fontSize: 18, fontWeight: '900', color: colors.textSecondary },
  serieBtnTextDone: { color: '#000' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  completarBtn: { backgroundColor: colors.primary, borderRadius: radius.full, height: 56, justifyContent: 'center', alignItems: 'center' },
  completarBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  completarText: { color: '#000', fontWeight: '900', fontSize: 16 },
  completarTextDisabled: { color: colors.textSecondary },
});