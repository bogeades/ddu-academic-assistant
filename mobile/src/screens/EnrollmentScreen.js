import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../services/api';
import { colors, touchTargets } from '../theme/colors';

const CATALOG_COURSES = [
  {
    _id: 'c1',
    code: 'COSC2041',
    name: 'Data Structures and Algorithms',
    credits: 4,
    prerequisites: ['COSC1012'],
  },
  {
    _id: 'c2',
    code: 'COSC3072',
    name: 'Artificial Intelligence & Machine Learning',
    credits: 3,
    prerequisites: ['COSC2041'],
  },
  {
    _id: 'c3',
    code: 'COSC3081',
    name: 'Database Systems & Information Mgmt',
    credits: 4,
    prerequisites: ['COSC2041'],
  },
  {
    _id: 'c4',
    code: 'COSC4112',
    name: 'Computer & Network Security',
    credits: 3,
    prerequisites: ['COSC3081'],
  },
  {
    _id: 'c5',
    code: 'COSC3051',
    name: 'Operating Systems & Architecture',
    credits: 4,
    prerequisites: ['COSC2041'],
  },
];

export const EnrollmentScreen = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);

  const fetchEnrollments = async () => {
    try {
      const res = await api.get('/enrollments');
      setEnrollments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const handleEnroll = async (course) => {
    setEnrollingId(course._id);
    try {
      const res = await api.post('/enrollments', {
        courseId: course._id,
        semester: '2026-Semester-1',
      });
      Alert.alert('Enrolled!', res.data.message || `Successfully enrolled in ${course.code}!`);
      fetchEnrollments();
    } catch (err) {
      Alert.alert('Enrollment Error', err.response?.data?.message || 'Could not complete enrollment.');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleDrop = (enrollmentId, courseCode) => {
    Alert.alert(
      'Drop Course',
      `Are you sure you want to drop ${courseCode || 'this course'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Drop',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/enrollments/${enrollmentId}`);
              Alert.alert('Dropped', 'Course dropped successfully.');
              fetchEnrollments();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to drop course.');
            }
          },
        },
      ]
    );
  };

  const enrolledCodes = new Set(
    enrollments.map((e) => e.course?.code || '')
  );

  const totalCredits = enrollments.reduce(
    (sum, e) => sum + (e.course?.credits || 3),
    0
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Metric */}
      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>REGISTERED CREDITS</Text>
          <Text style={styles.summaryValue}>{totalCredits} ECTS</Text>
        </View>
        <View style={styles.divider} />
        <View>
          <Text style={styles.summaryLabel}>ENROLLED COURSES</Text>
          <Text style={styles.summaryValue}>{enrollments.length} Courses</Text>
        </View>
      </View>

      {/* Enrolled Courses Section */}
      <Text style={styles.sectionTitle}>MY REGISTERED COURSES</Text>
      {enrollments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No registered courses yet this semester.</Text>
        </View>
      ) : (
        enrollments.map((item) => (
          <View key={item._id} style={styles.enrolledCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.enrolledCode}>{item.course?.code || 'COSC'}</Text>
              <Text style={styles.enrolledName}>
                {item.course?.name || 'Computer Science Course'}
              </Text>
              <Text style={styles.enrolledCredits}>
                {item.course?.credits || 3} Credit Hours • Enrolled
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dropBtn}
              onPress={() => handleDrop(item._id, item.course?.code)}
            >
              <Text style={styles.dropBtnText}>Drop</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Available Catalog Section */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        AVAILABLE DEPARTMENT COURSES
      </Text>
      {CATALOG_COURSES.map((course) => {
        const isEnrolled = enrolledCodes.has(course.code);
        const isEnrolling = enrollingId === course._id;

        return (
          <View key={course._id} style={styles.catalogCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.catalogHeader}>
                <Text style={styles.catalogCode}>{course.code}</Text>
                <Text style={styles.creditBadge}>{course.credits} Credits</Text>
              </View>
              <Text style={styles.catalogName}>{course.name}</Text>
              <Text style={styles.prereqText}>
                Prerequisite: {course.prerequisites?.join(', ') || 'None'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.enrollBtn,
                isEnrolled ? styles.enrolledStatusBtn : null,
              ]}
              disabled={isEnrolled || isEnrolling}
              onPress={() => handleEnroll(course)}
            >
              {isEnrolling ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.enrollBtnText}>
                  {isEnrolled ? 'Enrolled' : 'Enroll'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' },
  summaryValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 10, letterSpacing: 0.5 },
  emptyCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  enrolledCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  enrolledCode: { fontSize: 12, fontWeight: 'bold', color: colors.accent },
  enrolledName: { fontSize: 15, fontWeight: 'bold', color: '#0b3954', marginVertical: 2 },
  enrolledCredits: { fontSize: 12, color: colors.textMuted },
  dropBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dropBtnText: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },
  catalogCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catalogHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  catalogCode: { fontSize: 12, fontWeight: 'bold', color: colors.primary },
  creditBadge: { fontSize: 10, backgroundColor: '#f1f5f9', color: colors.textMuted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catalogName: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  prereqText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  enrollBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  enrolledStatusBtn: { backgroundColor: '#94a3b8' },
  enrollBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});
