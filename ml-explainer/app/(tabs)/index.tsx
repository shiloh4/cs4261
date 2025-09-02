import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { analyzeImageAsync } from '@/lib/api';
import { useAnalysis } from '@/context/AnalysisContext';

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
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
      const result = await analyzeImageAsync(imageUri);
      setAnalysis(imageUri, result);
      router.push('/result');
    } catch (e: any) {
      Alert.alert('Analyze failed', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">VisionTags EDU</ThemedText>
      <ThemedText>Classify a photo and see why.</ThemedText>

      <View style={{ height: 16 }} />
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
      ) : (
        <View style={[styles.preview, styles.previewPlaceholder]}>
          <Text style={{ color: '#888' }}>No image selected</Text>
        </View>
      )}

      <View style={styles.row}>
        <Pressable style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Camera</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={pickFromLibrary}>
          <Text style={styles.buttonText}>Gallery</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.button, !imageUri && styles.buttonDisabled]} onPress={analyze} disabled={!imageUri || loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Analyze</Text>}
      </Pressable>

      <View style={{ height: 12 }} />
      <ThemedText type="defaultSemiBold">Privacy</ThemedText>
      <ThemedText>Your photo is sent to the backend for inference only.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  button: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
