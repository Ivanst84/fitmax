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
import { colors, spacing, radius, typography, buttons } from '../../constants/theme';
import { getRelativeTime } from '../../lib/dateUtils';
import ExerciseGuideCard from '../../components/ui/ExerciseGuideCard';
import PressableCard from '../../components/ui/PressableCard';

// 🚀 LA CONSTANTE MAESTRA DE TU STORAGE
const STORAGE_BASE_URL = "https://xvkmfnkzbllpqbwvkudi.supabase.co/storage/v1/object/public/video-ejercicios/";

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [ejercicio, setEjercicio] = useState<any | null>(null);
  const [historial, setHistorial] = useState({ max_peso: 0, ultima_vez: null, total_sesiones: 0 });
  const [cargando, setCargando] = useState(true);
  const [series, setSeries] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 🚀 ESTADO: Para guardar la URL final construida
  const [videoUri, setVideoUri] = useState<string | null>(null);

  useEffect(() => { 
    cargarDatosCompletos(); 
  }, [id]);

  const cargarDatosCompletos = async () => {
    try {
      setCargando(true);
      
      // 1. Obtener la sesión actual
      const { data: { user } } = await supabase.auth.getUser();
      let carpetaGenero = "hombres"; // Default / Fallback

      // 2. Si hay usuario, preguntar su género
      if (user) {
        const { data: userData } = await supabase
          .from('USUARIOS')
          .select('genero_id')
          .eq('id', user.id)
          .single();

        if (userData && userData.genero_id === 2) {
          carpetaGenero = "mujeres";
        }
      }

      // 3. Obtener los datos del ejercicio
      const { data: ejData } = await supabase.from('EJERCICIOS').select('*').eq('id', id).single();
      setEjercicio(ejData);

      // 4. CONSTRUIR LA URL DEL VIDEO
      if (ejData && ejData.video_url) {
        const fullUrl = `${STORAGE_BASE_URL}${carpetaGenero}/${ejData.video_url}`;
        setVideoUri(fullUrl);
      }

      // 5. Cargar historial
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

  // 🚀 FIX: Inicialización limpia del player sin listeners infinitos
  const player = useVideoPlayer(videoUri, (p) => { 
    p.loop = true; 
  });

  // 🚀 FIX: Ciclo de vida estricto para evitar Memory Leaks
// 🚀 FIX: Ciclo de vida estricto para evitar Memory Leaks
  useEffect(() => {
    if (!player) return;

    // Agregamos el listener
    const subscription = player.addListener('playingChange', (payload) => {
      setIsPlaying(payload.isPlaying);
    });

    // Cleanup function: Se ejecuta al desmontar el componente
    return () => {
      subscription.remove(); // Matamos el listener
      // ❌ AQUÍ YA NO HAY NADA MÁS. NADA DE PLAYER.PAUSE()
    };
  }, [player]);

  if (cargando) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!ejercicio) return <View style={s.center}><Text style={{color: '#fff'}}>No encontrado</Text></View>;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={s.videoWrapper}>
          {videoUri ? (
            <View style={s.video}>
              <VideoView style={s.video} player={player} allowsFullscreen={false} contentFit="cover" nativeControls={false} />
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => isPlaying ? player.pause() : player.play()}>
                {!isPlaying && <View style={s.playOverlay}><Ionicons name="play" size={50} color={colors.primary} /></View>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.videoPlaceholder}><Ionicons name="barbell-outline" size={60} color={colors.border} /></View>
          )}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Ionicons name="chevron-down" size={28} color="#fff" /></TouchableOpacity>
        </View>

        <View style={s.mainContent}>
          <View style={s.titleRow}>
            <View style={{flex: 1}}>
              <Text style={s.nombre}>{ejercicio.nombre}</Text>
              <Text style={s.subtitle}>Enfoque: {ejercicio.musculo_id === 15 ? 'Cardio' : 'Fuerza'}</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={s.statBox}><Text style={s.statLabel}>RÉCORD</Text><Text style={s.statValue}>{historial.max_peso} kg</Text></View>
            <View style={s.statDivider} />
            <View style={s.statBox}><Text style={s.statLabel}>SESIONES</Text><Text style={s.statValue}>{historial.total_sesiones}</Text></View>
            <View style={s.statDivider} />
            <View style={s.statBox}><Text style={s.statLabel}>ÚLTIMO</Text><Text style={s.statValue}>{historial.ultima_vez ? getRelativeTime(historial.ultima_vez) : '---'}</Text></View>
          </View>

          <ExerciseGuideCard ejercicio={ejercicio} compact={false} />

          <View style={s.practiceCard}>
            <Text style={s.practiceTitle}>PRÁCTICA DE TÉCNICA</Text>
            <Text style={s.practiceDesc}>Marca las series para validar tu forma</Text>
            <View style={s.seriesRow}>
              {[1, 2, 3].map((num) => (
                <PressableCard 
                  key={num} 
                  style={[s.serieCircle, series >= num && s.serieCircleActive]} 
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSeries(num); }}
                >
                  <Text style={[s.serieNum, series >= num && s.serieNumActive]}>{series >= num ? '✓' : num}</Text>
                </PressableCard>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <PressableCard style={buttons.primary} onPress={() => router.back()}>
          <Text style={buttons.primaryText}>ENTENDIDO</Text>
        </PressableCard>
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
  nombre: { ...typography.h1, textTransform: 'uppercase' },
  subtitle: { ...typography.small, marginTop: 4 },
  statsRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: colors.border },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { ...typography.caption, marginBottom: 4 },
  statValue: { ...typography.label },
  statDivider: { width: 1, height: '100%', backgroundColor: colors.border },
  practiceCard: { padding: 20, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryFaded, marginTop: 10 },
  practiceTitle: { ...typography.caption, color: colors.primary },
  practiceDesc: { ...typography.small, marginVertical: 8 },
  seriesRow: { flexDirection: 'row', gap: 15, marginTop: 10 },
  serieCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  serieCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  serieNum: { ...typography.h2, color: colors.textMuted },
  serieNumActive: { color: '#000' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.85)' },
});