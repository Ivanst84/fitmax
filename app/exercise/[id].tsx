// Ruta: app/exercise/[id].tsx

import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, StatusBar, ActivityIndicator, Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { getRelativeTime } from '../../lib/dateUtils';
import ExerciseGuideCard from '../../components/ui/ExerciseGuideCard';

const { width } = Dimensions.get('window');

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [ejercicio, setEjercicio] = useState<any | null>(null);
  const [historial, setHistorial] = useState({ max_peso: 0, ultima_vez: null, total_sesiones: 0 });
  const [cargando, setCargando] = useState(true);
  const [series, setSeries] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const TOTAL_SERIES = 3;

  useEffect(() => { cargarDatosCompletos(); }, [id]);

  const cargarDatosCompletos = async () => {
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: ejData } = await supabase.from('EJERCICIOS').select('*').eq('id', id).single();
      setEjercicio(ejData);

      if (user && ejData) {
        const { data: histData } = await supabase
          .from('HISTORIAL_EJERCICIOS')
          .select('series_json, HISTORIAL_SESIONES(fecha)')
          .eq('ejercicio_id', id)
          .order('created_at', { ascending: false });

        if (histData && histData.length > 0) {
          let maxKg = 0;
          histData.forEach(sesion => {
            (sesion.series_json as any[])?.forEach(serie => {
              if (serie.completed && serie.kg > maxKg) maxKg = serie.kg;
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
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  const player = useVideoPlayer(ejercicio?.video_url ?? null, (p) => {
    p.loop = true;
    p.addListener('playingChange', (payload) => setIsPlaying(payload.isPlaying));
  });

  if (cargando) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!ejercicio) return <View style={s.center}><Text style={{color: '#fff'}}>No encontrado</Text></View>;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Video Header Premium */}
        <View style={s.videoWrapper}>
          {ejercicio.video_url ? (
            <View style={s.video}>
              {/* 1. EL VIDEO VA AL FONDO */}
              <VideoView 
                style={s.video} 
                player={player} 
                allowsFullscreen={false} 
                contentFit="cover" 
                nativeControls={false} 
              />
              
              {/* 2. EL BOTÓN VA ENCIMA (COMO UNA CAPA INVISIBLE) */}
              <TouchableOpacity 
                style={StyleSheet.absoluteFillObject} 
                activeOpacity={1} 
                onPress={() => isPlaying ? player.pause() : player.play()}
              >
                {!isPlaying && (
                  <View style={s.playOverlay}>
                    <Ionicons name="play" size={50} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.videoPlaceholder}>
              <Ionicons name="barbell-outline" size={60} color={colors.border} />
            </View>
          )}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.mainContent}>
          {/* Título y Badge */}
          <View style={s.titleRow}>
            <View style={{flex: 1}}>
              <Text style={s.nombre}>{ejercicio.nombre}</Text>
              <Text style={s.subtitle}>Enfoque principal: {ejercicio.musculo_id === 15 ? 'Cardiovascular' : 'Hipertrofia'}</Text>
            </View>
            {ejercicio.es_premium && (
              <LinearGradient colors={['#F59E0B', '#D97706']} style={s.proBadge}>
                <Text style={s.proText}>PRO</Text>
              </LinearGradient>
            )}
          </View>

          {/* Widgets de Stats Rápidas */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>RÉCORD</Text>
              <Text style={s.statValue}>{historial.max_peso} kg</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={s.statLabel}>SESIONES</Text>
              <Text style={s.statValue}>{historial.total_sesiones}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={s.statLabel}>ÚLTIMO</Text>
              <Text style={s.statValue}>{historial.ultima_vez ? getRelativeTime(historial.ultima_vez) : '---'}</Text>
            </View>
          </View>

          {/* 🚀 EL COMPONENTE ESTRELLA: GUÍA COMPLETA */}
          <ExerciseGuideCard ejercicio={ejercicio} compact={false} />

          {/* Práctica rápida (Mini Tracker) */}
          <View style={s.practiceCard}>
            <Text style={s.practiceTitle}>PRÁCTICA DE TÉCNICA</Text>
            <Text style={s.practiceDesc}>Marca las series para validar tu forma</Text>
            <View style={s.seriesRow}>
              {[1, 2, 3].map((num) => (
                <TouchableOpacity 
                  key={num} 
                  style={[s.serieCircle, series >= num && s.serieCircleActive]} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSeries(num);
                  }}
                >
                  <Text style={[s.serieNum, series >= num && s.serieNumActive]}>
                    {series >= num ? '✓' : num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer con Acción */}
      <View style={s.footer}>
        <TouchableOpacity style={s.mainAction} onPress={() => router.back()}>
          <Text style={s.mainActionText}>ENTENDIDO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoWrapper: { width: '100%', height: 350, backgroundColor: '#111' },
  video: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  
  mainContent: { paddingHorizontal: spacing.lg, marginTop: -30, backgroundColor: '#000', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  nombre: { fontSize: 28, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  proBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  proText: { fontSize: 12, fontWeight: '900', color: '#000' },

  statsRow: { flexDirection: 'row', backgroundColor: '#111', borderRadius: radius.lg, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: '#222' },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '900', color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '900', color: '#fff' },
  statDivider: { width: 1, height: '100%', backgroundColor: '#222' },

  practiceCard: { padding: 20, backgroundColor: '#0f0f0f', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryFaded, marginTop: 10 },
  practiceTitle: { fontSize: 12, fontWeight: '900', color: colors.primary, letterSpacing: 1 },
  practiceDesc: { color: colors.textMuted, fontSize: 13, marginVertical: 8 },
  seriesRow: { flexDirection: 'row', gap: 15, marginTop: 10 },
  serieCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  serieCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  serieNum: { fontSize: 18, fontWeight: '900', color: '#555' },
  serieNumActive: { color: '#000' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 25, backgroundColor: 'rgba(0,0,0,0.8)' },
  mainAction: { backgroundColor: colors.primary, height: 55, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' },
  mainActionText: { fontSize: 16, fontWeight: '900', color: '#000' }
});