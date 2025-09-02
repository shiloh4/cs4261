import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getMetricsSummaryAsync, MetricsSummary } from '@/lib/api';

export default function MetricsScreen() {
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMetricsSummaryAsync();
        setData(res);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Metrics</ThemedText>
      </ThemedView>

      {loading && <ActivityIndicator />}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {data && (
        <View style={{ gap: 16 }}>
          <View>
            <Text style={styles.sectionTitle}>Prediction counts</Text>
            {Object.entries(data.counts).map(([label, n]) => (
              <View key={label} style={styles.countRow}>
                <Text style={{ flex: 1 }}>{label}</Text>
                <Text style={{ width: 40, textAlign: 'right' }}>{n}</Text>
              </View>
            ))}
          </View>
          <View>
            <Text style={styles.sectionTitle}>Confusion (last N)</Text>
            <ConfusionMatrix classes={data.classes} matrix={data.confusion} />
          </View>
        </View>
      )}
    </ParallaxScrollView>
  );
}

function ConfusionMatrix({ classes, matrix }: { classes: string[]; matrix: number[][] }) {
  const m = classes.length;
  return (
    <View style={styles.matrix}>
      <View style={[styles.cell, styles.corner]} />
      {classes.map((c) => (
        <View key={'col-' + c} style={[styles.cell, styles.headerCell]}>
          <Text style={styles.headerText} numberOfLines={1}>
            {c}
          </Text>
        </View>
      ))}
      {classes.map((r, i) => (
        <React.Fragment key={'row-' + r}>
          <View style={[styles.cell, styles.headerCell]}>
            <Text style={styles.headerText} numberOfLines={1}>
              {r}
            </Text>
          </View>
          {classes.map((_, j) => (
            <View key={`cell-${i}-${j}`} style={[styles.cell, styles.valueCell]}>
              <Text style={styles.valueText}>{matrix?.[i]?.[j] ?? 0}</Text>
            </View>
          ))}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: { flexDirection: 'row', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginVertical: 8 },
  countRow: { flexDirection: 'row', gap: 8 },
  matrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
  },
  cell: { width: 80, height: 40, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  corner: { backgroundColor: '#f3f4f6' },
  headerCell: { backgroundColor: '#f3f4f6' },
  headerText: { fontSize: 12, fontWeight: '600' },
  valueCell: {},
  valueText: { fontVariant: ['tabular-nums'] },
});
