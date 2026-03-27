import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

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
}

const MUSCULOS: Record<number, string> = {
  1: 'Pecho', 2: 'Espalda alta', 3: 'Espalda baja', 4: 'Hombros',
  5: 'Bíceps', 6: 'Tríceps', 8: 'Abdomen', 11: 'Cuádriceps', 12: 'Isquiotibiales',
};

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [series, setSeries] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const TOTAL_SERIES = 3;

  useEffect(() => { cargarEjercicio(); }, [id]);

  const cargarEjercicio = async () => {
    const { data } = await supabase
      .from('EJERCICIOS')
      .select('*')
      .eq('id', id)
      .single();
    setEjercicio(data);
    setCargando(false);
  };

  const player = useVideoPlayer(
    ejercicio?.video_url ?? null,
    (p) => {
      p.loop = true;
      p.addListener('playingChange', (payload) => setIsPlaying(payload.isPlaying));
    }
  );

  if (cargando) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!ejercicio) return (
    <View style={s.center}>
      <Text style={{ color: colors.textSecondary }}>Ejercicio no encontrado</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

   {/* ==================== VIDEO PREMIUM ==================== */}
      <View style={s.videoContainer}>
        {ejercicio.video_url ? (
          <TouchableOpacity 
            activeOpacity={1} 
            style={s.video} 
            onPress={() => {
              if (isPlaying) {
                player.pause();
              } else {
                player.play();
              }
            }}
          >
            <VideoView
              style={s.video}
              player={player}
              allowsFullscreen
              allowsPictureInPicture
              contentFit="contain"
              nativeControls={false} // <-- Desactiva los controles nativos rebeldes
            />
            
            {/* Capa oscura con botón de play cuando está pausado */}
            {!isPlaying && (
              <View style={s.playOverlay}>
                <Ionicons name="play-circle" size={70} color="#ffffff99" />
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={s.videoPlaceholder}>
            <Text style={s.videoPlaceholderIcon}>▶</Text>
            <Text style={s.videoPlaceholderText}>Video próximamente</Text>
          </View>
        )}

        {/* Botón de regresar (se oculta al reproducir) */}
        {!isPlaying && (
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.infoHeader}>
          <View style={s.musculoBadge}>
            <Text style={s.musculoText}>{MUSCULOS[ejercicio.musculo_id] || 'General'}</Text>
          </View>
          {ejercicio.es_premium && (
            <View style={s.premiumBadge}>
              <Text style={s.premiumText}>PRO</Text>
            </View>
          )}
        </View>

        <Text style={s.nombre}>{ejercicio.nombre}</Text>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statValue}>{TOTAL_SERIES}</Text>
            <Text style={s.statLabel}>Series</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>12</Text>
            <Text style={s.statLabel}>Reps</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>60s</Text>
            <Text style={s.statLabel}>Descanso</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>{ejercicio.calorias_estimadas ?? '--'}</Text>
            <Text style={s.statLabel}>Cal</Text>
          </View>
        </View>

        {ejercicio.descripcion && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>¿Cómo hacerlo?</Text>
            <Text style={s.descripcion}>{ejercicio.descripcion}</Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Progreso de series</Text>
          <View style={s.seriesRow}>
            {Array.from({ length: TOTAL_SERIES }).map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[s.serieBtn, i < series && s.serieBtnDone]}
                onPress={() => setSeries(i < series ? i : i + 1)}
              >
                <Text style={[s.serieBtnText, i < series && s.serieBtnTextDone]}>
                  {i < series ? '✓' : i + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[s.completarBtn, series < TOTAL_SERIES && s.completarBtnDisabled]}
          disabled={series < TOTAL_SERIES}
          onPress={() => router.back()}
        >
          <Text style={s.completarText}>
            {series < TOTAL_SERIES ? `Completa las ${TOTAL_SERIES} series` : '✓ Marcar como completado'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  videoContainer: { 
    width: '100%', 
    height: 280, 
    backgroundColor: '#000', 
    position: 'relative',
    borderBottomLeftRadius: radius.lg,     // ← cambiado de xl a lg
    borderBottomRightRadius: radius.lg,    // ← cambiado de xl a lg
    overflow: 'hidden',
  },
  video: { width: '100%', height: '100%' },

  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  videoPlaceholderIcon: { fontSize: 48, color: colors.primary, marginBottom: 8 },
  videoPlaceholderText: { color: colors.textSecondary, fontSize: 14 },

  backBtn: { 
    position: 'absolute', 
    top: 50, 
    left: spacing.lg, 
    backgroundColor: '#00000088', 
    width: 38, 
    height: 38, 
    borderRadius: radius.full, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff22',
  },// Agrégalo debajo de tus estilos de video
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)', // Un ligero oscurecimiento para resaltar el botón
  },

  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  infoHeader: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  musculoBadge: { backgroundColor: colors.primaryFaded, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  musculoText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  premiumBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  premiumText: { fontSize: 11, fontWeight: 'bold', color: '#000' },
  nombre: { fontSize: 26, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.sm },
  descripcion: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  seriesRow: { flexDirection: 'row', gap: spacing.sm },
  serieBtn: { width: 52, height: 52, borderRadius: radius.full, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  serieBtnDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  serieBtnText: { fontSize: 16, fontWeight: 'bold', color: colors.textSecondary },
  serieBtnTextDone: { color: '#fff' },
  completadoBanner: { marginTop: spacing.md, backgroundColor: colors.primaryFaded, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  completadoText: { color: colors.primary, fontWeight: 'bold', fontSize: 15 },
  completarBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  completarBtnDisabled: { backgroundColor: colors.surface },
  completarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});