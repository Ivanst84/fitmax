import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, radius, typography } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useStreak } from '../../hooks/useStreak'; // 👈 Nuestro nuevo cerebro de racha
import { supabase } from '../../lib/supabase';
import PressableCard from '../../components/ui/PressableCard';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  
  const { rachaActual, mejorRacha, loading: loadingStreak } = useStreak(); 
  
  const [isSyncing, setIsSyncing] = useState(false);
  
  const fullName = session?.user?.user_metadata?.full_name || 'Atleta FitMax';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = async () => { 
    await supabase.auth.signOut();
    router.replace('/(auth)/login'); 
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ ¿Borrar cuenta?",
      "Esto borrará todo tu perfil, rutinas y datos de la base de datos para siempre.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, Borrar Todo", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_user_account');
              if (error) throw error;
              await supabase.auth.signOut();
              router.replace('/'); 
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          }
        }
      ]
    );
  };



  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: 100 }}>
        
        {/* HEADER PERFIL */}
        <View style={s.header}>
          <View style={s.avatarContainer}><Text style={s.avatarText}>{initials}</Text></View>
          <Text style={s.userName}>{fullName}</Text>
          <Text style={s.userEmail}>{session?.user?.email}</Text>
          
          <PressableCard style={s.editBtn} onPress={() => router.push('/edit-profile')}>
            <Text style={s.editBtnText}>Editar Perfil</Text>
          </PressableCard>

        </View>

        {/* RENDIMIENTO */}
        <View style={s.logrosContainer}>
          <Text style={s.menuTitle}>MI RENDIMIENTO</Text>
          <View style={s.logrosGrid}>
            <PressableCard
              style={s.logroCard}
              onPress={() => router.push('/(tabs)/stats')}
            >
              <View style={[s.iconBox, { backgroundColor: 'rgba(255, 77, 0, 0.15)' }]}>
                <Ionicons name="bar-chart" size={28} color={colors.primary} />
              </View>
              <Text style={s.logroTitle}>Estadísticas</Text>
              <Text style={s.logroSub}>Volumen y Análisis</Text>
            </PressableCard>

            <PressableCard 
              style={s.logroCard} 
              onPress={() => router.push('/(tabs)/history')}
            >
              <View style={[s.iconBox, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                <Ionicons name="trophy" size={28} color="#FFD700" />
              </View>
              <Text style={s.logroTitle}>Historial</Text>
              <Text style={s.logroSub}>Sesiones pasadas</Text>
            </PressableCard>
          </View>
        </View>

        {/* STATS ROW ACTUALIZADO CON RACHA REAL */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Ionicons name="flame" size={24} color={rachaActual > 0 ? colors.primary : colors.textMuted} />
            <Text style={[s.statValue, rachaActual > 0 && { color: colors.primary }]}>
              {loadingStreak ? '...' : rachaActual}
            </Text>
            <Text style={s.statLabel}>DÍAS SEGUIDOS</Text>
          </View>
          
          <View style={s.statCard}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <Text style={s.statValue}>
              {loadingStreak ? '...' : mejorRacha}
            </Text>
            <Text style={s.statLabel}>MEJOR RACHA</Text>
          </View>
        </View>

        {/* MENÚ DE OPCIONES */}
        <View style={s.menuSection}>
          <Text style={s.menuTitle}>CONFIGURACIÓN</Text>
          
          <MenuOption icon="notifications-outline" label="Recordatorios de entreno" onPress={() => {}} />
          
          <MenuOption 
            icon="shield-checkmark-outline" 
            label="Suscripción Premium" 
            disabled={true} 
            rightElement={<Text style={s.comingSoonText}>Próximamente</Text>}
          />
          <MenuOption 
            icon="headset-outline" 
            label="Soporte técnico" 
            disabled={true} 
            rightElement={<Text style={s.comingSoonText}>Próximamente</Text>}
          />
          
          <View style={s.dangerZone}>
            <Text style={s.dangerTitle}>ZONA DE PELIGRO</Text>
            <MenuOption icon="log-out-outline" label="Cerrar Sesión" onPress={handleLogout} danger />
            <MenuOption icon="trash-outline" label="Borrar Cuenta (Prueba)" onPress={handleDeleteAccount} danger />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

function MenuOption({ icon, label, onPress, danger, rightElement, disabled }: any) {
  return (
    <PressableCard 
      style={s.option} 
      onPress={onPress}
      disabled={disabled}
    >
      <View style={s.optionLeft}>
        <Ionicons name={icon} size={22} color={danger ? colors.error : colors.textPrimary} />
        <Text style={[s.optionLabel, danger && { color: colors.error }]}>{label}</Text>
      </View>
      {rightElement || (!disabled && <Ionicons name="chevron-forward" size={20} color={colors.border} />)}
    </PressableCard>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', marginBottom: spacing.md },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primary, marginBottom: spacing.md },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  userName: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
  userEmail: { ...typography.body, color: colors.textMuted },
  editBtn: { marginTop: spacing.md, paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  editBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  adminBtn: { backgroundColor: '#FF4D00', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  adminBtnText: { color: '#000', fontWeight: 'bold' },
  logrosContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  logrosGrid: { flexDirection: 'row', gap: spacing.md },
  logroCard: { flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  logroTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  logroSub: { fontSize: 11, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, marginVertical: 4 },
  statLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1 },
  menuSection: { paddingHorizontal: spacing.lg },
  menuTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5, marginBottom: spacing.sm },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionLabel: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  comingSoonText: { fontSize: 10, color: colors.textSecondary, fontStyle: 'italic', backgroundColor: colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  dangerZone: { marginTop: 30, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 },
  dangerTitle: { fontSize: 11, fontWeight: '900', color: colors.error, letterSpacing: 1.5, marginBottom: spacing.sm },
});