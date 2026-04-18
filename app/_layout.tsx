import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ☢️ 1. COMENTAMOS EL SPLASH SCREEN PARA QUE EXPO QUITE LA "A" AUTOMÁTICAMENTE
// import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { ErrorBoundary } from '../components/ErrorBoundary';

// ☢️ 2. DESACTIVAMOS EL BLOQUEO
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (loading) return;
    setHasNavigated(false);
  }, [session, loading]);

  useEffect(() => {
    if (loading || hasNavigated || !segments || segments.length === 0) return;

    const checkAuthAndOnboarding = async () => {
      setHasNavigated(true); 
      try {
        const currentSegment = segments[0] || '';
        const inAuthGroup = currentSegment === '(auth)';
        const inOnboardingGroup = currentSegment === '(onboarding)';

        if (!session) {
          if (!inAuthGroup) {
            setTimeout(() => router.replace('/(auth)/login'), 0);
          }
        } else {
          let hasProfile = await AsyncStorage.getItem(`onboarding_${session.user.id}`);

          if (!hasProfile) {
            const { data } = await supabase
              .from('RUTINAS')
              .select('id')
              .eq('user_id', session.user.id)
              .limit(1);

            if (data && data.length > 0) {
              await AsyncStorage.setItem(`onboarding_${session.user.id}`, 'true');
              hasProfile = 'true';
            }
          }

          if (!hasProfile) {
            if (!inOnboardingGroup) {
              setTimeout(() => router.replace('/(onboarding)'), 0);
            }
          } else {
            if (inAuthGroup || inOnboardingGroup || !currentSegment) {
              setTimeout(() => router.replace('/(tabs)/home'), 0);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error crítico en enrutamiento:', error);
        setHasNavigated(false); 
      }
      // ☢️ 3. YA NO HAY HIDE ASYNC AQUÍ PORQUE EXPO LO HARÁ SOLO
    };

    checkAuthAndOnboarding();
  }, [session, loading, hasNavigated, segments]);

  // Si loading se quedó pegado, mostramos una pantalla negra para darnos cuenta
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.primary }}>Cargando Auth...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="exercise/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="rutina/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="workout/index" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}