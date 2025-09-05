import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  // @ts-ignore expoConfig exists at runtime in Expo
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  'http://localhost:5050';

export type TopKItem = { label: string; p: number };
export type Neighbor = { x: number; y: number; thumb: string; label: string };
export type AnalysisResponse = {
  topk: TopKItem[];
  heatmap_png_b64: string;
  embedding: { x: number; y: number };
  neighbors: Neighbor[];
  id: string;
  model: string;
};

export async function analyzeImageAsync(
  uri: string,
  opts?: string | { user?: string; model?: string; signal?: AbortSignal; timeoutMs?: number }
): Promise<AnalysisResponse> {
  const filename = uri.split('/').pop() || 'image.jpg';
  const fallbackType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const form = new FormData();
  let user: string | undefined;
  let model: string | undefined;
  let signal: AbortSignal | undefined;
  let timeoutMs: number | undefined;
  if (typeof opts === 'string') {
    user = opts;
  } else if (opts) {
    user = opts.user;
    model = opts.model;
    signal = opts.signal;
    timeoutMs = opts.timeoutMs;
  }

  if (Platform.OS === 'web') {
    // On web, convert the URI (blob/data/file) to a Blob and append a File
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const file = new File([blob], filename, { type: blob.type || fallbackType });
    form.append('image', file);
  } else {
    form.append('image', {
      // @ts-ignore React Native FormData file
      uri,
      name: filename,
      type: fallbackType,
    });
  }

  if (model) form.append('model', model);

  const ctrl = new AbortController();
  const compositeSignal = mergeSignals(signal, ctrl.signal);
  let t: any;
  try {
    if (timeoutMs && timeoutMs > 0) {
      t = setTimeout(() => ctrl.abort(), timeoutMs);
    }
    const res = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(user ? { 'X-User': user } : {}),
        ...(model && Platform.OS === 'web' ? { 'X-Model': model } : {}),
      },
      body: form,
      signal: compositeSignal,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Analyze failed: ${res.status} ${txt}`);
    }
    return (await res.json()) as AnalysisResponse;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('Analyze request was canceled');
    }
    throw e;
  } finally {
    if (t) clearTimeout(t);
  }
}

export async function sendFeedbackAsync(predictionId: string, trueLabel: string, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ predictionId, trueLabel }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Feedback failed: ${res.status} ${txt}`);
    }
    return res.json();
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('Feedback request timed out. Check your connection and try again.');
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export type MetricsSummary = {
  counts: Record<string, number>;
  confusion: number[][];
  classes: string[];
};

export async function getMetricsSummaryAsync(): Promise<MetricsSummary> {
  const res = await fetch(`${API_URL}/metrics/summary`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Metrics failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as MetricsSummary;
}

export function getApiUrl() {
  return API_URL;
}

// Merge an external AbortSignal with our internal controller signal.
function mergeSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a) return b;
  if (!b) return a;
  const ctrl = new AbortController();
  function onAbort() {
    try {
      ctrl.abort();
    } catch {}
  }
  a.addEventListener('abort', onAbort);
  b.addEventListener('abort', onAbort);
  return ctrl.signal;
}

export type EmbeddingPoint = { id: string; x: number; y: number; label: string; thumb?: string };

export async function getEmbeddingPointsAsync(limit?: number): Promise<EmbeddingPoint[]> {
  const url = limit ? `${API_URL}/embeddings/points?limit=${encodeURIComponent(String(limit))}` : `${API_URL}/embeddings/points`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Embeddings failed: ${res.status} ${txt}`);
  }
  const data = (await res.json()) as { points: EmbeddingPoint[] };
  return data.points ?? [];
}
