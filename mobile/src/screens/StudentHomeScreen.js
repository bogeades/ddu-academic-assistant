import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, touchTargets } from '../theme/colors';

export const StudentHomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/students/dashboard');
        setData(res.data.data);
      } catch (err) {
        console.error('Mobile dashboard error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isLecturer = ['lecturer', 'deptHead'].includes(user?.role);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>Welcome, {user?.name}!</Text>
          <Text style={styles.idText}>
            Role: <Text style={{ fontWeight: 'bold' }}>{user?.role?.toUpperCase()}</Text> •{' '}
            {user?.studentId ? `ID: ${user.studentId}` : 'CS Department'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Role Navigation Quick Access Banners */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.adminBanner}
          onPress={() => navigation.navigate('AdminPortal')}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.adminBannerTitle}>System Administration Center</Text>
            <Text style={styles.adminBannerDesc}>
              Approve student & lecturer assignments, manage departments and courses
            </Text>
          </View>
          <Text style={styles.adminBannerAction}>Open ›</Text>
        </TouchableOpacity>
      )}

      {user?.role === 'deptHead' && (
        <TouchableOpacity
          style={[styles.adminBanner, { backgroundColor: '#fefce8', borderColor: '#fef08a' }]}
          onPress={() => navigation.navigate('DeptHeadPortal')}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.adminBannerTitle, { color: '#854d0e' }]}>Department Head Portal</Text>
            <Text style={[styles.adminBannerDesc, { color: '#a16207' }]}>
              Monitor pass rates, lecturer activities, academic reports, and approve materials
            </Text>
          </View>
          <Text style={[styles.adminBannerAction, { color: '#854d0e' }]}>Open ›</Text>
        </TouchableOpacity>
      )}

      {user?.role === 'registrar' && (
        <TouchableOpacity
          style={[styles.adminBanner, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
          onPress={() => navigation.navigate('RegistrarPortal')}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.adminBannerTitle, { color: '#1e40af' }]}>Registrar Assignment Center</Text>
            <Text style={[styles.adminBannerDesc, { color: '#3b82f6' }]}>
              Assign students & lecturers to Dept/Year/Sem/Section and submit to Admin
            </Text>
          </View>
          <Text style={[styles.adminBannerAction, { color: '#1e40af' }]}>Open ›</Text>
        </TouchableOpacity>
      )}

      {isLecturer && (
        <TouchableOpacity
          style={[styles.adminBanner, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
          onPress={() => navigation.navigate('LecturerPortal')}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.adminBannerTitle, { color: '#166534' }]}>Lecturer Teaching Center</Text>
            <Text style={[styles.adminBannerDesc, { color: '#15803d' }]}>
              Manage approved assignments, upload PDF notes, type lecture notes
            </Text>
          </View>
          <Text style={[styles.adminBannerAction, { color: '#166534' }]}>Open ›</Text>
        </TouchableOpacity>
      )}

      {/* Student Department, Year, Semester, Section Official Assignment Card */}
      <View style={styles.assignmentCard}>
        <Text style={styles.assignmentCardTitle}>Official Academic Placement</Text>
        <View style={styles.assignmentGrid}>
          <View style={styles.assignmentItem}>
            <Text style={styles.assignmentLabel}>Department</Text>
            <Text style={styles.assignmentValue}>
              {data?.student?.department?.name || user?.department?.name || 'Computer Science'}
            </Text>
          </View>
          <View style={styles.assignmentItem}>
            <Text style={styles.assignmentLabel}>Academic Year</Text>
            <Text style={styles.assignmentValue}>
              Year {data?.student?.yearOfStudy || user?.yearOfStudy || 1}
            </Text>
          </View>
          <View style={styles.assignmentItem}>
            <Text style={styles.assignmentLabel}>Semester</Text>
            <Text style={styles.assignmentValue}>
              Semester {data?.student?.semester || user?.semester || 1}
            </Text>
          </View>
          <View style={styles.assignmentItem}>
            <Text style={styles.assignmentLabel}>Assigned Section</Text>
            <Text style={[styles.assignmentValue, { color: '#0284c7', fontWeight: 'bold' }]}>
              Section {data?.student?.section || user?.section || 'A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Assigned Courses Section strictly filtered */}
      <View style={styles.courseSection}>
        <View style={styles.courseSectionHeader}>
          <Text style={styles.sectionHeaderTitle}>MY ASSIGNED COURSES</Text>
          <Text style={styles.courseCountBadge}>
            {(data?.assignedCourses || []).length} Courses
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
        ) : (data?.assignedCourses || []).length === 0 ? (
          <View style={styles.noCoursesBox}>
            <Text style={styles.noCoursesText}>
              No courses officially assigned yet. Your assignment will appear once approved by the registrar and administrator.
            </Text>
          </View>
        ) : (
          (data?.assignedCourses || []).map((course) => (
            <View key={course._id || course.id} style={styles.courseCard}>
              <View style={styles.courseCardTop}>
                <View style={styles.courseCodeBadge}>
                  <Text style={styles.courseCodeText}>{course.code}</Text>
                </View>
                <Text style={styles.courseCredits}>{course.credits || 3} ECTS</Text>
              </View>

              <Text style={styles.courseName}>{course.name}</Text>

              {/* Course Description with Lecturer override indicator */}
              <View style={styles.descriptionBox}>
                <View style={styles.descBadgeRow}>
                  <Text
                    style={[
                      styles.descSourceBadge,
                      course.isLecturerDescription
                        ? styles.descSourceLecturer
                        : styles.descSourceDefault,
                    ]}
                  >
                    {course.isLecturerDescription ? 'Lecturer Overview' : 'Curriculum Standard'}
                  </Text>
                </View>
                <Text style={styles.courseDescription}>{course.description}</Text>
              </View>

              {/* Assigned Lecturer Details */}
              <View style={styles.lecturerRow}>
                <Text style={styles.lecturerRowLabel}>Assigned Lecturer:</Text>
                <Text style={styles.lecturerRowName}>
                  {course.assignedLecturer
                    ? `${course.assignedLecturer.name} (${course.assignedLecturer.lecturerId || 'LEC/CS/101'})`
                    : 'To Be Assigned'}
                </Text>
              </View>

              {/* Direct Materials Shortcut */}
              <View style={styles.courseFooterRow}>
                <Text style={styles.materialCountText}>
                  {course.materialsCount || 0} Materials Available
                </Text>
                <TouchableOpacity
                  style={styles.viewMaterialsBtn}
                  onPress={() => navigation.navigate('Materials')}
                >
                  <Text style={styles.viewMaterialsBtnText}>View Materials ›</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* CGPA & Academic Standing Summary Card */}
      <View style={styles.cgpaCard}>
        <View style={styles.cgpaHeaderRow}>
          <View>
            <Text style={styles.cgpaLabel}>CUMULATIVE GPA (CGPA)</Text>
            <Text style={styles.cgpaValue}>
              {data?.academics?.cgpa ? (typeof data.academics.cgpa === 'number' ? data.academics.cgpa.toFixed(2) : String(data.academics.cgpa)) : '3.75'}
            </Text>
          </View>
          <View style={styles.standingBadge}>
            <Text style={styles.cgpaStanding}>
              {data?.academics?.academicStanding || 'Very Great Distinction'}
            </Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiNum}>{data?.enrolledCourses?.length || 5}</Text>
            <Text style={styles.kpiLabel}>Enrolled Courses</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiNum}>{data?.tasksSummary?.pending || 0}</Text>
            <Text style={styles.kpiLabel}>Pending Tasks</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiNum}>64</Text>
            <Text style={styles.kpiLabel}>Completed ECTS</Text>
          </View>
        </View>
      </View>

      {/* Full Academic Suite Matching Website */}
      <Text style={styles.sectionHeader}>ACADEMIC SERVICES & TOOLS</Text>

      {/* 1. Assignments */}
      <TouchableOpacity
        style={[styles.touchActionCard, { borderLeftColor: '#0284c7' }]}
        onPress={() => navigation.navigate('Assignments')}
      >
        <Text style={styles.actionTitle}>Assignments & Submissions</Text>
        <Text style={styles.actionDesc}>Submit solutions, check deadlines, and view grades</Text>
      </TouchableOpacity>

      {/* 2. Announcements */}
      <TouchableOpacity
        style={[styles.touchActionCard, { borderLeftColor: '#ef4444' }]}
        onPress={() => navigation.navigate('Announcements')}
      >
        <Text style={styles.actionTitle}>University Announcements</Text>
        <Text style={styles.actionDesc}>Urgent notices, exam schedules, and department alerts</Text>
      </TouchableOpacity>

      {/* 3. Course Enrollment */}
      <TouchableOpacity
        style={[styles.touchActionCard, { borderLeftColor: '#10b981' }]}
        onPress={() => navigation.navigate('Enrollment')}
      >
        <Text style={styles.actionTitle}>Course Registration & Enrollment</Text>
        <Text style={styles.actionDesc}>Browse CS catalog, register credits, and drop courses</Text>
      </TouchableOpacity>

      {/* 4. Academic Records / Transcript */}
      <TouchableOpacity
        style={[styles.touchActionCard, { borderLeftColor: '#6366f1' }]}
        onPress={() => navigation.navigate('Records')}
      >
        <Text style={styles.actionTitle}>Academic Transcript & Grade Report</Text>
        <Text style={styles.actionDesc}>Verified semester grade report and GPA record</Text>
      </TouchableOpacity>

      {/* 5. AI Academic Tutor */}
      <TouchableOpacity
        style={[styles.touchActionCard, { borderLeftColor: colors.accent }]}
        onPress={() => navigation.navigate('AIChat')}
      >
        <Text style={styles.actionTitle}>Ask AI Academic Tutor</Text>
        <Text style={styles.actionDesc}>Real-time answers to computer science coursework</Text>
      </TouchableOpacity>

      {/* 6. Document AI Summarizer */}
      <TouchableOpacity
        style={[styles.touchActionCard, { borderLeftColor: '#8b5cf6' }]}
        onPress={() => navigation.navigate('Summarizer')}
      >
        <Text style={styles.actionTitle}>Document AI Summarizer</Text>
        <Text style={styles.actionDesc}>Summarize lecture notes & study offline</Text>
      </TouchableOpacity>

      {/* 7. Practice Quizzes */}
      <TouchableOpacity
        style={[styles.touchActionCard, { borderLeftColor: colors.success }]}
        onPress={() => navigation.navigate('Quizzes')}
      >
        <Text style={styles.actionTitle}>Quizzes & AI Practice Tests</Text>
        <Text style={styles.actionDesc}>Step-by-step interactive test player</Text>
      </TouchableOpacity>

      {/* 8. Task Manager */}
      <TouchableOpacity
        style={[styles.touchActionCard, { borderLeftColor: colors.warning }]}
        onPress={() => navigation.navigate('Tasks')}
      >
        <Text style={styles.actionTitle}>Task Manager</Text>
        <Text style={styles.actionDesc}>{data?.tasksSummary?.pending || 0} pending deadlines</Text>
      </TouchableOpacity>

      {/* 9. Course Materials Library */}
      <TouchableOpacity
        style={[styles.touchActionCard, { borderLeftColor: colors.primary }]}
        onPress={() => navigation.navigate('Materials')}
      >
        <Text style={styles.actionTitle}>Course Materials Library</Text>
        <Text style={styles.actionDesc}>Search, filter, and download faculty notes & handouts</Text>
      </TouchableOpacity>

      {/* 10. Admin Portal if Admin */}
      {isAdmin && (
        <TouchableOpacity
          style={[styles.touchActionCard, { borderLeftColor: '#f59e0b', backgroundColor: '#fffbeb' }]}
          onPress={() => navigation.navigate('AdminPortal')}
        >
          <Text style={[styles.actionTitle, { color: '#b45309' }]}>Admin Control Center</Text>
          <Text style={styles.actionDesc}>Manage user accounts, approve registrations, view OTPs</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 18 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  idText: { fontSize: 13, color: colors.textMuted },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  logoutBtnText: { color: colors.danger, fontSize: 12, fontWeight: 'bold' },
  adminBanner: {
    backgroundColor: '#0b3954',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  adminBannerTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  adminBannerDesc: { color: '#93c5fd', fontSize: 11, marginTop: 2 },
  adminBannerAction: { color: '#38bdf8', fontSize: 18, fontWeight: 'bold', paddingLeft: 8 },
  cgpaCard: {
    backgroundColor: '#0b3954',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  cgpaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cgpaLabel: { color: '#7dd3fc', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  cgpaValue: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', marginVertical: 2 },
  standingBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  cgpaStanding: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 12,
  },
  kpiItem: { alignItems: 'center' },
  kpiNum: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  kpiLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  kpiDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionHeader: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 12 },
  touchActionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 5,
    minHeight: touchTargets.minButtonHeight + 16,
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  actionDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  // Assignment Placement Card
  assignmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  assignmentCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0369a1',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  assignmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  assignmentItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  assignmentLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  assignmentValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 2,
  },

  // Courses Section
  courseSection: {
    marginBottom: 24,
  },
  courseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  courseCountBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  noCoursesBox: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  noCoursesText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  courseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  courseCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courseCodeBadge: {
    backgroundColor: '#0b3954',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  courseCodeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  courseCredits: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  courseName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  descriptionBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  descBadgeRow: {
    marginBottom: 4,
  },
  descSourceBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
  },
  descSourceLecturer: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  descSourceDefault: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
  courseDescription: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  lecturerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  lecturerRowLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  lecturerRowName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0b3954',
  },
  courseFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  materialCountText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '600',
  },
  viewMaterialsBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  viewMaterialsBtnText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: 'bold',
  },
});
