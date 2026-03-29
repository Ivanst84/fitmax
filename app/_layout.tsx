// Ruta: app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../hooks/useAuth';
import { colors } from '../constants/theme';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const checkAuthAndOnboarding = async () => {
      // 1. Identificamos en qué grupo de rutas estamos (OJO a los paréntesis)
      const inAuthGroup = segments[0] === '(auth)';
      const inOnboardingGroup = segments[0] === '(onboarding)';

      // 2. Si NO hay sesión, forzamos a ir al Login (y evitamos un loop si ya está ahí)
      if (!session) {
        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
        return; // Detenemos la ejecución
      }

      // 3. Si SÍ hay sesión, verificamos el Onboarding
      if (session) {
        const onboardingDone = await AsyncStorage.getItem(`onboarding_${session.user.id}`);

        if (!onboardingDone) {
          // Si no lo ha hecho y no está en la pantalla, lo mandamos para allá
          if (!inOnboardingGroup) {
            router.replace('/(onboarding)');
          }
        } else {
          // Si ya hizo el onboarding y está perdido en login o onboarding, lo mandamos al Home
          if (inAuthGroup || inOnboardingGroup) {
            router.replace('/(tabs)/home');
          }
        }
      }
    };

    checkAuthAndOnboarding();
  }, [session, loading, segments]); // Es vital escuchar los 'segments' para que se re-evalúe al cambiar de pantalla

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        
        {/* Pantallas de Modal y Detalles */}
        <Stack.Screen 
          name="exercise/[id]" 
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
        />
        <Stack.Screen name="rutina/[id]" />
        <Stack.Screen 
          name="workout/session" 
          options={{ gestureEnabled: false }} // Previene que el usuario cierre el entrenamiento deslizando por accidente
        />
      </Stack>
    </SafeAreaProvider>
  );
}