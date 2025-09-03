import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { useNavigation } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SwipePager from '@/components/ui/SwipePager';
import ScreenTransition from '@/components/ui/ScreenTransition';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getMetricsSummaryAsync, MetricsSummary } from '@/lib/api';

export default function MetricsScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

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
    <SwipePager onSwipeRight={() => navigation.navigate('index')}>
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}>
      <ScreenTransition direction="left">
        <LinearGradient colors={["#0ea5e9", "#6366f1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
          <Text style={styles.heroTitle}>Metrics</Text>
          <Text style={styles.heroSubtitle}>Recent predictions and confusion</Text>
        </LinearGradient>

        {loading && <ActivityIndicator />}
        {error && <Text style={{ color: 'red' }}>{error}</Text>}
        {data && (
          <View style={{ gap: 16 }}>
            <View>
              <Text style={styles.sectionTitle}>Prediction counts</Text>
              {Object.entries(data.counts).map(([label, n]) => (
                  <View key={label} style={styles.countRow}>
                  <Text style={{ flex: 1, color: '#fff' }}>{label}</Text>
                  <Text style={{ width: 40, textAlign: 'right', color: '#fff' }}>{n}</Text>
                  </View>
              ))}
            </View>
            <View>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Confusion (last N)</Text>
                <Pressable onPress={() => setShowInfo((s) => !s)} accessibilityLabel="About confusion matrix" hitSlop={8}>
                  <Ionicons name="information-circle-outline" size={20} color="#e2e8f0" />
                </Pressable>
              </View>
              {showInfo && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>What is this?</Text>
                  <Text style={styles.infoText}>• Rows are true labels (from your feedback). Columns are predicted labels.</Text>
                  <Text style={styles.infoText}>• Each cell counts how often a row label was predicted as the column label.</Text>
                  <Text style={styles.infoText}>• Computed over your recent predictions; darker cells = more examples.</Text>
                </View>
              )}
              <ConfusionMatrix classes={data.classes} matrix={data.confusion} />
            </View>
          </View>
        )}
      </ScreenTransition>
    </ParallaxScrollView>
    </SwipePager>
  );
}

function ConfusionMatrix({ classes, matrix }: { classes: string[]; matrix: number[][] }) {
  const m = classes.length;
  const maxVal = useMemo(() => Math.max(1, ...matrix.flat()), [matrix]);
  const CELL_W = 96; // px
  const CELL_H = 48; // px

  // Refs for sync scrolling
  const colHeaderRef = useRef<ScrollView>(null);
  const rowHeaderRef = useRef<ScrollView>(null);
  const gridHRef = useRef<ScrollView>(null);
  const gridVRef = useRef<ScrollView>(null);

  return (
    <View>
      {/* Top header: corner + horizontally scrollable column headers (synced) */}
      <View style={{ flexDirection: 'row' }}>
        <View style={[styles.cell, styles.corner, { width: CELL_W, height: CELL_H }]} />
        <ScrollView
          ref={colHeaderRef}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: m * CELL_W }}
        >
          <View style={{ flexDirection: 'row' }}>
            {classes.map((c) => (
              <View key={'col-' + c} style={[styles.cell, styles.headerCell, { width: CELL_W, height: CELL_H }]}> 
                <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">{c}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Body: sticky left row headers + scrollable grid; both scroll vertically in sync */}
      <View style={{ flexDirection: 'row' }}>
        <ScrollView
          ref={rowHeaderRef}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ height: m * CELL_H }}
        >
          <View>
            {classes.map((r) => (
              <View key={'row-' + r} style={[styles.cell, styles.headerCell, { width: CELL_W, height: CELL_H }]}> 
                <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">{r}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <ScrollView
          ref={gridHRef}
          horizontal
          showsHorizontalScrollIndicator
          onScroll={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            colHeaderRef.current?.scrollTo({ x, animated: false });
          }}
          scrollEventThrottle={16}
        >
          <ScrollView
            ref={gridVRef}
            showsVerticalScrollIndicator
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              rowHeaderRef.current?.scrollTo({ y, animated: false });
            }}
            scrollEventThrottle={16}
          >
            <View>
              {classes.map((_, i) => (
                <View key={'grid-row-' + i} style={{ flexDirection: 'row' }}>
                  {classes.map((__, j) => {
                    const val = matrix?.[i]?.[j] ?? 0;
                    const norm = maxVal > 0 ? val / maxVal : 0;
                    const alpha = val === 0 ? 0 : 0.15 + 0.75 * norm; // stronger contrast for low non-zero
                    const bg = `rgba(99,102,241,${alpha})`;
                    const textColor = alpha > 0.45 ? '#fff' : '#0f172a';
                    return (
                      <View
                        key={`cell-${i}-${j}`}
                        style={[styles.cell, styles.valueCell, { width: CELL_W, height: CELL_H, backgroundColor: bg }]}
                      >
                        <Text style={[styles.valueText, { color: textColor }]}>{val}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 36, paddingBottom: 16, paddingHorizontal: 16 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  titleContainer: { flexDirection: 'row', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginVertical: 8, color: '#fff' },
  countRow: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
  cell: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  corner: { backgroundColor: '#f1f5f9' },
  headerCell: { backgroundColor: '#f1f5f9' },
  headerText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  valueCell: {},
  valueText: { fontVariant: ['tabular-nums'], fontWeight: '600' },
  infoBox: { marginTop: 8, backgroundColor: '#f8fafc', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, padding: 10, gap: 4, marginBottom: 12 },
  infoTitle: { fontWeight: '700' },
  infoText: { color: '#475569', fontSize: 12 },
});
