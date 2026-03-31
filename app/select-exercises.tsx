// Ruta: app/select-exercises.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  TextInput, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { supabase } from '../lib/supabase';
import { colors, spacing, radius, typography } from '../constants/theme';

interface Ejercicio {
  id: string;
  nombre: string;
  musculo_id: number;
  es_premium: boolean;
}

const MUSCULOS: Record<number, string> = {
  1: 'Pecho', 2: 'Espalda', 4: 'Hombros', 5: 'Bíceps', 6: 'Tríceps', 
  8: 'Abdomen', 10: 'Glúteos', 11: 'Piernas'
};

export default function SelectExercisesScreen() {
  const { nombreRutina, diaPlan } = useLocalSearchParams<{ nombreRutina: string, diaPlan: string }>();
  const router = useRouter();

  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const cargarCatalogo = async () => {
    const { data, error } = await supabase
      .from('EJERCICIOS')
      .select('id, nombre, musculo_id, es_premium')
      .order('nombre', { ascending: true });
    
    if (!error && data) setEjercicios(data);
    setCargando(false);
  };

  const filtrados = useMemo(() => {
    if (!busqueda) return ejercicios;
    return ejercicios.filter(e => 
      e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (MUSCULOS[e.musculo_id] || '').toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [ejercicios, busqueda]);

  const toggleEjercicio = (id: string) => {
    Haptics.selectionAsync();
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const guardarRutina = async () => {
    if (seleccionados.length === 0) return;
    
    try {
      setGuardando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No session");

      // 1. Necesitamos el nivel y objetivo del usuario
      const { data: perfil } = await supabase
        .from('USUARIOS')
        .select('nivel, objetivo')
        .eq('id', user.id)
        .single();

      // 2. Crear la Rutina Madre
      const { data: nuevaRutina, error: errRutina } = await supabase
        .from('RUTINAS')
        .insert({
          nombre: nombreRutina,
          dia_semana: parseInt(diaPlan, 10),
          user_id: user.id,
          es_personalizada: true,
          nivel_id: perfil?.nivel || 1,
          objetivo_id: perfil?.objetivo || 1
        })
        .select('id')
        .single();

      if (errRutina || !nuevaRutina) throw errRutina;

      // 3. 🚀 CORRECCIÓN: Usar tu esquema real de RUTINA_EJERCICIOS
      const relaciones = seleccionados.map((ej_id, index) => ({
        rutina_id: nuevaRutina.id,
        ejercicio_id: ej_id,
        orden: index + 1,
        series: 3,         // Usando tu columna exacta
        reps: 12,          // Usando tu columna exacta
        descanso_seg: 60   // Usando tu columna exacta
      }));

      const { error: errRelaciones } = await supabase
        .from('RUTINA_EJERCICIOS')
        .insert(relaciones);

      if (errRelaciones) throw errRelaciones;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Regresar al Home para ver la nueva rutina
      router.replace('/(tabs)/home');

    } catch (error: any) {
      console.error("Error guardando rutina:", error.message);
      alert("Hubo un error al guardar tu rutina.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerTextContainer}>
          <Text style={s.headerTitle}>Agrega Ejercicios</Text>
          <Text style={s.headerSubtitle}>{nombreRutina} · Día {diaPlan}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Buscador */}
      <View style={s.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por nombre o músculo..."
          placeholderTextColor={colors.textMuted}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Lista */}
      {cargando ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = seleccionados.includes(item.id);
            return (
              <TouchableOpacity
                style={[s.card, isSelected && s.cardSelected]}
                onPress={() => toggleEjercicio(item.id)}
                activeOpacity={0.8}
              >
                <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
                </View>
                
                <View style={s.cardInfo}>
                  <Text style={[s.cardTitle, isSelected && s.cardTitleSelected]}>
                    {item.nombre}
                  </Text>
                  <Text style={s.cardSubtitle}>
                    {MUSCULOS[item.musculo_id] || 'General'}
                  </Text>
                </View>

                {item.es_premium && (
                  <View style={s.proBadge}>
                    <Text style={s.proText}>PRO</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Footer Fijo */}
      <View style={s.footer}>
        <TouchableOpacity 
          style={[s.saveBtn, seleccionados.length === 0 && s.saveBtnDisabled]}
          disabled={seleccionados.length === 0 || guardando}
          onPress={guardarRutina}
        >
          {guardando ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Text style={s.saveBtnText}>
                Guardar Rutina ({seleccionados.length})
              </Text>
              <Ionicons name="checkmark-circle" size={20} color="#000" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, height: 48, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  searchInput: { flex: 1, marginLeft: spacing.sm, color: colors.textPrimary, fontSize: 15 },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'transparent' },
  cardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(255, 77, 0, 0.05)' },
  
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.textMuted, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  cardTitleSelected: { color: colors.primary },
  cardSubtitle: { fontSize: 12, color: colors.textSecondary },

  proBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  proText: { fontSize: 9, fontWeight: '900', color: '#000' },

  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: radius.full, height: 56, justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
});