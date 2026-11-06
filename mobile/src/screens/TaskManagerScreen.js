import React, { useState, useEffect } from 'react';
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

export const TaskManagerScreen = () => {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;

    try {
      // 3 days from now
      const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await api.post('/tasks', {
        title: newTitle.trim(),
        deadline: inThreeDays,
        priority: 'high',
      });
      setNewTitle('');
      fetchTasks();
    } catch (err) {
      alert('Failed to add task.');
    }
  };

  const handleToggle = async (task) => {
    try {
      await api.patch(`/tasks/${task._id}`, { completed: !task.completed });
      setTasks(tasks.map((t) => (t._id === task._id ? { ...t, completed: !t.completed } : t)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Academic Task Manager (FR-S06)</Text>

      {/* Add Task Input Row */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="New task title..."
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddTask}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        ) : tasks.length === 0 ? (
          <Text style={styles.emptyText}>No academic tasks recorded.</Text>
        ) : (
          tasks.map((t) => (
            <TouchableOpacity
              key={t._id}
              style={[styles.taskCard, t.completed && { opacity: 0.6 }]}
              onPress={() => handleToggle(t)}
            >
              <View style={[styles.checkbox, t.completed && styles.checkboxDone]}>
                {t.completed && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, t.completed && { textDecorationLine: 'line-through' }]}>
                  {t.title}
                </Text>
                <Text style={styles.dueText}>
                  Due: {new Date(t.deadline).toLocaleDateString()} • {t.priority?.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 18 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 14 },
  addRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1,
    height: touchTargets.minInputHeight,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  addBtn: {
    height: touchTargets.minInputHeight,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    minHeight: touchTargets.minButtonHeight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  taskTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  dueText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 30 },
});
