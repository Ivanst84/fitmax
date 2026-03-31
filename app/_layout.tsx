import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

import { useAuth } from '../hooks/useAuth';
import { colors } from '../constants/theme';

// 1. Congelamos la pantalla de carga nativa al arrancar la app
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  // 2. Estado para saber si ya decidimos a qué pantalla ir
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (loading) return; // Esperamos a que Supabase responda

    const checkAuthAndOnboarding = async () => {
      try {
        const inAuthGroup = segments[0] === '(auth)';
        const inOnboardingGroup = segments[0] === '(onboarding)';

        if (!session) {
          if (!inAuthGroup) {
            router.replace('/(auth)/login');
          }
        } else {
          const onboardingDone = await AsyncStorage.getItem(`onboarding_${session.user.id}`);

          if (!onboardingDone) {
            if (!inOnboardingGroup) {
              router.replace('/(onboarding)');
            }
          } else {
            // Si el usuario está validado, forzamos que vaya a home si está perdido
            if (inAuthGroup || inOnboardingGroup || !segments[0]) {
              router.replace('/(tabs)/home');
            }
          }
        }
      } catch (error) {
        console.error('Error en enrutamiento:', error);
      } finally {
        // 3. Indicamos que la lógica terminó y ocultamos el splash suavemente
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    checkAuthAndOnboarding();
  }, [session, loading, segments]);

  // Mientras evalúa, mostramos un fondo oscuro limpio, no el activity indicator parpadeando
  if (!isReady || loading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      {/* 4. Usamos animation: 'fade' o 'none' para transiciones de stack ultra suaves */}
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        
        <Stack.Screen 
          name="exercise/[id]" 
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
        />
        <Stack.Screen 
          name="rutina/[id]" 
          options={{ animation: 'slide_from_right' }} // Transición nativa premium
        />
        <Stack.Screen 
          name="workout/session" 
          options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}