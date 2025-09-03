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
import EmbeddingScatter from '@/components/explain/EmbeddingScatter';
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
        <EmbeddingScatter me={result.embedding} neighbors={result.neighbors} />
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
});
