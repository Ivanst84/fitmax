import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  StatusBar, TextInput, ActivityIndicator, Keyboard, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface Ejercicio {
  id: string; nombre: string; musculo_id: number; es_premium: boolean; nivel_id: number;
}

const MUSCULOS: Record<number, string> = {
  1:'Pecho', 2:'Espalda Alta', 3:'Espalda Baja', 4:'Hombros',
  5:'Bíceps', 6:'Tríceps', 7:'Antebrazos', 8:'Abdomen', 9:'Oblicuos',
  10:'Glúteos', 11:'Cuádriceps', 12:'Isquiotibiales', 13:'Pantorrillas', 14:'Full Body', 15:'Cardio'
};

const NIVELES: Record<number, string> = { 1:'Principiante', 2:'Intermedio', 3:'Avanzado' };

const FILTROS_RAPIDOS = [
  { id: null, label: 'Todos' }, { id: 1, label: 'Pecho' }, { id: 2, label: 'Espalda' },
  { id: 11, label: 'Piernas' }, { id: 4, label: 'Hombros' }, { id: 5, label: 'Brazos' }, { id: 8, label: 'Core' },
];

export default function ExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<number | null>(null);

  useEffect(() => { cargarEjercicios(); }, []);

  const cargarEjercicios = async () => {
    try {
      const { data, error } = await supabase.from('EJERCICIOS').select('*').order('nombre', { ascending: true });
      if (error) throw error;
      setEjercicios(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally { setCargando(false); }
  };

  const filtrados = useMemo(() => {
    return ejercicios.filter(ej => {
      const matchMuscle = selectedMuscle ? ej.musculo_id === selectedMuscle : true;
      const matchSearch = searchQuery 
        ? ej.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (MUSCULOS[ej.musculo_id] || '').toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchMuscle && matchSearch;
    });
  }, [ejercicios, selectedMuscle, searchQuery]);

  const handleSelectMuscle = (id: number | null) => {
    Haptics.selectionAsync();
    setSelectedMuscle(id);
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={s.header}>
        <Text style={s.title}>Biblioteca</Text>
        <Text style={s.subtitle}>Explora {ejercicios.length} movimientos</Text>
      </View>

      <View style={s.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar ejercicio o músculo..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); Keyboard.dismiss(); }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersScroll}>
          {FILTROS_RAPIDOS.map(f => {
            const isActive = selectedMuscle === f.id;
            return (
              <TouchableOpacity key={String(f.id)} style={[s.chip, isActive && s.chipActive]} activeOpacity={0.7} onPress={() => handleSelectMuscle(f.id)}>
                <Text style={[s.chipText, isActive && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {cargando ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filtrados.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="search-outline" size={64} color={colors.border} />
          <Text style={s.emptyTitle}>Sin resultados</Text>
          <Text style={s.emptyDesc}>No encontramos ejercicios que coincidan con "{searchQuery}".</Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          onScroll={() => Keyboard.dismiss()}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={() => router.push(`/exercise/${item.id}`)}>
              <View style={s.cardInfo}>
                <Text style={s.cardName} numberOfLines={1}>{item.nombre}</Text>
                <View style={s.tagsRow}>
                  <View style={s.tag}><Text style={s.tagText}>{MUSCULOS[item.musculo_id] || 'General'}</Text></View>
                  <View style={[s.tag, s.tagNivel]}><Text style={[s.tagText, {color: colors.primary}]}>{NIVELES[item.nivel_id] || 'N/A'}</Text></View>
                </View>
              </View>
              <View style={s.cardRight}>
                {item.es_premium && <View style={s.premiumBadge}><Text style={s.premiumText}>PRO</Text></View>}
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  title: { ...typography.h1, marginBottom: 4 },
  subtitle: { ...typography.body },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, height: 48, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 16, height: '100%' },
  
  filtersWrapper: { height: 40, marginBottom: spacing.md },
  filtersScroll: { paddingHorizontal: spacing.lg, gap: 8 },
  chip: { backgroundColor: colors.surface, paddingHorizontal: 16, justifyContent: 'center', borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.small },
  chipTextActive: { color: '#000', fontWeight: '800' },
  
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardName: { ...typography.label, marginBottom: 8 },
  tagsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tag: { backgroundColor: colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  tagNivel: { backgroundColor: colors.primaryFaded },
  tagText: { ...typography.caption },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: spacing.sm, flexDirection: 'row', gap: 8 },
  premiumBadge: { backgroundColor: colors.warning, paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.sm },
  premiumText: { ...typography.caption, color: '#000' },

  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: 40 },
  emptyTitle: { ...typography.h2, marginTop: spacing.md, marginBottom: spacing.sm },
  emptyDesc: { ...typography.body, textAlign: 'center' },
});