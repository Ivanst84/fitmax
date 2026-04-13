import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '../../constants/theme';

export type AlertType = 'info' | 'success' | 'warning' | 'destructive';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  cancelText?: string;
  confirmText?: string;
  onCancel?: () => void;
  onConfirm: () => void;
}

export default function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  cancelText = 'Cancelar',
  confirmText = 'Aceptar',
  onCancel,
  onConfirm,
}: CustomAlertProps) {
  
  const getConfig = () => {
    switch (type) {
      case 'success': return { icon: 'checkmark-circle', color: colors.success };
      case 'warning': return { icon: 'alert-circle', color: colors.warning };
      case 'destructive': return { icon: 'warning', color: '#FF3B30' }; 
      default: return { icon: 'information-circle', color: colors.primary };
    }
  };

  const config = getConfig();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>

        <View style={s.alertBox}>
          <View style={[s.iconContainer, { backgroundColor: `${config.color}15` }]}>
            <Ionicons name={config.icon as any} size={32} color={config.color} />
          </View>

          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>

          <View style={s.buttonRow}>
            {onCancel && (
              <>
                <TouchableOpacity 
                  style={s.cancelBtn} 
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onCancel();
                  }}
                >
                  <Text style={s.cancelText}>{cancelText}</Text>
                </TouchableOpacity>
                {/* 🚀 FIX: Separador estático invisible para alinear perfectamente */}
                <View style={{ width: 12 }} /> 
              </>
            )}

            <TouchableOpacity 
              style={[
                s.confirmBtn, 
                type === 'destructive' ? { backgroundColor: '#FF3B30' } : { backgroundColor: colors.primary }
              ]} 
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onConfirm();
              }}
            >
              <Text style={[s.confirmText, type === 'destructive' && { color: '#fff' }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 1000,
  },
  alertBox: {
    width: '100%',
    maxWidth: 320, // 🚀 FIX: Un poco más angosto para que se vea más esbelto
    backgroundColor: '#151515',
    borderRadius: 24, 
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 60, height: 60, borderRadius: 30, // 🚀 FIX: Icono un poquito más sutil
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, textAlign: 'center', marginBottom: 6 },
  message: { ...typography.small, textAlign: 'center', color: colors.textSecondary, marginBottom: 20, paddingHorizontal: 10 },
  
  buttonRow: { 
    flexDirection: 'row', 
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  
  cancelBtn: { 
    flex: 1, 
    paddingVertical: 11, 
    borderRadius: 12, 
    backgroundColor: '#262626', // Un gris un pelín más claro para destacar
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cancelText: { ...typography.label, color: '#A0A0A0', fontWeight: '600' },
  
  confirmBtn: { 
    flex: 1, 
    paddingVertical: 11, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  confirmText: { ...typography.label, color: '#000', fontWeight: 'bold' },
});