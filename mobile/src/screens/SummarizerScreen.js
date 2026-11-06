import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api';
import { colors, touchTargets } from '../theme/colors';

export const SummarizerScreen = () => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleSummarize = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setSummary(null);

    try {
      const res = await api.post('/ai/summarize', {
        title: title.trim() || 'Mobile Lecture Summary',
        text: text.trim(),
      });
      setSummary(res.data.data);
    } catch (err) {
      alert('Summarization failed. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>AI Document Summarizer (FR-S04)</Text>
      <Text style={styles.subtitle}>Paste chapter excerpts or lecture notes for instant takeaways.</Text>

      <Text style={styles.label}>Summary Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Heuristic Search Algorithms"
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Lecture Content</Text>
      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
        value={text}
        onChangeText={setText}
        placeholder="Paste text here..."
        placeholderTextColor="#94a3b8"
        multiline
      />

      <TouchableOpacity
        style={styles.btn}
        onPress={handleSummarize}
        disabled={loading || !text.trim()}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Generate Summary</Text>}
      </TouchableOpacity>

      {summary && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{summary.title}</Text>
          <Text style={styles.summaryText}>{summary.summaryText}</Text>

          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.pointsHeader}>Key Principles:</Text>
              {summary.keyPoints.map((pt, idx) => (
                <Text key={idx} style={styles.bulletPoint}>• {pt}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 18 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  btn: {
    height: touchTargets.minButtonHeight,
    backgroundColor: colors.accent,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 30,
  },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#334155', lineHeight: 22 },
  pointsHeader: { fontSize: 14, fontWeight: 'bold', color: colors.primary, marginBottom: 6 },
  bulletPoint: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 4 },
});
