import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Neighbor } from '@/lib/api';

type Pt = { x: number; y: number };

// Robust, square bounds so clusters aren't smashed into a corner by outliers.
function quantile(values: number[], q: number) {
  if (!values.length) return 0;
  const xs = [...values].sort((a, b) => a - b);
  const pos = (xs.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = xs[base + 1];
  return next !== undefined ? xs[base] + rest * (next - xs[base]) : xs[base];
}

function robustSquareBounds(points: Pt[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xLo = quantile(xs, 0.05);
  const xHi = quantile(xs, 0.95);
  const yLo = quantile(ys, 0.05);
  const yHi = quantile(ys, 0.95);
  const cx = (xLo + xHi) / 2;
  const cy = (yLo + yHi) / 2;
  // Use the larger span to enforce equal aspect; add slight padding.
  const half = Math.max(xHi - xLo, yHi - yLo) / 2 || 1;
  const pad = half * 0.05; // 5% breathing room
  return { minX: cx - half - pad, maxX: cx + half + pad, minY: cy - half - pad, maxY: cy + half + pad };
}

export default function EmbeddingScatter({ me, neighbors }: { me: Pt; neighbors: Neighbor[] }) {
  const all = useMemo(() => [me, ...neighbors.map((n) => ({ x: n.x, y: n.y }))], [me, neighbors]);
  // Compute robust, square bounds so outliers don't squash the cluster.
  const { minX, maxX, minY, maxY } = useMemo(() => robustSquareBounds(all), [all]);
  const pad = 8;

  function jitter(seed: number) {
    // Deterministic tiny jitter based on a seed to separate near-overlapping dots.
    const s1 = Math.sin(seed * 12.9898) * 43758.5453;
    const s2 = Math.sin((seed + 1) * 78.233) * 96234.3456;
    const jx = (s1 - Math.floor(s1)) - 0.5; // [-0.5, 0.5)
    const jy = (s2 - Math.floor(s2)) - 0.5;
    return { jx, jy };
  }

  function toPx(p: Pt, size: number, seed?: number) {
    const w = size - 2 * pad;
    const h = size - 2 * pad;
    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;
    const nx = (p.x - minX) / dx;
    const ny = (p.y - minY) / dy;
    // Flip y so up is positive visually
    let left = pad + nx * w;
    let top = pad + (1 - ny) * h;
    if (seed !== undefined) {
      const { jx, jy } = jitter(seed);
      const amp = Math.max(2, size * 0.008); // px amplitude
      left += jx * amp * 2;
      top += jy * amp * 2;
    }
    // Clamp to the box to avoid overflow
    left = Math.min(size - pad, Math.max(pad, left));
    top = Math.min(size - pad, Math.max(pad, top));
    return { left, top };
  }

  const size = 220;

  return (
    <View>
      <Text style={styles.title}>Embedding</Text>
      <View style={[styles.box, { width: size, height: size }]}
        accessibilityLabel="Embedding scatter plot">
        {/* neighbors */}
        {neighbors.map((n, idx) => {
          const pos = toPx(n, size, idx + 1);
          return <View key={idx} style={[styles.dot, styles.point, styles.neighbor, { left: pos.left - 4, top: pos.top - 4 }]} />;
        })}
        {/* me */}
        {(() => {
          const pos = toPx(me, size);
          return <View style={[styles.dot, styles.point, styles.me, { left: pos.left - 7, top: pos.top - 7 }]} />;
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
  },
  point: { position: 'absolute' },
  neighbor: { backgroundColor: '#22d3ee' },
  me: { backgroundColor: '#6366f1', width: 14, height: 14, borderRadius: 14 },
  caption: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  legendText: { fontSize: 12, color: '#334155' },
  infoBox: { marginTop: 8, backgroundColor: '#f8fafc', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 },
  infoTitle: { fontWeight: '700' },
  infoText: { color: '#475569', fontSize: 12 },
});
