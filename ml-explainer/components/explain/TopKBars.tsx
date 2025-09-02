import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TopKItem } from '@/lib/api';

export default function TopKBars({ items }: { items: TopKItem[] }) {
  const maxP = Math.max(0.0001, ...items.map((i) => i.p));
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top classes</Text>
      {items.map((it) => {
        const pct = (it.p / maxP) * 100;
        const pctLabel = `${(it.p * 100).toFixed(1)}%`;
        return (
          <View style={styles.row} key={it.label}>
            <Text style={styles.label} numberOfLines={1}>
              {it.label}
            </Text>
            <View style={styles.barBg}>
              <View style={[styles.bar, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.val}>{pctLabel}</Text>
          </View>
        );
      })}
      <Text style={styles.caption}>Higher bar = model confidence; not a guarantee.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 12 },
  barBg: {
    flex: 2,
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: { height: '100%', backgroundColor: '#2563eb' },
  val: { width: 60, textAlign: 'right', fontVariant: ['tabular-nums'], fontSize: 12 },
  caption: { color: '#6b7280', fontSize: 12 },
});

