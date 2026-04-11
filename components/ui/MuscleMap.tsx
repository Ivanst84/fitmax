// Ruta: components/ui/MuscleMap.tsx
// Mapa muscular SVG interactivo para FitMax
// Uso: <MuscleMap muscleId={ejercicio.musculo_id} side="front" />
//
// musculo_id mapping (de tu CAT_MUSCULOS):
// 1=Pecho, 2=Espalda Alta, 3=Espalda Baja, 4=Hombros,
// 5=Bíceps, 6=Tríceps, 7=Antebrazos, 8=Abdomen, 9=Oblicuos,
// 10=Glúteos, 11=Cuádriceps, 12=Isquiotibiales, 13=Pantorrillas,
// 14=Full Body, 15=Cardio

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import Svg, {
  Path, Ellipse, Circle, G, Text as SvgText, Defs, LinearGradient, Stop 
} from 'react-native-svg';
import { colors, spacing, radius } from '../../constants/theme';

// ─── Configuración de músculos ──────────────────────────────────────────────

interface MuscleConfig {
  primaryColor: string;    // (Ya no se usa directo porque usamos gradientes, pero sirve de ref)
  secondaryColor: string;  
  side: 'front' | 'back' | 'both';
  label: string;
}

const MUSCLE_CONFIG: Record<number, MuscleConfig> = {
  1:  { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'front', label: 'Pecho' },
  2:  { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'back',  label: 'Espalda Alta' },
  3:  { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'back',  label: 'Espalda Baja' },
  4:  { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'both',  label: 'Hombros' },
  5:  { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'front', label: 'Bíceps' },
  6:  { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'back',  label: 'Tríceps' },
  7:  { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'both',  label: 'Antebrazos' },
  8:  { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'front', label: 'Abdomen' },
  9:  { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'front', label: 'Oblicuos' },
  10: { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'back',  label: 'Glúteos' },
  11: { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'front', label: 'Cuádriceps' },
  12: { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'back',  label: 'Isquiotibiales' },
  13: { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'both',  label: 'Pantorrillas' },
  14: { primaryColor: '#FF4D00', secondaryColor: '#FF8C5A', side: 'both',  label: 'Full Body' },
  15: { primaryColor: '#378ADD', secondaryColor: '#85B7EB', side: 'both',  label: 'Cardio' },
};

// ─── Colores base (AQUÍ CONECTAMOS LOS GRADIENTES) ────────────────────────

// Usamos el ID de los gradientes que definiremos dentro del SVG
const BASE_SKIN = 'url(#bodySkin)';        // Cuerpo plomo metálico
const HIGHLIGHT = 'url(#activeMuscle)';    // Fuego primario
const CARDIO_COLOR = 'url(#activeCardio)'; // Azul neón para cardio

const BASE_STROKE = '#444444';      // Contorno muscular interno
const BASE_OUTLINE = '#666666';     // Silueta exterior
const HIGHLIGHT_SEC = '#8A3305';    // Secundario sutil (oscuro para contraste)

// ─── Props ────────────────────────────────────────────────────────────────

interface MuscleMapProps {
  muscleId: number;
  secondaryMuscleIds?: number[];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showToggle?: boolean;
}

// ─── Componente Principal ──────────────────────────────────────────────────

export default function MuscleMap({
  muscleId,
  secondaryMuscleIds = [],
  size = 'md',
  showLabel = true,
  showToggle = true,
}: MuscleMapProps) {
  const config = MUSCLE_CONFIG[muscleId] ?? MUSCLE_CONFIG[14];
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>(
    config.side === 'back' ? 'back' : 'front'
  );

  const dimensions = {
    sm: { width: 120, height: 200 },
    md: { width: 180, height: 300 },
    lg: { width: 240, height: 400 },
  }[size];

  const isPrimary = (mId: number): boolean => {
    if (mId !== muscleId) return false;
    if (config.side === 'both') return true;
    if (config.side === 'front' && currentSide === 'front') return true;
    if (config.side === 'back'  && currentSide === 'back')  return true;
    return false;
  };

  const isSecondary = (mId: number): boolean => {
    if (!secondaryMuscleIds.includes(mId)) return false;
    const secConfig = MUSCLE_CONFIG[mId];
    if (!secConfig) return false;
    if (secConfig.side === 'both') return true;
    if (secConfig.side === 'front' && currentSide === 'front') return true;
    if (secConfig.side === 'back'  && currentSide === 'back')  return true;
    return false;
  };

  const getMuscleColor = (mId: number, defaultColor: string): string => {
    if (isPrimary(mId))   return muscleId === 15 ? CARDIO_COLOR : HIGHLIGHT;
    if (isSecondary(mId)) return HIGHLIGHT_SEC;
    return defaultColor;
  };

  const isFullBody = muscleId === 14 || muscleId === 15;
  const fullBodyColor = muscleId === 15 ? CARDIO_COLOR : HIGHLIGHT;

  return (
    <View style={styles.container}>
      <Svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 100 170"
      >
        {/* 🚀 MOTOR HOLOGRÁFICO 3D (GRADIENTES) */}
        <Defs>
          {/* Piel inactiva: Gris plomo a negro */}
          <LinearGradient id="bodySkin" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#4A4A4A" stopOpacity="1" />
            <Stop offset="1" stopColor="#121212" stopOpacity="1" />
          </LinearGradient>
          
          {/* Músculo activo: Naranja claro a Fuego Intenso */}
          <LinearGradient id="activeMuscle" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FF8C5A" stopOpacity="1" />
            <Stop offset="1" stopColor="#FF4D00" stopOpacity="1" />
          </LinearGradient>

          {/* Cardio activo: Azul claro a Azul eléctrico */}
          <LinearGradient id="activeCardio" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#85B7EB" stopOpacity="1" />
            <Stop offset="1" stopColor="#378ADD" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {currentSide === 'front'
          ? <FrontBody
              getMuscleColor={getMuscleColor}
              isFullBody={isFullBody}
              fullBodyColor={fullBodyColor}
              muscleId={muscleId}
            />
          : <BackBody
              getMuscleColor={getMuscleColor}
              isFullBody={isFullBody}
              fullBodyColor={fullBodyColor}
              muscleId={muscleId}
            />
        }
      </Svg>

      {showLabel && (
        <View style={styles.labelRow}>
          <View style={[styles.dot, muscleId === 15 && { backgroundColor: '#378ADD' }]} />
          <Text style={[styles.label, muscleId === 15 && { color: '#378ADD' }]}>
            {config.label}
          </Text>
        </View>
      )}

      {showToggle && config.side === 'both' && (
        <TouchableOpacity
          style={[styles.toggleBtn, muscleId === 15 && { borderColor: '#378ADD', backgroundColor: 'rgba(55, 138, 221, 0.15)' }]}
          onPress={() => setCurrentSide(s => s === 'front' ? 'back' : 'front')}
        >
          <Text style={[styles.toggleText, muscleId === 15 && { color: '#378ADD' }]}>
            {currentSide === 'front' ? 'Ver espalda →' : '← Ver frente'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Vista Frontal ────────────────────────────────────────────────────────

function FrontBody({ getMuscleColor, isFullBody, fullBodyColor, muscleId }: any) {
  const c = (id: number, def: string) =>
    isFullBody ? fullBodyColor : getMuscleColor(id, def);

  return (
    <G>
      <Ellipse cx="50" cy="9" rx="7" ry="8" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.5"/>
      <Path d="M46 16 L46 20 L54 20 L54 16 Z" fill={BASE_SKIN} stroke={BASE_STROKE} strokeWidth="0.3"/>
      
      <Path d="M30 22 Q26 20 24 26 Q22 32 26 35 L32 32 Z" fill={c(4, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M70 22 Q74 20 76 26 Q78 32 74 35 L68 32 Z" fill={c(4, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M38 22 Q32 24 31 32 Q36 36 46 34 L46 22 Z" fill={c(1, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M62 22 Q68 24 69 32 Q64 36 54 34 L54 22 Z" fill={c(1, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M50 22 L50 34" stroke={BASE_STROKE} strokeWidth="0.3" fill="none"/>

      <Path d="M26 35 Q22 42 24 50 L28 48 Q30 40 32 35 Z" fill={c(5, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M74 35 Q78 42 76 50 L72 48 Q70 40 68 35 Z" fill={c(5, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M24 50 Q20 58 22 68 L26 66 Q28 56 28 48 Z" fill={c(7, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M76 50 Q80 58 78 68 L74 66 Q72 56 72 48 Z" fill={c(7, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Ellipse cx="22" cy="72" rx="3.5" ry="5" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.4"/>
      <Ellipse cx="78" cy="72" rx="3.5" ry="5" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.4"/>

      {[0, 1, 2].map(i => (
        <G key={i}>
          <Path d={`M44 ${36 + i * 8} Q46 ${34 + i * 8} 50 ${35 + i * 8} L50 ${44 + i * 8} Q46 ${44 + i * 8} 44 ${44 + i * 8} Z`} fill={c(8, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.35" />
          <Path d={`M56 ${36 + i * 8} Q54 ${34 + i * 8} 50 ${35 + i * 8} L50 ${44 + i * 8} Q54 ${44 + i * 8} 56 ${44 + i * 8} Z`} fill={c(8, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.35" />
        </G>
      ))}

      <Path d="M38 36 Q33 44 34 58 Q38 62 44 60 L44 36 Z" fill={c(9, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M62 36 Q67 44 66 58 Q62 62 56 60 L56 36 Z" fill={c(9, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M34 60 Q32 64 34 68 Q42 72 50 72 Q58 72 66 68 Q68 64 66 60 L56 60 L44 60 Z" fill={BASE_SKIN} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M34 68 Q30 80 32 96 Q36 102 42 100 Q46 88 46 72 Z" fill={c(11, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M40 70 Q38 84 38 98" stroke={BASE_STROKE} strokeWidth="0.25" fill="none" opacity="0.6"/>

      <Path d="M66 68 Q70 80 68 96 Q64 102 58 100 Q54 88 54 72 Z" fill={c(11, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M60 70 Q62 84 62 98" stroke={BASE_STROKE} strokeWidth="0.25" fill="none" opacity="0.6"/>

      <Ellipse cx="38" cy="103" rx="6" ry="5" fill={BASE_SKIN} stroke={BASE_STROKE} strokeWidth="0.4"/>
      <Ellipse cx="62" cy="103" rx="6" ry="5" fill={BASE_SKIN} stroke={BASE_STROKE} strokeWidth="0.4"/>

      <Path d="M33 107 Q30 120 31 134 Q35 138 38 136 Q42 122 44 108 Z" fill={c(13, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M67 107 Q70 120 69 134 Q65 138 62 136 Q58 122 56 108 Z" fill={c(13, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M30 135 Q27 140 28 144 L40 144 Q42 140 40 136 Z" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.4"/>
      <Path d="M70 135 Q73 140 72 144 L60 144 Q58 140 60 136 Z" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.4"/>

      <Path d="M43 0 Q50 -1 57 0 Q60 2 58 8 Q56 16 54 20 L54 22 Q68 22 70 22 Q76 20 78 26 Q80 32 76 36 Q74 40 72 48 Q80 58 78 68 L78 78 Q80 88 78 100 L74 104 Q70 116 70 134 L72 144 Q74 148 72 150 Q60 152 60 148 Q58 136 58 108 L54 108 L54 144 Q54 150 50 150 Q46 150 46 144 L46 108 L42 108 Q42 136 40 148 Q40 152 28 150 Q26 148 28 144 L30 134 Q30 116 26 104 L22 100 Q20 88 22 78 L22 68 Q20 58 28 48 Q26 40 24 36 Q20 32 22 26 Q24 20 30 22 Q32 22 46 22 L46 20 Q44 16 42 8 Q40 2 43 0 Z" fill="none" stroke={BASE_OUTLINE} strokeWidth="0.8" />
    </G>
  );
}

// ─── Vista Trasera ────────────────────────────────────────────────────────

function BackBody({ getMuscleColor, isFullBody, fullBodyColor, muscleId }: any) {
  const c = (id: number, def: string) =>
    isFullBody ? fullBodyColor : getMuscleColor(id, def);

  return (
    <G>
      <Ellipse cx="50" cy="9" rx="7" ry="8" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.5"/>
      <Path d="M46 16 L46 20 L54 20 L54 16 Z" fill={BASE_SKIN} stroke={BASE_STROKE} strokeWidth="0.3"/>

      <Path d="M38 20 Q32 22 30 28 Q34 30 42 28 Q46 26 50 26 Q54 26 58 28 Q66 30 70 28 Q68 22 62 20 Q56 18 50 18 Q44 18 38 20 Z" fill={c(2, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      
      <Path d="M30 22 Q24 20 22 28 Q20 34 24 37 L30 34 Q32 28 34 24 Z" fill={c(4, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M70 22 Q76 20 78 28 Q80 34 76 37 L70 34 Q68 28 66 24 Z" fill={c(4, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M38 28 Q32 34 32 50 Q36 56 44 54 L46 28 Z" fill={c(2, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M62 28 Q68 34 68 50 Q64 56 56 54 L54 28 Z" fill={c(2, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M50 20 L50 62" stroke={BASE_STROKE} strokeWidth="0.5" fill="none" strokeDasharray="1 1"/>

      <Path d="M36 54 Q32 60 34 68 Q42 72 50 72 Q58 72 66 68 Q68 60 64 54 L56 54 L44 54 Z" fill={c(3, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M24 37 Q20 44 22 52 L26 50 Q28 42 30 37 Z" fill={c(6, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M76 37 Q80 44 78 52 L74 50 Q72 42 70 37 Z" fill={c(6, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M22 52 Q18 60 20 70 L24 68 Q26 58 26 50 Z" fill={c(7, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M78 52 Q82 60 80 70 L76 68 Q74 58 74 50 Z" fill={c(7, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Ellipse cx="20" cy="74" rx="3.5" ry="5" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.4"/>
      <Ellipse cx="80" cy="74" rx="3.5" ry="5" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.4"/>

      <Path d="M34 68 Q30 76 32 86 Q38 92 48 90 L50 72 Z" fill={c(10, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M66 68 Q70 76 68 86 Q62 92 52 90 L50 72 Z" fill={c(10, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M32 86 Q28 100 30 110 Q34 116 40 114 Q44 100 48 90 Z" fill={c(12, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M68 86 Q72 100 70 110 Q66 116 60 114 Q56 100 52 90 Z" fill={c(12, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Ellipse cx="36" cy="115" rx="6" ry="5" fill={BASE_SKIN} stroke={BASE_STROKE} strokeWidth="0.4"/>
      <Ellipse cx="64" cy="115" rx="6" ry="5" fill={BASE_SKIN} stroke={BASE_STROKE} strokeWidth="0.4"/>

      <Path d="M30 119 Q26 130 28 142 Q32 146 38 144 Q42 132 42 120 Z" fill={c(13, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />
      <Path d="M70 119 Q74 130 72 142 Q68 146 62 144 Q58 132 58 120 Z" fill={c(13, BASE_SKIN)} stroke={BASE_STROKE} strokeWidth="0.4" />

      <Path d="M27 143 Q24 148 25 152 L39 152 Q41 148 39 144 Z" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.4"/>
      <Path d="M73 143 Q76 148 75 152 L61 152 Q59 148 61 144 Z" fill={BASE_SKIN} stroke={BASE_OUTLINE} strokeWidth="0.4"/>

      <Path d="M43 0 Q50 -1 57 0 Q60 2 58 8 Q56 16 54 20 L54 22 Q68 22 70 22 Q76 20 78 26 Q80 32 76 36 Q74 40 72 48 Q80 58 80 70 L80 78 Q82 88 78 100 L74 104 Q72 116 70 136 L72 146 Q74 150 72 152 Q60 154 60 150 Q58 138 58 112 L54 112 L54 148 Q54 154 50 154 Q46 154 46 148 L46 112 L42 112 Q42 138 40 150 Q40 154 28 152 Q26 150 28 146 L30 136 Q28 116 26 104 L22 100 Q18 88 20 78 L20 70 Q20 58 28 48 Q26 40 24 36 Q20 32 22 26 Q24 20 30 22 Q32 22 46 22 L46 20 Q44 16 42 8 Q40 2 43 0 Z" fill="none" stroke={BASE_OUTLINE} strokeWidth="0.8" />
    </G>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primaryFaded,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
});