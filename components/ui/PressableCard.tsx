import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PressableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  glowColor?: string; 
}

export default function PressableCard({
  children,
  onPress,
  style,
  disabled = false,
  haptic = 'light',
  glowColor,
}: PressableCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const triggerHaptic = useCallback(() => {
    if (haptic === 'none' || disabled) return;
    const feedbackMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(feedbackMap[haptic]);
  }, [haptic, disabled]);

  const handlePressIn = () => {
    if (disabled) return;
    triggerHaptic();
    Animated.spring(scale, {
      toValue: 0.965, 
      friction: 5,
      tension: 100,
      useNativeDriver: true, 
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          style,
          { 
            transform: [{ scale }],
            opacity: disabled ? 0.5 : 1 
          }
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}