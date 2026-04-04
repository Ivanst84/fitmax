import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  // 🔥 CÁLCULO PREMIUM: Calculamos cuánto mide el obstáculo de abajo
  const paddingBottom = Platform.OS === 'android' ? insets.bottom + 10 : insets.bottom;
  const height = Platform.OS === 'android' ? 65 + insets.bottom : 85;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          styles.tabBar,
          {
            height: height,
            paddingBottom: paddingBottom,
          }
        ],
        tabBarLabelStyle: styles.label,
      }}
    >
      {/* 🟢 TABS VISIBLES (LOS 4 FANTÁSTICOS) */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Ejercicios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* 🔴 TABS OCULTOS (Existen, puedes navegar a ellos, pero no tienen botón abajo) */}
      <Tabs.Screen 
        name="community" 
        options={{ href: null }} 
      />
      <Tabs.Screen 
        name="stats" 
        options={{ href: null }} 
      />
      <Tabs.Screen 
        name="history" 
        options={{ href: null }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    elevation: 0, // Quitamos sombra rara en Android
    shadowOpacity: 0, // Quitamos sombra rara en iOS
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  }
});