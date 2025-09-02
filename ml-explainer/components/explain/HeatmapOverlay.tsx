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
      <View style={styles.container}>
        <Image source={{ uri: originalUri }} style={styles.image} contentFit="contain" />
        {showOverlay && (
          <Image
            source={{ uri: overlayDataUri }}
            style={[styles.image, styles.overlay, { opacity: overlayOpacity }]}
            contentFit="contain"
            tintColor={undefined}
          />
        )}
      </View>
      <Text style={styles.caption}>Red areas contributed most to this prediction.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  container: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#111',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: { ...StyleSheet.absoluteFillObject },
  overlay: {},
  caption: { color: '#6b7280', fontSize: 12, marginTop: 6 },
});
