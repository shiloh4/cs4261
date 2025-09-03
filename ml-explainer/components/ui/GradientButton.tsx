import React from 'react';
import { Pressable, Text, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function GradientButton({
  title,
  onPress,
  disabled,
  style,
  colors = ['#22d3ee', '#6366f1'],
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  colors?: string[];
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[style, disabled && { opacity: 0.6 }] }>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

