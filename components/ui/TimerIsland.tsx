import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, memo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';

export interface TimerHandle {
  getElapsedSeconds: () => number;
}

const TimerIsland = forwardRef<TimerHandle, { label?: string }>((props, ref) => {
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDisplaySeconds(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Esto permite que el padre pida el tiempo total solo cuando lo necesita (al guardar)
  useImperativeHandle(ref, () => ({
    getElapsedSeconds: () => Math.floor((Date.now() - startTimeRef.current) / 1000),
  }));

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{props.label || 'TIEMPO TOTAL'}</Text>
      <Text style={styles.value}>{formatTime(displaySeconds)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.caption, color: colors.textSecondary, letterSpacing: 1 },
  value: { ...typography.h1, fontSize: 28, color: colors.primary, marginTop: -4 },
});


export default memo(TimerIsland);