import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, BackHandler, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/ThemedView';
import { useAnalysis } from '@/context/AnalysisContext';
import { analyzeImageAsync, pingHealthAsync, resolveApiBase } from '@/lib/api';
import { notifyAnalysisDone } from '@/lib/notifications';

export default function AnalyzingScreen() {
  const { model } = useLocalSearchParams<{ model?: string }>();
  const router = useRouter();
  const { imageUri, setAnalysis } = useAnalysis();
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const externalAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!imageUri) {
      router.replace('/');
      return;
    }

    let alive = true;

    const controller = new AbortController();
    externalAbort.current = controller;
    (async () => {
      try {
        // Pick a reachable base (tries extra.apiUrl, fallbacks, localhost)
        try {
          await resolveApiBase({ signal: controller.signal, timeoutMs: 7000 });
        } catch {}
        // Wake the backend (cold start) before heavy request
        try {
          await pingHealthAsync({ signal: controller.signal, timeoutMs: 15000 });
        } catch {
          // Ignore and proceed — the analyze call might still work
        }
        const res = await analyzeImageAsync(imageUri!, { model: typeof model === 'string' ? model : undefined, signal: controller.signal, timeoutMs: 180000 });
        if (!alive) return;
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        try { await notifyAnalysisDone(res.model); } catch {}
        setAnalysis(imageUri!, res);
        router.replace('/result');
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to analyze image');
      }
    })();

    const back = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => {
      alive = false;
      try { controller.abort(); } catch {}
      back.remove();
    };
  }, [imageUri, model]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ExpoImage
          source={require('@/assets/Leaf scanning.gif')}
          style={styles.gif}
          contentFit="contain"
          accessibilityLabel="Analyzing animation"
        />
        <Text style={styles.title}>Analyzing…</Text>
        <Text style={styles.subtitle}>Generating predictions and explanations</Text>
        {!error ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : (
          <Text style={{ color: 'red', marginTop: 12 }}>{error}</Text>
        )}
      </View>
      <Pressable
        onPress={() => {
          setCanceling(true);
          try { externalAbort.current?.abort(); } catch {}
          router.replace('/');
        }}
        style={styles.cancelBtn}
        accessibilityRole="button"
      >
        <Text style={styles.cancelText}>{canceling ? 'Canceling…' : 'Cancel'}</Text>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 420, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#e5e7eb' },
  gif: { width: 160, height: 160, marginBottom: 12, borderRadius: 8 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#64748b', marginTop: 4 },
  cancelBtn: { 
    marginTop: 16, 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    borderWidth: 1,
    backgroundColor: 'red',
  },
  cancelText: { 
    color: '#fff', 
    fontWeight: '700' 
  },
});
