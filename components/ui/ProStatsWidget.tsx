import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg'; // 🆕 LIBRERÍA NUEVA

import { useProStats } from '../../hooks/useProStats';
import { colors, spacing, radius } from '../../constants/theme';

const MUSCLE_NAMES: Record<string, string> = {
  CHEST: 'Pecho', UPPER_BACK: 'Espalda Alta', LOWER_BACK: 'Espalda Baja',
  SHOULDERS: 'Hombros', BICEPS: 'Bíceps', TRICEPS: 'Tríceps', FOREARMS: 'Antebrazos',
  ABS: 'Abdomen', OBLIQUES: 'Oblicuos', GLUTES: 'Glúteos', QUADS: 'Cuádriceps',
  HAMSTRINGS: 'Isquios', CALVES: 'Pantorrillas', FULL_BODY: 'Full Body', CARDIO: 'Cardio',
  OTHER: 'Otros'
};

export default function ProStatsWidget() {
  const [days, setDays] = useState<number>(30);
  const { stats, cargando } = useProStats(days);

  const handleTabPress = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDays(val);
  };

  if (cargando && !stats) {
    return (
      <View style={[s.card, s.center, { height: 300 }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!stats) return null;

  // 🧮 DATOS PARA EL RADAR
  const upperData = stats.radar.find(r => r.grupo_key === 'upper_body')?.total_volumen || 0;
  const lowerData = stats.radar.find(r => r.grupo_key === 'lower_body')?.total_volumen || 0;
  const coreData = stats.radar.find(r => r.grupo_key === 'core' || r.grupo_key === 'general')?.total_volumen || 0;

  const maxVol = Math.max(upperData, lowerData, coreData, 1); // El valor máximo será el borde del triángulo
  const maxSeries = Math.max(...stats.heatmap.map(m => m.total_series), 1);

  // 📐 MATEMÁTICA DEL RADAR (SVG)
  const size = 200;
  const center = size / 2;
  const radius = 70; // Tamaño del gráfico

  // Función para calcular las coordenadas X,Y de cada punto
  const getPoint = (value: number, max: number, angleDeg: number) => {
    const r = (value / max) * radius;
    const rad = (angleDeg * Math.PI) / 180;
    return `${center + r * Math.cos(rad)},${center + r * Math.sin(rad)}`;
  };

  // Puntos del triángulo de datos (Arriba: -90°, Abajo Der: 30°, Abajo Izq: 150°)
  const dataPolygon = `
    ${getPoint(upperData, maxVol, -90)} 
    ${getPoint(lowerData, maxVol, 30)} 
    ${getPoint(coreData, maxVol, 150)}
  `;

  // Puntos de los triángulos de fondo (guías)
  const bgPolygon100 = `${getPoint(1, 1, -90)} ${getPoint(1, 1, 30)} ${getPoint(1, 1, 150)}`;
  const bgPolygon66 = `${getPoint(0.66, 1, -90)} ${getPoint(0.66, 1, 30)} ${getPoint(0.66, 1, 150)}`;
  const bgPolygon33 = `${getPoint(0.33, 1, -90)} ${getPoint(0.33, 1, 30)} ${getPoint(0.33, 1, 150)}`;

  return (
    <View style={s.container}>
      {/* 🧭 SELECTOR DE TIEMPO */}
      <View style={s.tabsRow}>
        {[7, 30, 90].map((val) => (
          <TouchableOpacity 
            key={val} 
            style={[s.tab, days === val && s.tabActive]} 
            onPress={() => handleTabPress(val)}
          >
            <Text style={[s.tabText, days === val && s.tabTextActive]}>{val} DÍAS</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 📐 SECCIÓN 1: RADAR DE SIMETRÍA */}
      <View style={s.card}>
        <View style={[s.cardHeader, { justifyContent: 'center', marginBottom: 20 }]}>
          <Text style={[s.cardTitle, { textAlign: 'center' }]}>SIMETRÍA DE VOLUMEN</Text>
        </View>

        <View style={s.radarContainer}>
          <Svg height={size} width={size}>
            {/* Guías de fondo (Triángulos grises) */}
            <Polygon points={bgPolygon100} fill="none" stroke="#333" strokeWidth="1" />
            <Polygon points={bgPolygon66} fill="none" stroke="#333" strokeWidth="1" />
            <Polygon points={bgPolygon33} fill="none" stroke="#333" strokeWidth="1" />

            {/* Líneas desde el centro a las puntas */}
            <Line x1={center} y1={center} x2={center} y2={center - radius} stroke="#333" strokeWidth="1" />
            <Line x1={center} y1={center} x2={center + radius * Math.cos(30 * Math.PI/180)} y2={center + radius * Math.sin(30 * Math.PI/180)} stroke="#333" strokeWidth="1" />
            <Line x1={center} y1={center} x2={center + radius * Math.cos(150 * Math.PI/180)} y2={center + radius * Math.sin(150 * Math.PI/180)} stroke="#333" strokeWidth="1" />

            {/* El triángulo de datos real */}
            <Polygon 
              points={dataPolygon} 
              fill={colors.primary} 
              fillOpacity="0.4" 
              stroke={colors.primary} 
              strokeWidth="2" 
            />

            {/* Etiquetas (Textos en las puntas) */}
            <SvgText x={center} y={15} fill="#888" fontSize="10" fontWeight="bold" textAnchor="middle">SUPERIOR</SvgText>
            <SvgText x={size - 10} y={center + 50} fill="#888" fontSize="10" fontWeight="bold" textAnchor="end">INFERIOR</SvgText>
            <SvgText x={10} y={center + 50} fill="#888" fontSize="10" fontWeight="bold" textAnchor="start">CORE</SvgText>
          </Svg>
        </View>
      </View>

      {/* 🔥 SECCIÓN 2: MAPA DE CALOR Y FATIGA */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Ionicons name="flame" size={18} color={colors.primary} />
          <Text style={[s.cardTitle, { textTransform: 'none' }]}>Mapa de Calor Muscular</Text>
        </View>
        <Text style={s.cardSub}>Intensidad por zona y estado de recuperación</Text>

        <View style={s.heatmapList}>
          {stats.heatmap.length === 0 ? (
            <Text style={s.emptyText}>Aún no hay datos en este periodo.</Text>
          ) : (
            stats.heatmap
              .sort((a, b) => b.total_series - a.total_series) 
              .map((musculo, index) => {
                const fillPct = (musculo.total_series / maxSeries) * 100;
                
                return (
                  <View key={index} style={s.muscleRow}>
                    
                    {/* INFO DEL MÚSCULO Y FATIGA */}
                    <View style={s.muscleInfo}>
                      <Text style={s.muscleName}>{MUSCLE_NAMES[musculo.slug_en] || musculo.slug_en}</Text>
                      <View style={s.fatigueBadge}>
                        {musculo.is_fatigued ? (
                          <>
                            <Ionicons name="battery-charging" size={12} color="#FF9500" />
                            <Text style={[s.fatigueText, { color: '#FF9500' }]}>RECUPERANDO</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="battery-full" size={12} color="#34C759" />
                            <Text style={[s.fatigueText, { color: '#34C759' }]}>LISTO</Text>
                          </>
                        )}
                      </View>
                    </View>

                    {/* BARRA DE INTENSIDAD */}
                    <View style={s.intensityContainer}>
                      <Text style={s.seriesText}>{musculo.total_series} series</Text>
                      <View style={s.intensityTrack}>
                        <View style={[s.intensityFill, { width: `${fillPct}%` }]} />
                      </View>
                    </View>

                  </View>
                );
            })
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { width: '100%', gap: spacing.lg, paddingBottom: spacing.xl },
  center: { justifyContent: 'center', alignItems: 'center' },
  
  tabsRow: { flexDirection: 'row', backgroundColor: '#111', padding: 4, borderRadius: 30, borderWidth: 1, borderColor: '#222' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 25 },
  tabActive: { backgroundColor: '#333' },
  tabText: { fontSize: 12, color: '#888', fontWeight: 'bold', letterSpacing: 0.5 },
  tabTextActive: { color: colors.primary, fontWeight: '900' },

  card: { backgroundColor: '#111', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },
  cardSub: { fontSize: 13, color: '#888', marginBottom: 20 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', paddingVertical: 20 },

  // Contenedor del Gráfico SVG
  radarContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },

  // Mapa de calor
  heatmapList: { gap: 20 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  
  muscleInfo: { flex: 1, paddingRight: 15 },
  muscleName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  fatigueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fatigueText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  intensityContainer: { width: '45%', alignItems: 'flex-end' },
  seriesText: { fontSize: 11, fontWeight: '600', color: '#888', marginBottom: 6 },
  intensityTrack: { width: '100%', height: 10, backgroundColor: '#222', borderRadius: 5, overflow: 'hidden' },
  intensityFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 }
});