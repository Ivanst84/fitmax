import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// 🚀 IMPORTAMOS TU LIBRERÍA DE VIDEO
import { VideoView, useVideoPlayer } from 'expo-video';

import { supabase } from '../lib/supabase'; 
import { colors, spacing, radius, typography } from '../constants/theme';
import PressableCard from '../components/ui/PressableCard';

// 🚀 TU CONSTANTE MAESTRA
const STORAGE_BASE_URL = "https://xvkmfnkzbllpqbwvkudi.supabase.co/storage/v1/object/public/video-ejercicios/";

export default function InauguracionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [cargando, setCargando] = useState(true);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [pasoActual, setPasoActual] = useState(0);
  const [terminado, setTerminado] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  
  // 🚀 ESTADO PARA SABER LA CARPETA DEL VIDEO (hombres/mujeres)
  const [carpetaGenero, setCarpetaGenero] = useState("hombres");

  useEffect(() => {
    cargarMiniRutina();
  }, []);

  const cargarMiniRutina = async () => {
    try {
      setErrorCarga(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Obtener género del usuario para construir la URL correcta luego
      const { data: userData } = await supabase
        .from('USUARIOS')
        .select('genero_id')
        .eq('id', user.id)
        .single();

      if (userData && userData.genero_id === 2) {
        setCarpetaGenero("mujeres");
      }

      // 2. Buscamos la primera rutina
      const { data: rutinas, error: errRutinas } = await supabase
        .from('RUTINAS')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (errRutinas || !rutinas || rutinas.length === 0) {
        setErrorCarga(true);
        return;
      }

      const rutinaId = rutinas[0].id;

      // 3. Cargamos los ejercicios
      const { data: ejs, error: errEjs } = await supabase
        .from('RUTINA_EJERCICIOS')
        .select(`
          id,
          orden,
          series,
          reps,
          descanso_seg,
          EJERCICIOS (
            nombre,
            descripcion,
            video_url
          )
        `)
        .eq('rutina_id', rutinaId)
        .order('orden', { ascending: true })
        .limit(3);

      if (errEjs || !ejs || ejs.length === 0) {
        setErrorCarga(true);
      } else {
        setEjercicios(ejs);
      }
    } catch (error) {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  };

  const avanzarEjercicio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (pasoActual < ejercicios.length - 1) {
      setPasoActual(prev => prev + 1);
    } else {
      setTerminado(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const salir = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/home');
  };

  // ─── LÓGICA DEL REPRODUCTOR (Se actualiza al cambiar de paso) ───
  const ejActual = ejercicios[pasoActual];
  const info = ejActual?.EJERCICIOS;
  
  // Construimos la URL igual que en tu ExerciseDetail
  const videoUri = info?.video_url ? `${STORAGE_BASE_URL}${carpetaGenero}/${info.video_url}` : null;

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true; // Sin sonido para actuar como GIF
    p.play(); // Auto-play
  });

  if (cargando) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Preparando tu protocolo...</Text>
      </View>
    );
  }

  if (errorCarga || ejercicios.length === 0) {
    return (
      <View style={[s.container, s.center, { paddingHorizontal: 40 }]}>
        <Ionicons name="alert-circle-outline" size={80} color={colors.textMuted} />
        <Text style={s.errorTitle}>Plan no detectado</Text>
        <Text style={s.errorSub}>No pudimos cargar la prueba inicial, pero puedes ver tu plan completo en la pestaña de Semana.</Text>
        <PressableCard style={s.btnVictoria} onPress={salir}>
          <Text style={s.btnVictoriaText}>Ir a mi Plan</Text>
        </PressableCard>
      </View>
    );
  }

  if (terminado) {
    return (
      <View style={[s.container, s.center, { paddingHorizontal: 40 }]}>
        <View style={s.iconGlow}>
          <Ionicons name="trophy" size={80} color={colors.primary} />
        </View>
        <Text style={s.victoriaTitle}>¡Protocolo Iniciado!</Text>
        <Text style={s.victoriaSub}>Has probado el motor de entrenamiento. Tu plan de 7 días te espera en el inicio.</Text>
        <PressableCard style={s.btnVictoria} onPress={salir}>
          <Text style={s.btnVictoriaText}>Comenzar mi Plan</Text>
        </PressableCard>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={s.header}>
        <TouchableOpacity onPress={salir} style={s.closeBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.progressContainer}>
          {ejercicios.map((_, i) => (
            <View key={i} style={[s.progressPill, i <= pasoActual && s.progressPillActive]} />
          ))}
        </View>
      </View>

      <View style={s.content}>
        <View style={s.imageContainer}>
          {/* 🚀 EL REPRODUCTOR NATIVO CON TU LOGICA */}
          {videoUri ? (
            <VideoView 
              style={s.image} 
              player={player} 
              allowsFullscreen={false} 
              contentFit="cover" 
              nativeControls={false} 
            />
          ) : (
            <View style={s.imagePlaceholder}>
              <Ionicons name="barbell-outline" size={60} color={colors.textMuted} />
            </View>
          )}
        </View>

        <Text style={s.tag}>ENTRENAMIENTO DE PRUEBA</Text>
        <Text style={s.ejNombre}>{info?.nombre || 'Ejercicio'}</Text>
        
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{ejActual.series} x {ejActual.reps}</Text>
            <Text style={s.statLabel}>Series x Reps</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{ejActual.descanso_seg}s</Text>
            <Text style={s.statLabel}>Descanso</Text>
          </View>
        </View>
      </View>

      <View style={[s.footer, { marginBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={s.btnPrincipal} onPress={avanzarEjercicio}>
          <Text style={s.btnPrincipalText}>
            {pasoActual === ejercicios.length - 1 ? 'FINALIZAR' : 'SIGUIENTE EJERCICIO'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.body, color: colors.textSecondary, marginTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  progressContainer: { flex: 1, flexDirection: 'row', gap: 6 },
  progressPill: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#222' },
  progressPillActive: { backgroundColor: colors.primary },
  content: { flex: 1, paddingHorizontal: 20 },
  imageContainer: { width: '100%', height: '40%', backgroundColor: '#0C0C0C', borderRadius: 20, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#1A1A1A' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tag: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  ejNombre: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 30 },
  statsRow: { flexDirection: 'row', gap: 15 },
  statCard: { flex: 1, backgroundColor: '#0C0C0C', padding: 20, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#1A1A1A' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  footer: { paddingHorizontal: 20 },
  btnPrincipal: { backgroundColor: colors.primary, height: 60, borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnPrincipalText: { fontSize: 16, fontWeight: '900', color: '#000' },
  
  // Victoria / Error
  iconGlow: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255, 77, 0, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  victoriaTitle: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  victoriaSub: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  errorTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginTop: 20, marginBottom: 10 },
  errorSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  btnVictoria: { backgroundColor: colors.primary, paddingHorizontal: 40, height: 55, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  btnVictoriaText: { fontSize: 16, fontWeight: '900', color: '#000' }
});