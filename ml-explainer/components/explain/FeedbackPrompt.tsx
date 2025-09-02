import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert } from 'react-native';
import { sendFeedbackAsync } from '@/lib/api';

export default function FeedbackPrompt({
  predictionId,
  suggestedLabels,
}: {
  predictionId: string;
  suggestedLabels: string[];
}) {
  const [asked, setAsked] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  async function onYes() {
    if (!suggestedLabels?.[0]) return;
    try {
      setSending(true);
      await sendFeedbackAsync(predictionId, suggestedLabels[0]);
      setAsked(true);
      Alert.alert('Thanks!', 'Your feedback was recorded.');
    } catch (e: any) {
      Alert.alert('Feedback failed', e?.message || String(e));
    } finally {
      setSending(false);
    }
  }

  async function onSendTrue() {
    if (!input.trim()) {
      setModalVisible(false);
      return;
    }
    try {
      setSending(true);
      await sendFeedbackAsync(predictionId, input.trim());
      setAsked(true);
      setModalVisible(false);
      Alert.alert('Thanks!', 'Your feedback was recorded.');
    } catch (e: any) {
      Alert.alert('Feedback failed', e?.message || String(e));
    } finally {
      setSending(false);
    }
  }

  if (asked) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Was this correct?</Text>
      <View style={styles.row}>
        <Pressable style={[styles.button, styles.yes]} onPress={onYes} disabled={sending}>
          <Text style={styles.btnText}>Yes</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.no]} onPress={() => setModalVisible(true)} disabled={sending}>
          <Text style={styles.btnText}>No</Text>
        </Pressable>
      </View>
      <Modal transparent animationType="fade" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>What was it?</Text>
            <View style={styles.suggestions}>
              {suggestedLabels.map((lbl) => (
                <Pressable key={lbl} style={styles.suggestion} onPress={() => setInput(lbl)}>
                  <Text>{lbl}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={input} onChangeText={setInput} placeholder="Enter correct label" style={styles.input} />
            <View style={styles.row}>
              <Pressable style={[styles.button, styles.no]} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.yes]} onPress={onSendTrue} disabled={sending}>
                <Text style={styles.btnText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12, marginTop: 4 },
  button: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  yes: { backgroundColor: '#16a34a' },
  no: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', backgroundColor: '#fff', padding: 16, borderRadius: 10, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestion: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#e5e7eb' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10 },
});

