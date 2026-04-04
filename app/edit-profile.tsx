import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, StatusBar, ActivityIndicator, TextInput, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { supabase } from '../lib/supabase';
// 🚀 Importamos "buttons" del nuevo theme
import { colors, spacing, radius, typography, buttons } from '../constants/theme';

const { width } = Dimensions.get('window');

// Catálogos
const OBJETIVOS = [
  { id: 1, label: 'Perder peso', icon: 'trending-down' },
  { id: 2, label: 'Ganar músculo', icon: 'barbell' },
  { id: 3, label: 'Tonificar', icon: 'body' },
];

const NIVELES = [
  { id: 1, label: 'Principiante', icon: 'star-outline' },
  { id: 2, label: 'Intermedio', icon: 'star-half' },
  { id: 3, label: 'Avanzado', icon: 'star' },
];

const DIAS_SEMANA = [
  { id: 1, label: 'Lunes', short: 'Lun' },
  { id: 2, label: 'Martes', short: 'Mar' },
  { id: 3, label: 'Miércoles', short: 'Mié' },
  { id: 4, label: 'Jueves', short: 'Jue' },
  { id: 5, label: 'Viernes', short: 'Vie' },
  { id: 6, label: 'Sábado', short: 'Sáb' },
  { id: 7, label: 'Domingo', short: 'Dom' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState<number>(1);
  const [nivel, setNivel] = useState<number>(1);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);

  useEffect(() => { cargarDatosActuales(); }, []);

  const cargarDatosActuales = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase.from('USUARIOS').select('nombre, objetivo, nivel, dias_entrenamiento').eq('id', user.id).single();
      if (perfil) {
        setNombre(perfil.nombre || '');
        setObjetivo(perfil.objetivo || 1);
        setNivel(perfil.nivel || 1);
        setDiasSeleccionados(perfil.dias_entrenamiento || [1, 3, 5]);
      }
    } catch (e) {
      console.error('Error:', e);
    } finally { setLoading(false); }
  };

  const toggleDia = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDiasSeleccionados(prev => prev.includes(id) ? prev.filter(dia => dia !== id) : [...prev, id].sort((a, b) => a - b));
  };

  const handleGuardar = async () => {
    if (diasSeleccionados.length === 0) return alert('Selecciona al menos un día.');
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('USUARIOS').update({ nombre, objetivo, nivel, dias_entrenamiento: diasSeleccionados }).eq('id', user.id);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back(); 
    } catch (e) {
      alert('Error al guardar.');
    } finally { setSaving(false); }
  };

  if (loading) return <View style={[s.container, s.center]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} disabled={saving}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ajustes de Plan</Text>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>TU NOMBRE</Text>
          <TextInput style={s.input} value={nombre} onChangeText={setNombre} placeholder="¿Cómo te llamas?" placeholderTextColor={colors.textMuted} autoCorrect={false} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>TU OBJETIVO PRINCIPAL</Text>
          <View style={s.cardsWrapper}>
            {OBJETIVOS.map((obj) => (
              <TouchableOpacity key={obj.id} style={[s.optionCard, objetivo === obj.id && s.optionCardActive]} onPress={() => { Haptics.selectionAsync(); setObjetivo(obj.id); }} activeOpacity={0.8}>
                <Ionicons name={obj.icon as any} size={20} color={objetivo === obj.id ? colors.primary : colors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={[s.optionText, objetivo === obj.id && s.optionTextActive]}>{obj.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>TU NIVEL DE EXPERIENCIA</Text>
          <View style={s.cardsWrapper}>
            {NIVELES.map((niv) => (
              <TouchableOpacity key={niv.id} style={[s.optionCard, nivel === niv.id && s.optionCardActive]} onPress={() => { Haptics.selectionAsync(); setNivel(niv.id); }} activeOpacity={0.8}>
                <Ionicons name={niv.icon as any} size={20} color={nivel === niv.id ? colors.primary : colors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={[s.optionText, nivel === niv.id && s.optionTextActive]}>{niv.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>TUS DÍAS DE ENTRENAMIENTO</Text>
          <Text style={s.sectionDesc}>FitMax adaptará tu rutina a estos días específicos.</Text>
          <View style={s.diasGrid}>
            {DIAS_SEMANA.map(dia => {
              const activo = diasSeleccionados.includes(dia.id);
              return (
                <TouchableOpacity key={dia.id} style={[s.diaCard, activo && s.diaCardActive]} onPress={() => toggleDia(dia.id)} activeOpacity={0.8}>
                  <Text style={[s.diaShort, activo && s.diaShortActive]}>{dia.short}</Text>
                  {activo && <View style={s.checkBadge}><Ionicons name="checkmark" size={12} color="#000" /></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        {/* 🚀 USAMOS EL BOTÓN GLOBAL DEL TEMA */}
        <TouchableOpacity style={[buttons.primary, saving && { opacity: 0.7 }]} onPress={handleGuardar} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#000" /> : <Text style={buttons.primaryText}>Guardar Cambios</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { ...typography.label }, // Cambiado de h3 a label
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.caption, marginBottom: spacing.sm }, // Usando tipografía del sistema
  sectionDesc: { ...typography.body, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  cardsWrapper: { flexDirection: 'row', gap: spacing.sm },
  optionCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
  optionCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaded },
  optionText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  optionTextActive: { color: colors.primary },
  diasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  diaCard: { width: (width - spacing.lg * 2 - 20) / 3, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', position: 'relative' },
  diaCardActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  diaShort: { fontSize: 15, fontWeight: '800', color: colors.textSecondary },
  diaShortActive: { color: '#000' },
  checkBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});