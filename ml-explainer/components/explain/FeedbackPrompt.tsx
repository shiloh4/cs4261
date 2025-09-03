import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
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
        <TouchableOpacity style={[styles.button, styles.yes, (sending || !suggestedLabels?.length) && styles.disabled]} onPress={onYes} disabled={sending || !suggestedLabels?.length} activeOpacity={0.8} hitSlop={6}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Yes</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.no, sending && styles.disabled]} onPress={() => setModalVisible(true)} disabled={sending} activeOpacity={0.8} hitSlop={6}>
          <Text style={styles.btnText}>No</Text>
        </TouchableOpacity>
      </View>
      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <View style={styles.modalCard} pointerEvents={sending ? 'none' : 'auto'}>
            <Text style={styles.modalTitle}>What was it?</Text>
            <View style={styles.suggestions}>
              {suggestedLabels.map((lbl) => (
                <TouchableOpacity key={lbl} style={styles.suggestion} onPress={() => setInput(lbl)} activeOpacity={0.8}>
                  <Text>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Enter correct label"
              style={styles.input}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={onSendTrue}
            />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.button, styles.no]} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.yes]} onPress={onSendTrue} disabled={sending} activeOpacity={0.8}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  disabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  modalCard: { width: '90%', backgroundColor: '#fff', padding: 16, borderRadius: 10, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestion: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#e5e7eb' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10 },
});
