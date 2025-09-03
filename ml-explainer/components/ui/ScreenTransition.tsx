import React, { PropsWithChildren, useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

type Props = PropsWithChildren<{
  durationMs?: number;
  offset?: number; // px translateX offset for subtle slide-in
  direction?: 'left' | 'right';
}>;

export default function ScreenTransition({ children, durationMs = 220, offset = 14, direction = 'right' }: Props) {
  const isFocused = useIsFocused();
  const opacity = useSharedValue(0);
  const tx = useSharedValue(direction === 'right' ? offset : -offset);

  useEffect(() => {
    if (isFocused) {
      // animate in
      opacity.value = 0.001;
      tx.value = direction === 'right' ? offset : -offset;
      opacity.value = withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) });
      tx.value = withTiming(0, { duration: durationMs, easing: Easing.out(Easing.cubic) });
    } else {
      // prepare for next time
      opacity.value = 0.001;
      tx.value = direction === 'right' ? offset : -offset;
    }
  }, [isFocused, durationMs, offset, direction]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}

