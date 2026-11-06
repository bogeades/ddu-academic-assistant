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

export const AIChatScreen = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your DDU AI Academic Tutor. Ask any question regarding your Computer Science coursework.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const questionText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: questionText }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/ask', { question: questionText });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.data.data.answer, source: res.data.data.source },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'External AI Gateway unreachable. Please check connection.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.chatScroll} contentContainerStyle={{ padding: 16 }}>
        {messages.map((m, idx) => (
          <View
            key={idx}
            style={[
              styles.bubble,
              m.role === 'user' ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text style={[styles.bubbleText, m.role === 'user' ? styles.userText : styles.botText]}>
              {m.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 8 }}>
              Analyzing question...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar with Large Touch Target */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask an academic question..."
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
          <Text style={styles.sendBtnText}>Ask</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chatScroll: { flex: 1 },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  botBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#ffffff' },
  botText: { color: colors.text },
  loadingBox: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: touchTargets.minInputHeight,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: {
    height: touchTargets.minInputHeight,
    paddingHorizontal: 20,
    backgroundColor: colors.accent,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});
