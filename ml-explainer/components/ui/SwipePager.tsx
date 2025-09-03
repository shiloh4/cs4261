import React, { PropsWithChildren } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlingGestureHandler, Directions, State } from 'react-native-gesture-handler';

type Props = PropsWithChildren<{
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  style?: any;
}>;

export default function SwipePager({ children, onSwipeLeft, onSwipeRight, style }: Props) {
  return (
    <FlingGestureHandler
      direction={Directions.LEFT}
      onHandlerStateChange={(e) => {
        if (e.nativeEvent.state === State.END) onSwipeLeft?.();
      }}
    >
      <FlingGestureHandler
        direction={Directions.RIGHT}
        onHandlerStateChange={(e) => {
          if (e.nativeEvent.state === State.END) onSwipeRight?.();
        }}
      >
        <View style={[styles.container, style]}>{children}</View>
      </FlingGestureHandler>
    </FlingGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

