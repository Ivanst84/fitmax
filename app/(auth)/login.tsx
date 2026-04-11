// Ruta: app/login.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar, 
  ActivityIndicator,
  Alert
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const extractParamsFromUrl = (url: string) => {
    // Sacamos todo lo que esté después de un '?' o un '#'
    const query = url.split('?')[1] || '';
    const hash = url.split('#')[1] || '';
    
    const params = new URLSearchParams(`${query}&${hash}`);
    
    return {
      accessToken: params.get('access_token'),
      refreshToken: params.get('refresh_token'),
      code: params.get('code')
    };
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const redirectUrl = makeRedirectUri({ scheme: 'fitmax' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success' && result.url) {
          
          const { accessToken, refreshToken, code } = extractParamsFromUrl(result.url);

          // 2. Escenario A: Supabase nos mandó los tokens directos (Implicit Flow)
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            
            router.replace('/(tabs)/home'); // ¡Victoria!
          } 
          else if (code) {
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (sessionError) throw sessionError;
            
            router.replace('/(tabs)/home'); // ¡Victoria!
          } 
          else {
            Alert.alert("Error", "La autorización fue exitosa, pero no se encontraron credenciales en el enlace.");
          }
        }
      }
    } catch (e: any) {
      console.error('Error login:', e.message);
      Alert.alert("Error de Acceso", "No pudimos iniciar sesión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Logo */}
      <View style={s.logoArea}>
        <View style={s.logoCircle}>
          <Text style={s.logoText}>F</Text>
        </View>
        <Text style={s.appName}>FitMax</Text>
        <Text style={s.tagline}>Tu entrenamiento. Tu ritmo.</Text>
      </View>

      <View style={s.features}>
        {[
          { icon: 'barbell', text: 'Rutinas personalizadas para tu nivel' },
          { icon: 'trophy', text: 'Seguimiento de progreso y logros' },
          { icon: 'people', text: 'Comunidad de entrenamiento' },
        ].map((f, i) => (
          <View key={i} style={s.featureRow}>
            <View style={s.featureIcon}>
              <Ionicons name={f.icon as any} size={18} color={colors.primary} />
            </View>
            <Text style={s.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Botones */}
      <View style={s.buttons}>
        <TouchableOpacity
          style={s.googleBtn}
          onPress={signInWithGoogle}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Text style={s.googleIcon}>G</Text>
              <Text style={s.googleBtnText}>Continuar con Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.terms}>
          Al continuar aceptas nuestros{' '}
          <Text style={s.termsLink}>Términos de uso</Text>
          {' '}y{' '}
          <Text style={s.termsLink}>Política de privacidad</Text>
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    paddingHorizontal: spacing.lg, justifyContent: 'space-between',
    paddingTop: 80, paddingBottom: 48,
  },
  logoArea: { alignItems: 'center' },
  logoCircle: {
    width: 80, height: 80, borderRadius: radius.full,
    backgroundColor: colors.primary, justifyContent: 'center',
    alignItems: 'center', marginBottom: spacing.md,
  },
  logoText: { fontSize: 40, fontWeight: '900', color: '#fff' },
  appName: { fontSize: 40, fontWeight: '900', color: colors.textPrimary, marginBottom: 8 },
  tagline: { fontSize: 16, color: colors.textSecondary },
  features: { gap: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  featureText: { fontSize: 15, color: colors.textPrimary, flex: 1 },
  buttons: { gap: spacing.md },
  googleBtn: {
    backgroundColor: '#fff', borderRadius: radius.full,
    height: 56, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  googleIcon: { fontSize: 20, fontWeight: '900', color: '#EA4335' },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  terms: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: colors.primary },
});