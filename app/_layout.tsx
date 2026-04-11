import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Congelamos la pantalla de carga nativa
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  
  // 🚀 FIX: Cambiado de useRef a useState para que React gestione el estado en reinicios y modo estricto
  const [hasNavigated, setHasNavigated] = useState(false);

  // Reset cuando cambia la sesión
  useEffect(() => {
    if (loading) return;
    setHasNavigated(false);
  }, [session, loading]);

  useEffect(() => {
    // Si está cargando o ya navegamos en esta sesión, no hacemos nada
    if (loading || hasNavigated) return;

    const checkAuthAndOnboarding = async () => {
      setHasNavigated(true); // Bloqueamos re-ejecuciones
      try {
        const inAuthGroup = segments[0] === '(auth)';
        const inOnboardingGroup = segments[0] === '(onboarding)';

        if (!session) {
          // 1. SI NO HAY SESIÓN: Mandar al Login
          if (!inAuthGroup) {
            router.replace('/(auth)/login');
          }
        } else {
          // A. Primero revisamos el celular (rápido)
          let hasProfile = await AsyncStorage.getItem(`onboarding_${session.user.id}`);

          // B. Si el celular es nuevo, le preguntamos a la NUBE
          if (!hasProfile) {
            const { data: rutinas } = await supabase
              .from('RUTINAS')
              .select('id')
              .eq('user_id', session.user.id)
              .limit(1);

            if (rutinas && rutinas.length > 0) {
              await AsyncStorage.setItem(`onboarding_${session.user.id}`, 'true');
              hasProfile = 'true';
            }
          }

          // C. Decisión de enrutamiento
          if (!hasProfile) {
            // Usuario realmente nuevo: Al Onboarding
            if (!inOnboardingGroup) {
              router.replace('/(onboarding)');
            }
          } else {
            // Usuario con historial: Directo al HOME
            if (inAuthGroup || inOnboardingGroup || !segments[0]) {
              router.replace('/(tabs)/home');
            }
          }
        }
      } catch (error) {
        console.error('❌ Error crítico en enrutamiento:', error);
        setHasNavigated(false); // Liberamos si hubo error
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    checkAuthAndOnboarding();
  }, [session, loading, hasNavigated, router]); // 👈 FIX: Agregamos hasNavigated y router a las dependencias

  // Pantalla de seguridad mientras decide
  if (!isReady || loading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          {/* Grupos principales */}
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          
          {/* Pantallas Modales y Detalle */}
          <Stack.Screen 
            name="exercise/[id]" 
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
          />
          <Stack.Screen 
            name="rutina/[id]" 
            options={{ animation: 'slide_from_right' }} 
          />
          
          {/* 🛠️ FIX: Nombre de ruta corregido para evitar Warnings */}
          <Stack.Screen 
            name="workout/index" 
            options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} 
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}