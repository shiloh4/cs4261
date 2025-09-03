import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { TopKItem } from '@/lib/api';
import { ExternalLink } from '@/components/ExternalLink';

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
              <LinearGradient
                colors={["#22d3ee", "#6366f1"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bar, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.val}>{pctLabel}</Text>
          </View>
        );
      })}
      <Text style={styles.caption}>Higher bar = model confidence; not a guarantee.</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>About these classes</Text>
        <Text style={styles.infoText}>
          Predictions are drawn from the ImageNet-1k label set. If your photo isn't one of those
          categories, the model may guess the closest visual match and be unreliable.
        </Text>
        <ExternalLink href="https://deeplearning.cms.waikato.ac.nz/user-guide/class-maps/IMAGENET/">
          <Text style={styles.link}>Learn more about ImageNet</Text>
        </ExternalLink>
      </View>
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
  infoBox: { marginTop: 8, backgroundColor: '#f8fafc', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 },
  infoTitle: { fontWeight: '700' },
  infoText: { color: '#475569', fontSize: 12 },
  link: { color: '#2563eb', fontWeight: '600', marginTop: 4 },
});
