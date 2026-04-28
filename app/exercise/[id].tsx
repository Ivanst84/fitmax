import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, StatusBar, ActivityIndicator, Image, Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
// 🚀 IMPORTAMOS EL NUEVO ZOOM
import ImageZoom from 'react-native-image-pan-zoom'; 

import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography, buttons } from '../../constants/theme';
import { getRelativeTime } from '../../lib/dateUtils';
import ExerciseGuideCard from '../../components/ui/ExerciseGuideCard';
import PressableCard from '../../components/ui/PressableCard';

const STORAGE_BASE_URL = "https://xvkmfnkzbllpqbwvkudi.supabase.co/storage/v1/object/public/video-ejercicios/";
const STORAGE_BASE_IMAGEN_URL = "https://xvkmfnkzbllpqbwvkudi.supabase.co/storage/v1/object/public/guias-tecnicas/";

// Calculamos el ancho de la pantalla para el Zoom
const screenWidth = Dimensions.get('window').width;

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [ejercicio, setEjercicio] = useState<any | null>(null);
  const [historial, setHistorial] = useState({ max_peso: 0, ultima_vez: null, total_sesiones: 0 });
  const [cargando, setCargando] = useState(true);
  const [series, setSeries] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [modoVisual, setModoVisual] = useState<'video' | 'foto'>('video');

  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => { 
    cargarDatosCompletos(); 
  }, [id]);

  const cargarDatosCompletos = async () => {
    try {
      setCargando(true);
      
      const [authRes, ejRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('EJERCICIOS').select('*').eq('id', id).single()
      ]);

      const user = authRes.data.user;
      const ejData = ejRes.data;

      if (isMounted.current) setEjercicio(ejData);

      let carpetaGenero = "hombres";
      let histData = null;

      if (user && ejData) {
        const [userRes, histRes] = await Promise.all([
          supabase.from('USUARIOS').select('genero_id').eq('id', user.id).single(),
          supabase.from('HISTORIAL_EJERCICIOS')
            .select('series_json, HISTORIAL_SESIONES(fecha)')
            .eq('ejercicio_id', id)
            .order('created_at', { ascending: false })
        ]);

        if (userRes.data?.genero_id === 2) {
          carpetaGenero = "mujeres";
        }
        histData = histRes.data;
      }

      if (ejData && isMounted.current) {
        // 🛡️ VALIDACIÓN ESTRICTA: ¿De verdad hay datos en la BD?
        const tieneVideo = ejData.video_url && typeof ejData.video_url === 'string' && ejData.video_url.trim() !== '' && ejData.video_url !== 'null';
        const tieneFoto = ejData.foto_url && typeof ejData.foto_url === 'string' && ejData.foto_url.trim() !== '' && ejData.foto_url !== 'null';

        // LOS VIDEOS SÍ SON DINÁMICOS (Hombres o Mujeres)
        if (tieneVideo) {
          setVideoUri(`${STORAGE_BASE_URL}${carpetaGenero}/${ejData.video_url}`);
          setModoVisual('video');
        }
        
        // 🚀 CORRECCIÓN: LAS FOTOS SIEMPRE SALEN DE LA CARPETA 'mujeres' (Hardcodeado a propósito)
        if (tieneFoto) {
          setFotoUri(`${STORAGE_BASE_IMAGEN_URL}mujeres/${ejData.foto_url}`);
          if (!tieneVideo) {
            setModoVisual('foto'); // Si solo hay foto, obligamos la vista a foto
          }
        }
      }

      if (histData && histData.length > 0 && isMounted.current) {
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

    } catch (e) { 
      console.error(e); 
    } finally { 
      if (isMounted.current) setCargando(false); 
    }
  };

  const player = useVideoPlayer(videoUri, (p) => { p.loop = true; });

  useEffect(() => {
    if (!player) return;
    const subscription = player.addListener('playingChange', (payload) => {
      if (isMounted.current) setIsPlaying(payload.isPlaying);
    });
    return () => { subscription.remove(); };
  }, [player]);

  const alternarVista = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (modoVisual === 'video') {
      if (player) player.pause();
      setModoVisual('foto');
    } else {
      if (player) player.play();
      setModoVisual('video');
    }
  };

  if (cargando) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!ejercicio) return <View style={s.center}><Text style={{color: '#fff'}}>No encontrado</Text></View>;

  // 🛡️ EL CANDADO DEL BOTÓN: Solo es TRUE si la BD nos dio AMBOS enlaces válidos.
  // Si no hay foto, esto es false y el botón no se dibuja.
  const tieneAmbosMedia = (videoUri !== null) && (fotoUri !== null);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={s.videoWrapper}>
          
          {/* CAPA DE VIDEO */}
          {videoUri && (
            <View 
              style={[s.mediaLayer, modoVisual !== 'video' && s.hiddenLayer]} 
              pointerEvents={modoVisual === 'video' ? 'auto' : 'none'}
            >
              <VideoView style={s.video} player={player} allowsFullscreen={false} contentFit="cover" nativeControls={false} />
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => isPlaying ? player.pause() : player.play()}>
                {!isPlaying && <View style={s.playOverlay}><Ionicons name="play" size={50} color={colors.primary} /></View>}
              </TouchableOpacity>
            </View>
          )}

          {/* CAPA DE FOTO CON ZOOM */}
          {fotoUri && (
            <View 
              style={[s.mediaLayer, modoVisual !== 'foto' && s.hiddenLayer]} 
              pointerEvents={modoVisual === 'foto' ? 'auto' : 'none'}
            >
              {/* @ts-ignore */}
              <ImageZoom 
                cropWidth={screenWidth}
                cropHeight={350}
                imageWidth={screenWidth}
                imageHeight={350}
                minScale={1}
                maxScale={3}
                enableCenterFocus={false}
              >
                <Image 
                  source={{ uri: fotoUri }} 
                  style={{ width: screenWidth, height: 350 }} 
                  resizeMode="contain" 
                />
              </ImageZoom>
            </View>
          )}

          {/* CAPA VACÍA (Fallback extremo) */}
          {!videoUri && !fotoUri && (
            <View style={s.videoPlaceholder}>
              <Ionicons name="barbell-outline" size={60} color={colors.border} />
              <Text style={s.placeholderText}>Visual no disponible</Text>
            </View>
          )}
          
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.mainContent}>
          <View style={s.titleRow}>
            <View style={{flex: 1, paddingRight: 10}}>
              <Text style={s.nombre}>{ejercicio.nombre}</Text>
              <Text style={s.subtitle}>Enfoque: {ejercicio.musculo_id === 15 ? 'Cardio' : 'Fuerza'}</Text>
            </View>

            {/* 🚀 EL BOTÓN INTELIGENTE: Solo aparece si hay video Y foto */}
            {tieneAmbosMedia && (
              <TouchableOpacity style={s.toggleBtnClean} onPress={alternarVista}>
                <Ionicons 
                  name={modoVisual === 'video' ? 'image-outline' : 'videocam-outline'} 
                  size={18} 
                  color={colors.primary} 
                />
                <Text style={s.toggleBtnCleanText}>
                  {modoVisual === 'video' ? 'Guía' : 'Video'}
                </Text>
              </TouchableOpacity>
            )}
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
  // ... (Tus mismos estilos, no moví nada aquí para no romper tu UI)
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoWrapper: { width: '100%', height: 350, backgroundColor: '#000', overflow: 'hidden' }, 
  mediaLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 1 },
  hiddenLayer: { opacity: 0, zIndex: -1 }, 
  video: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  placeholderText: { ...typography.small, color: colors.textMuted, marginTop: 10 },
  backBtn: { position: 'absolute', top: 50, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  mainContent: { paddingHorizontal: spacing.lg, marginTop: -30, backgroundColor: '#000', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  nombre: { ...typography.h1, textTransform: 'uppercase' },
  subtitle: { ...typography.small, marginTop: 4 },
  toggleBtnClean: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryFaded, 
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.primary
  },
  toggleBtnCleanText: { color: colors.primary, fontSize: 12, fontWeight: '800', marginLeft: 6, textTransform: 'uppercase' },
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