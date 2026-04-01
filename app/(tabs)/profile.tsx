import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator,Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { runExerciseSync } from '../../lib/syncExerciseDB';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useStreak } from '../../hooks/useStreak'; // 🚀 Nuevo Hook

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { streak, loading: loadingStreak } = useStreak(); // 🚀 Racha Real
const [isSyncing, setIsSyncing] = useState(false);
  const fullName = session?.user?.user_metadata?.full_name || 'Atleta FitMax';
  const firstName = fullName.split(' ')[0];
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    router.replace('/(auth)/login');
  };
  const handleSync = async () => {
  setIsSyncing(true);
  const success = await runExerciseSync();
  setIsSyncing(false);
  
  if (success) {
    Alert.alert("¡Éxito!", "10 Ejercicios nuevos añadidos a FitMax.");
  } else {
    Alert.alert("Error", "Revisa la consola para más detalles.");
  }
};

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: 100 }}
      >
        {/* HEADER PERFIL */}
        <View style={s.header}>
          <View style={s.avatarContainer}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.userName}>{fullName}</Text>
          <Text style={s.userEmail}>{session?.user?.email}</Text>
          
          <TouchableOpacity 
            style={s.editBtn} 
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={s.editBtnText}>Editar Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity 
  onPress={handleSync} 
  disabled={isSyncing}
  style={{ 
    backgroundColor: '#FF4D00', padding: 15, borderRadius: 10, 
    margin: 20, alignItems: 'center' 
  }}
>
  {isSyncing ? (
    <ActivityIndicator color="#000" />
  ) : (
    <Text style={{ color: '#000', fontWeight: 'bold' }}>
      ⚠️ ADMIN: Cargar Ejercicios
    </Text>
  )}
</TouchableOpacity>
        </View>

        {/* STATS ROW (Racha Real) */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Ionicons name="flame" size={24} color={streak > 0 ? colors.primary : colors.textMuted} />
            <Text style={[s.statValue, streak > 0 && { color: colors.primary }]}>
              {loadingStreak ? '...' : streak}
            </Text>
            <Text style={s.statLabel}>DÍAS SEGUIDOS</Text>
          </View>

          <View style={s.statCard}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <Text style={s.statValue}>Nvl 1</Text>
            <Text style={s.statLabel}>RANGO</Text>
          </View>
        </View>

        {/* MENÚ DE OPCIONES */}
        <View style={s.menuSection}>
          <Text style={s.menuTitle}>CONFIGURACIÓN</Text>
          
          <MenuOption 
            icon="notifications-outline" 
            label="Recordatorios de entreno" 
            onPress={() => {}} 
          />
          <MenuOption 
            icon="shield-checkmark-outline" 
            label="Suscripción Premium" 
            onPress={() => {}} 
            rightElement={<View style={s.proBadge}><Text style={s.proText}>PRO</Text></View>}
          />
          <MenuOption 
            icon="help-circle-outline" 
            label="Soporte técnico" 
            onPress={() => {}} 
          />
          <MenuOption 
            icon="log-out-outline" 
            label="Cerrar Sesión" 
            onPress={handleLogout}
            danger
          />
        </View>

      </ScrollView>
    </View>
  );
}

// Componente Interno para Opciones
function MenuOption({ icon, label, onPress, danger, rightElement }: any) {
  return (
    <TouchableOpacity style={s.option} onPress={onPress} activeOpacity={0.7}>
      <View style={s.optionLeft}>
        <Ionicons name={icon} size={22} color={danger ? colors.error : colors.textPrimary} />
        <Text style={[s.optionLabel, danger && { color: colors.error }]}>{label}</Text>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.border} />}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.md
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  userName: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
  userEmail: { ...typography.body, color: colors.textMuted },
  editBtn: { marginTop: spacing.md, paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  editBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, marginVertical: 4 },
  statLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1 },

  menuSection: { paddingHorizontal: spacing.lg },
  menuTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5, marginBottom: spacing.md },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionLabel: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  
  proBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  proText: { fontSize: 10, fontWeight: '900', color: '#000' }
});