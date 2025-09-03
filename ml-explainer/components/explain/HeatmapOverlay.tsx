import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';

export default function HeatmapOverlay({
  originalUri,
  overlayDataUri,
  showOverlay,
  overlayOpacity,
}: {
  originalUri: string;
  overlayDataUri: string;
  showOverlay: boolean;
  overlayOpacity: number;
}) {
  return (
    <View>
      <Text style={styles.title}>Grad-CAM</Text>
      <View style={styles.container} pointerEvents="box-none">
        <Image source={{ uri: originalUri }} style={styles.image} contentFit="contain" pointerEvents="none" />
        {showOverlay && (
          <Image
            source={{ uri: overlayDataUri }}
            style={[styles.image, styles.overlay, { opacity: overlayOpacity }]}
            contentFit="contain"
            tintColor={undefined}
            pointerEvents="none"
          />
        )}
      </View>
      <Text style={styles.caption}>Red areas contributed most to this prediction.</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>What you're seeing</Text>
        <Text style={styles.infoText}>• Grad-CAM highlights image regions that most influenced the top class.</Text>
        <Text style={styles.infoText}>• Brighter red = stronger influence; gray/clear = less influence.</Text>
        <Text style={styles.infoText}>• Use the slider to change overlay strength. This is an attribution heatmap, not a segmentation mask.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  container: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0b1220',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: { ...StyleSheet.absoluteFillObject },
  overlay: {},
  caption: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  infoBox: { marginTop: 8, backgroundColor: '#f8fafc', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 },
  infoTitle: { fontWeight: '700' },
  infoText: { color: '#475569', fontSize: 12 },
});
