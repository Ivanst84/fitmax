// Ruta: app/(tabs)/exercises.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  StatusBar, TextInput, ScrollView, ActivityIndicator, Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface Ejercicio {
  id: string;
  nombre: string;
  descripcion: string;
  musculo_id: number;
  nivel_id: number;
  equipo_id: number;
  video_url: string;
  duracion_seg: number;
  es_premium: boolean;
}

// Catálogos
const MUSCULOS: Record<number, string> = {
  1:'Pecho', 2:'Espalda Alta', 3:'Espalda Baja', 4:'Hombros',
  5:'Bíceps', 6:'Tríceps', 7:'Antebrazos', 8:'Abdomen', 9:'Oblicuos',
  10:'Glúteos', 11:'Cuádriceps', 12:'Isquiotibiales', 13:'Pantorrillas',
  14:'Full Body', 15:'Cardio'
};

const NIVELES: Record<number, string> = {
  1:'Principiante', 2:'Intermedio', 3:'Avanzado'
};

const FILTROS_RAPIDOS = [
  { id: null, label: 'Todos' },
  { id: 1,  label: 'Pecho' },
  { id: 2,  label: 'Espalda' },
  { id: 11, label: 'Piernas' },
  { id: 4,  label: 'Hombros' },
  { id: 5,  label: 'Brazos' }, // Bíceps
  { id: 8,  label: 'Core' },
];

export default function ExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados de Búsqueda y Filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<number | null>(null);

  useEffect(() => { 
    cargarEjercicios(); 
  }, []);

  const cargarEjercicios = async () => {
    try {
      const { data, error } = await supabase
        .from('EJERCICIOS')
        .select('*')
        .order('nombre', { ascending: true });
        
      if (error) throw error;
      setEjercicios(data || []);
    } catch (error) {
      console.error('Error cargando ejercicios:', error);
    } finally {
      setCargando(false);
    }
  };

  // 🚀 MOTOR DE BÚSQUEDA INTELIGENTE (Combina texto + categoría)
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
      
      {/* HEADER */}
      <View style={s.header}>
        <Text style={s.title}>Biblioteca</Text>
        <Text style={s.subtitle}>Explora {ejercicios.length} movimientos</Text>
      </View>

      {/* 🚀 BUSCADOR */}
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

      {/* 🚀 CHIPS DE FILTRADO (Horizontal) */}
      <View style={s.filtersWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersScroll}
        >
          {FILTROS_RAPIDOS.map(f => {
            const isActive = selectedMuscle === f.id;
            return (
              <TouchableOpacity
                key={String(f.id)}
                style={[s.chip, isActive && s.chipActive]}
                onPress={() => handleSelectMuscle(f.id)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, isActive && s.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* LISTA DE EJERCICIOS */}
      {cargando ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtrados.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="barbell-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyTitle}>Sin resultados</Text>
          <Text style={s.emptyDesc}>No encontramos ejercicios que coincidan con tu búsqueda.</Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          onScroll={() => Keyboard.dismiss()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/exercise/${item.id}`);
              }}
            >
              {/* Thumbnail / Icono */}
              <View style={s.thumbnail}>
                <Ionicons 
                  name={item.video_url ? "play-circle" : "barbell"} 
                  size={28} 
                  color={item.video_url ? colors.primary : colors.textSecondary} 
                />
              </View>

              {/* Información */}
              <View style={s.cardInfo}>
                <Text style={s.cardName} numberOfLines={1}>{item.nombre}</Text>
                
                <View style={s.tagsRow}>
                  <View style={s.tag}>
                    <Text style={s.tagText}>{MUSCULOS[item.musculo_id] || 'General'}</Text>
                  </View>
                  <View style={[s.tag, s.tagNivel]}>
                    <Text style={[s.tagText, {color: colors.primary}]}>{NIVELES[item.nivel_id] || 'N/A'}</Text>
                  </View>
                </View>
              </View>

              {/* Acciones Derecha (Premium o Flecha) */}
              <View style={s.cardRight}>
                {item.es_premium && (
                  <View style={s.premiumBadge}>
                    <Ionicons name="star" size={10} color="#000" style={{marginRight: 2}} />
                    <Text style={s.premiumText}>PRO</Text>
                  </View>
                )}
                {!item.es_premium && (
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                )}
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
  title: { ...typography.h1, fontSize: 32, marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textSecondary },

  // Buscador
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    paddingHorizontal: spacing.md, height: 48,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 16, height: '100%' },

  // Filtros Chips
  filtersWrapper: { height: 40, marginBottom: spacing.md },
  filtersScroll: { paddingHorizontal: spacing.lg, gap: 8 },
  chip: {
    paddingHorizontal: 16, justifyContent: 'center',
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#000', fontWeight: '800' }, // Contraste con el naranja

  // Lista
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  
  // Tarjetas
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)'
  },
  thumbnail: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md
  },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardName: { ...typography.h3, fontSize: 16, marginBottom: 6 },
  
  tagsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  tag: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  tagNivel: { backgroundColor: 'rgba(255, 77, 0, 0.1)' },
  tagText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: spacing.sm },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F59E0B', // Dorado Premium
    paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.sm
  },
  premiumText: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 0.5 },

  // Estado Vacío
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: 40 },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' }
});