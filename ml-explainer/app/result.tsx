import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAnalysis } from '@/context/AnalysisContext';
import TopKBars from '@/components/explain/TopKBars';
import HeatmapOverlay from '@/components/explain/HeatmapOverlay';
import ZoomableEmbeddingScatter from '@/components/explain/ZoomableEmbeddingScatter';
import type { EmbeddingPoint } from '@/lib/api';
import { Pressable } from 'react-native';
import FeedbackPrompt from '@/components/explain/FeedbackPrompt';

export default function ResultScreen() {
  const router = useRouter();
  const { result, imageUri } = useAnalysis();
  const [showOverlay, setShowOverlay] = useState(true);
  const [alpha, setAlpha] = useState(0.9);

  const suggestions = useMemo(() => (result?.topk ?? []).map((t) => t.label), [result]);

  if (!result || !imageUri) {
    // If user refreshed cleared state, go back home
    router.replace('/');
    return null;
  }

  const neighborPoints: EmbeddingPoint[] = useMemo(() => {
    const pts: EmbeddingPoint[] = [];
    if (result?.embedding && result?.id) {
      pts.push({ id: result.id, x: result.embedding.x, y: result.embedding.y, label: result.topk?.[0]?.label || 'current' });
    }
    for (let i = 0; i < (result?.neighbors?.length || 0); i++) {
      const n = result.neighbors[i];
      pts.push({ id: `nb_${i}`, x: n.x, y: n.y, label: n.label, thumb: n.thumb });
    }
    return pts;
  }, [result]);

  const [viewMode, setViewMode] = useState<'all' | 'neighbors'>('all');

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={["#0ea5e9", "#6366f1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <Text style={styles.heroTitle}>Results</Text>
        <Text style={styles.heroSubtitle}>Model: {result.model}</Text>
      </LinearGradient>

      <View style={styles.card}>
        <TopKBars items={result.topk} />
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Grad-CAM Overlay</Text>
          <View style={styles.rowCenter}>
            <Text style={{ marginRight: 6 }}>Show</Text>
            <Switch value={showOverlay} onValueChange={setShowOverlay} />
          </View>
        </View>
        <HeatmapOverlay originalUri={imageUri} overlayDataUri={result.heatmap_png_b64} showOverlay={showOverlay} overlayOpacity={alpha} />
        <View style={{ marginTop: 8 }}>
          <Text>Saliency strength</Text>
          <Slider
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            value={alpha}
            onValueChange={setAlpha}
            minimumTrackTintColor="#6366f1"
            maximumTrackTintColor="#e5e7eb"
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Embeddings</Text>
          <View style={styles.togglePills}>
            <Pressable onPress={() => setViewMode('all')} style={[styles.pill, viewMode === 'all' && styles.pillActive]}>
              <Text style={[styles.pillText, viewMode === 'all' && styles.pillTextActive]}>All</Text>
            </Pressable>
            <Pressable onPress={() => setViewMode('neighbors')} style={[styles.pill, viewMode === 'neighbors' && styles.pillActive]}>
              <Text style={[styles.pillText, viewMode === 'neighbors' && styles.pillTextActive]}>Neighbors</Text>
            </Pressable>
          </View>
        </View>
        {viewMode === 'all' ? (
          <ZoomableEmbeddingScatter highlightId={result.id} title="Embeddings (all recent)" />
        ) : (
          <ZoomableEmbeddingScatter highlightId={result.id} title="Embeddings (neighbors)" points={neighborPoints} />
        )}
      </View>

      <View style={[styles.card, styles.frontCard]}>
        <FeedbackPrompt predictionId={result.id} suggestedLabels={suggestions} />
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  hero: { paddingTop: 36, paddingBottom: 16, paddingHorizontal: 16, borderRadius: 12 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  card: { padding: 12, backgroundColor: '#fff', borderRadius: 12, gap: 12, borderColor: '#e5e7eb', borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  frontCard: { zIndex: 10, elevation: 4 },
  togglePills: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 999, padding: 4, gap: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillActive: { backgroundColor: '#e0e7ff' },
  pillText: { color: '#334155', fontWeight: '600' },
  pillTextActive: { color: '#0f172a' },
});
