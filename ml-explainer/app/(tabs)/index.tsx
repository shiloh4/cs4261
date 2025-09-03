import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { analyzeImageAsync } from '@/lib/api';
import { useAnalysis } from '@/context/AnalysisContext';
import GradientButton from '@/components/ui/GradientButton';
import { Image as ExpoImage } from 'expo-image';
import ScreenTransition from '@/components/ui/ScreenTransition';
import SwipePager from '@/components/ui/SwipePager';

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [model, setModel] = useState<string>('resnet50');
  const router = useRouter();
  const { setAnalysis } = useAnalysis();

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera access.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
    }
  }

  async function analyze() {
    if (!imageUri) return;
    try {
      setLoading(true);
      const result = await analyzeImageAsync(imageUri, { model });
      setAnalysis(imageUri, result);
      router.push('/result');
    } catch (e: any) {
      Alert.alert('Analyze failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const availableModels: { key: string; label: string }[] = [
    { key: 'resnet50', label: 'ResNet50 (default)' },
    { key: 'mobilenet_v3_large', label: 'MobileNetV3 Large' },
    { key: 'mobilenet_v3_small', label: 'MobileNetV3 Small' },
    { key: 'efficientnet_b0', label: 'EfficientNet-B0' },
    { key: 'efficientnet_b3', label: 'EfficientNet-B3' },
    { key: 'convnext_tiny', label: 'ConvNeXt-Tiny' },
  ];

  const navigation = useNavigation<any>();

  return (
    <SwipePager onSwipeLeft={() => navigation.navigate('explore')}>
      <ScreenTransition direction="right">
        <LinearGradient colors={["#0ea5e9", "#6366f1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
          <Text style={styles.heroTitle}>VisionTags EDU</Text>
          <Text style={styles.heroSubtitle}>Classify a photo — and learn why</Text>
        </LinearGradient>
        <ThemedView style={styles.container}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
          ) : (
            <View style={[styles.preview, styles.previewPlaceholder]}>
              <Text style={{ color: '#94a3b8' }}>No image selected</Text>
            </View>
          )}

          <View style={styles.modelRow}>
            <Text style={styles.modelLabel}>Model</Text>
            <TouchableOpacity style={styles.modelPill} onPress={() => setModelPickerVisible(true)}>
              <Text style={styles.modelPillText} numberOfLines={1}>
                {availableModels.find((m) => m.key === model)?.label || model}
              </Text>
              <Text style={styles.modelPillChevron}>▾</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <GradientButton title="Camera" onPress={takePhoto} style={{ flex: 1 }} />
            <GradientButton title="Gallery" onPress={pickFromLibrary} style={{ flex: 1 }} colors={["#10b981", "#22d3ee"]} />
          </View>

        <GradientButton onPress={analyze} disabled={!imageUri || loading} colors={['#F5A434', '#D8457B']}>
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ExpoImage
                source={require('@/assets/Leaf scanning.gif')}
                style={{ width: 28, height: 28, borderRadius: 4 }}
                contentFit="contain"
              />
              <Text style={{ color: '#fff', fontWeight: '700' }}>Analyzing…</Text>
            </View>
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700' }}>Analyze</Text>
          )}
        </GradientButton>

        <Modal transparent animationType="fade" visible={modelPickerVisible} onRequestClose={() => setModelPickerVisible(false)}>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Choose model</Text>
              {availableModels.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.modelOption, model === m.key && styles.modelOptionActive]}
                  onPress={() => {
                    setModel(m.key);
                    setModelPickerVisible(false);
                  }}
                >
                  <Text style={[styles.modelOptionText, model === m.key && styles.modelOptionTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.modelOption, { marginTop: 8 }]} onPress={() => setModelPickerVisible(false)}>
                <Text style={styles.modelOptionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

          <View style={{ height: 12 }} />
          <ThemedText type="defaultSemiBold">Privacy</ThemedText>
          <ThemedText>Your photo is sent to the backend for inference only. We do not store or share your image.</ThemedText>
        </ThemedView>
      </ScreenTransition>
    </SwipePager>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  modelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  modelLabel: { color: '#334155', fontWeight: '600' },
  modelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 999 },
  modelPillText: { color: '#0f172a', maxWidth: 220 },
  modelPillChevron: { color: '#64748b' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  modalCard: { width: '90%', backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  modelOption: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f8fafc', marginTop: 6 },
  modelOptionActive: { backgroundColor: '#e0e7ff' },
  modelOptionText: { color: '#0f172a' },
  modelOptionTextActive: { fontWeight: '700' },
});
