import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, { useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { EmbeddingPoint } from '@/lib/api';
import { getEmbeddingPointsAsync } from '@/lib/api';

type Pt = { x: number; y: number };

function normBounds(points: Pt[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export default function ZoomableEmbeddingScatter({
  highlightId,
  points: providedPoints,
  title = 'Embeddings (all recent)',
  limit,
}: {
  highlightId?: string;
  points?: EmbeddingPoint[];
  title?: string;
  limit?: number;
}) {
  const [points, setPoints] = useState<EmbeddingPoint[]>(providedPoints ?? []);
  const size = 280;

  useEffect(() => {
    if (providedPoints && providedPoints.length) {
      setPoints(providedPoints);
      return;
    }
    (async () => {
      try {
        const pts = await getEmbeddingPointsAsync(limit);
        setPoints(pts);
      } catch (e) {
        // no-op
      }
    })();
  }, [providedPoints, limit]);

  const bounds = useMemo(() => (points.length ? normBounds(points) : { minX: -1, maxX: 1, minY: -1, maxY: 1 }), [points]);
  const pad = 8;

  function toPx(p: Pt, s: number) {
    const w = s - 2 * pad;
    const h = s - 2 * pad;
    const dx = (bounds.maxX - bounds.minX) || 1;
    const dy = (bounds.maxY - bounds.minY) || 1;
    const nx = (p.x - bounds.minX) / dx;
    const ny = (p.y - bounds.minY) / dy;
    return { left: pad + nx * w, top: pad + (1 - ny) * h };
  }

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const pinchHandler = useAnimatedGestureHandler({
    onActive: (e) => {
      const next = Math.min(8, Math.max(1, e.scale));
      scale.value = next;
    },
  });

  const panHandler = useAnimatedGestureHandler({
    onActive: (e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    },
    onEnd: () => {
      // gentle spring back if tiny drift
      tx.value = withTiming(tx.value, { duration: 120 });
      ty.value = withTiming(ty.value, { duration: 120 });
    },
  });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.frame, { width: size, height: size }]}
        accessible accessibilityLabel="Zoomable embedding scatter plot">
        <PinchGestureHandler onGestureEvent={pinchHandler}>
          <Animated.View style={{ flex: 1 }}>
            <PanGestureHandler onGestureEvent={panHandler}>
              <Animated.View style={[styles.canvas, contentStyle]}>
                {points.map((pt) => {
                  const pos = toPx(pt, size);
                  const isMe = pt.id === highlightId;
                  return (
                    <View key={pt.id} style={[styles.dot, isMe ? styles.me : styles.neighbor, { left: pos.left - (isMe ? 7 : 4), top: pos.top - (isMe ? 7 : 4) }]}>
                      {/* empty view for dot */}
                    </View>
                  );
                })}
                {points.map((pt) => {
                  const pos = toPx(pt, size);
                  return (
                    <Animated.Text key={pt.id + '-lbl'} style={[styles.label, { left: pos.left + 6, top: pos.top - 6 }]} numberOfLines={1}>
                      {pt.label}
                    </Animated.Text>
                  );
                })}
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, styles.legendMe, { marginRight: 6 }]} />
        <Text style={[styles.legendText, { marginRight: 12 }]}>Your photo</Text>
        <View style={[styles.legendDot, styles.legendNeighbor, { marginRight: 6 }]} />
        <Text style={styles.legendText}>Similar recent images</Text>
      </View>
      <Text style={styles.caption}>Drag to pan. All points are from your recent predictions.</Text>
      <Text style={styles.caption}>Points close together have similar visual features.</Text>
        <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How to read this</Text>
        <Text style={styles.infoText}>• The model turns each image into a high-dimensional feature vector; we compress to 2D (PCA) for display.</Text>
        <Text style={styles.infoText}>• Only distances matter — axes are arbitrary and have no unit or label.</Text>
        <Text style={styles.infoText}>• Your point is highlighted; small dots are neighbors from your recent predictions.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  frame: { backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  canvas: { flex: 1 },
  dot: { position: 'absolute', borderRadius: 999 },
  neighbor: { width: 8, height: 8, backgroundColor: '#22d3ee' },
  me: { width: 14, height: 14, backgroundColor: '#6366f1' },
  label: { position: 'absolute', fontSize: 10, color: '#334155', maxWidth: 80 },
  caption: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  infoBox: { marginTop: 8, backgroundColor: '#f8fafc', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 },
  infoTitle: { fontWeight: '700' },
  infoText: { color: '#475569', fontSize: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  legendText: { fontSize: 12, color: '#334155' },
  legendDot: { width: 8, height: 8, borderRadius: 999 },
  legendNeighbor: { backgroundColor: '#22d3ee' },
  legendMe: { width: 14, height: 14, borderRadius: 14, backgroundColor: '#6366f1' },
});
