import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Neighbor } from '@/lib/api';

type Pt = { x: number; y: number };

function normalize(points: Pt[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export default function EmbeddingScatter({ me, neighbors }: { me: Pt; neighbors: Neighbor[] }) {
  const all = useMemo(() => [me, ...neighbors.map((n) => ({ x: n.x, y: n.y }))], [me, neighbors]);
  const { minX, maxX, minY, maxY } = useMemo(() => normalize(all), [all]);
  const pad = 8;

  function toPx(p: Pt, size: number) {
    const w = size - 2 * pad;
    const h = size - 2 * pad;
    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;
    const nx = (p.x - minX) / dx;
    const ny = (p.y - minY) / dy;
    // Flip y so up is positive visually
    return { left: pad + nx * w, top: pad + (1 - ny) * h };
  }

  const size = 220;

  return (
    <View>
      <Text style={styles.title}>Embedding</Text>
      <View style={[styles.box, { width: size, height: size }]}
        accessibilityLabel="Embedding scatter plot">
        {/* neighbors */}
        {neighbors.map((n, idx) => {
          const pos = toPx(n, size);
          return <View key={idx} style={[styles.dot, styles.neighbor, { left: pos.left - 4, top: pos.top - 4 }]} />;
        })}
        {/* me */}
        {(() => {
          const pos = toPx(me, size);
          return <View style={[styles.dot, styles.me, { left: pos.left - 7, top: pos.top - 7 }]} />;
        })()}
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.dot, styles.me, { width: 14, height: 14, borderRadius: 14, marginRight: 6 }]} />
        <Text style={[styles.legendText, { marginRight: 12 }]}>Your photo</Text>
        <View style={[styles.dot, styles.neighbor, { marginRight: 6 }]} />
        <Text style={styles.legendText}>Similar recent images</Text>
      </View>
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
  box: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    position: 'absolute',
  },
  neighbor: { backgroundColor: '#22d3ee' },
  me: { backgroundColor: '#6366f1', width: 14, height: 14, borderRadius: 14 },
  caption: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  legendText: { fontSize: 12, color: '#334155' },
  infoBox: { marginTop: 8, backgroundColor: '#f8fafc', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 },
  infoTitle: { fontWeight: '700' },
  infoText: { color: '#475569', fontSize: 12 },
});
