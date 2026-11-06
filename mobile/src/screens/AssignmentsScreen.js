import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import api from '../services/api';
import { colors, touchTargets } from '../theme/colors';

export const AssignmentsScreen = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected assignment for view / submit
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [solutionText, setSolutionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/assignments');
      setAssignments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  const handleOpenAssignment = (item) => {
    setSelectedAssignment(item);
    setSolutionText(item.mySubmission?.solutionText || '');
  };

  const handleSubmitSolution = async () => {
    if (!solutionText.trim()) {
      return Alert.alert('Error', 'Please enter your solution or submission notes.');
    }

    setSubmitting(true);
    try {
      await api.post(`/assignments/${selectedAssignment._id}/submit`, {
        solutionText: solutionText.trim(),
      });
      Alert.alert('Success', 'Assignment submitted successfully to the course instructor!');
      setSelectedAssignment(null);
      fetchAssignments();
    } catch (err) {
      Alert.alert('Submission Error', err.response?.data?.message || 'Failed to submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => {
    const isSubmitted = Boolean(item.mySubmission || item.submitted);
    const isGraded = item.mySubmission?.grade !== undefined;
    const isPastDue = item.deadline && new Date(item.deadline) < new Date();

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenAssignment(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.courseTag}>{item.courseCode || item.course?.code || 'CS CORE'}</Text>
          <View
            style={[
              styles.badge,
              isGraded
                ? styles.badgeGraded
                : isSubmitted
                ? styles.badgeSubmitted
                : isPastDue
                ? styles.badgeOverdue
                : styles.badgePending,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isGraded
                  ? styles.textGraded
                  : isSubmitted
                  ? styles.textSubmitted
                  : isPastDue
                  ? styles.textOverdue
                  : styles.textPending,
              ]}
            >
              {isGraded
                ? `Graded: ${item.mySubmission.grade}/${item.maxScore || 100}`
                : isSubmitted
                ? 'Submitted'
                : isPastDue
                ? 'Overdue'
                : 'Pending'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.instructions} numberOfLines={2}>
          {item.instructions || item.description || 'No detailed instructions provided.'}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            Due: {item.deadline ? new Date(item.deadline).toLocaleDateString() : 'No deadline'}
          </Text>
          <Text style={styles.footerPoints}>Max: {item.maxScore || 100} pts</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Assignments Found</Text>
              <Text style={styles.emptyDesc}>You are currently caught up with all coursework.</Text>
            </View>
          }
        />
      )}

      {/* Submission Modal */}
      {selectedAssignment && (
        <Modal
          visible={Boolean(selectedAssignment)}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedAssignment(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalCourse}>{selectedAssignment.courseCode || 'CS Course'}</Text>
                  <Text style={styles.modalTitle}>{selectedAssignment.title}</Text>
                  <Text style={styles.modalMeta}>
                    Max Score: {selectedAssignment.maxScore || 100} pts • Due:{' '}
                    {selectedAssignment.deadline
                      ? new Date(selectedAssignment.deadline).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>INSTRUCTIONS & PROMPT</Text>
                  <Text style={styles.instructionBody}>
                    {selectedAssignment.instructions ||
                      selectedAssignment.description ||
                      'Please solve the assignment tasks according to course guidelines.'}
                  </Text>
                </View>

                {selectedAssignment.mySubmission?.grade !== undefined && (
                  <View style={styles.gradeBox}>
                    <Text style={styles.gradeTitle}>
                      Grade: {selectedAssignment.mySubmission.grade} / {selectedAssignment.maxScore || 100}
                    </Text>
                    {selectedAssignment.mySubmission.feedback && (
                      <Text style={styles.gradeFeedback}>
                        Feedback: {selectedAssignment.mySubmission.feedback}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>YOUR SUBMISSION</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={6}
                    placeholder="Type or paste your solution, algorithmic code, or submission notes here..."
                    value={solutionText}
                    onChangeText={setSolutionText}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSubmitSolution}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {selectedAssignment.mySubmission ? 'Update Submission' : 'Submit Assignment'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSelectedAssignment(null)}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseTag: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0b3954', marginBottom: 4 },
  instructions: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  footerText: { fontSize: 12, color: colors.textMuted },
  footerPoints: { fontSize: 12, fontWeight: 'bold', color: colors.primary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeSubmitted: { backgroundColor: '#e0f2fe' },
  badgeGraded: { backgroundColor: '#dcfce7' },
  badgeOverdue: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  textPending: { color: '#b45309' },
  textSubmitted: { color: '#0284c7' },
  textGraded: { color: '#16a34a' },
  textOverdue: { color: '#dc2626' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  emptyDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
  modalCourse: { fontSize: 12, fontWeight: 'bold', color: colors.accent, marginBottom: 2 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0b3954' },
  modalMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginBottom: 6 },
  instructionBody: { fontSize: 14, color: '#334155', lineHeight: 20 },
  gradeBox: {
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  gradeTitle: { fontSize: 14, fontWeight: 'bold', color: '#16a34a' },
  gradeFeedback: { fontSize: 13, color: '#15803d', marginTop: 4 },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    minHeight: 120,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    height: touchTargets.minButtonHeight,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelBtnText: { color: colors.textMuted, fontSize: 14 },
});
