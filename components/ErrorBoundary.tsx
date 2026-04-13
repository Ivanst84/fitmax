import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, buttons } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router'; // 👈 1. IMPORTAMOS EL ROUTER DE EXPO

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('🚨 [CRASH ATRAPADO POR ERROR BOUNDARY]:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    
    return (
      <View style={s.container}>
        <Ionicons name="warning" size={60} color={colors.warning} style={{ marginBottom: 20 }} />
        <Text style={s.title}>¡Un pequeño tropiezo!</Text>
        <Text style={s.body}>Algo salió mal, pero ya lo estamos revisando.</Text>
        
        <TouchableOpacity 
          style={buttons.primary} 
          onPress={() => {
            this.setState({ hasError: false, error: undefined });
            
            router.replace('/(tabs)/home'); 
          }}
        >
          <Text style={buttons.primaryText}>Volver a empezar</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { ...typography.h1, marginBottom: 8, textAlign: 'center' },
  body: { ...typography.body, textAlign: 'center', marginBottom: 32, color: colors.textSecondary },
});