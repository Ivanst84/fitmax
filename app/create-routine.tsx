import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  StatusBar, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// 🚀 Importamos buttons
import { colors, spacing, radius, typography, buttons } from '../constants/theme';

const DIAS_PLAN = [
  { id: 1, label: 'Día 1' }, { id: 2, label: 'Día 2' }, { id: 3, label: 'Día 3' },
  { id: 4, label: 'Día 4' }, { id: 5, label: 'Día 5' }, { id: 6, label: 'Día 6' }, { id: 7, label: 'Día 7' },
];

export default function CreateRoutineScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [diaSeleccionado, setDiaSeleccionado] = useState<number>(1);

  const handleSiguiente = () => {
    if (nombre.trim() === '') return alert('Ponle un nombre épico a tu rutina');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/select-exercises', params: { nombreRutina: nombre, diaPlan: diaSeleccionado } });
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nueva Rutina</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>NOMBRE DE LA RUTINA</Text>
          <TextInput style={s.input} placeholder="Ej: Destrucción de Piernas" placeholderTextColor={colors.textMuted} value={nombre} onChangeText={setNombre} autoFocus maxLength={30} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>¿QUÉ DÍA DEL PLAN?</Text>
          <Text style={s.sectionDesc}>Asigna esta rutina a uno de tus días de entrenamiento.</Text>
          <View style={s.diasGrid}>
            {DIAS_PLAN.map(dia => {
              const activo = diaSeleccionado === dia.id;
              return (
                <TouchableOpacity key={dia.id} style={[s.diaCard, activo && s.diaCardActive]} onPress={() => { Haptics.selectionAsync(); setDiaSeleccionado(dia.id); }} activeOpacity={0.7}>
                  <Text style={[s.diaText, activo && s.diaTextActive]}>{dia.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        {/* 🚀 BOTÓN GLOBAL */}
        <TouchableOpacity style={[buttons.primary, nombre.trim() === '' && { opacity: 0.5 }]} onPress={handleSiguiente} disabled={nombre.trim() === ''} activeOpacity={0.85}>
          <Text style={buttons.primaryText}>Elegir Ejercicios</Text>
          <Ionicons name="arrow-forward" size={20} color="#000" style={{ marginLeft: 8 }}/>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { ...typography.label },
  content: { padding: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.caption, marginBottom: spacing.sm },
  sectionDesc: { ...typography.body, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 16, color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  diasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  diaCard: { width: '31%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  diaCardActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  diaText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  diaTextActive: { color: '#000', fontWeight: '900' },
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});