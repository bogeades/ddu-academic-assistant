import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export const LecturerScreen = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('grading'); // 'grading' | 'materials'

  // Courses and Assignments State
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Students & Grading State
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [gradeInputs, setGradeInputs] = useState({}); // { [enrollmentId]: { classwork, quiz, midterm, finalExam, feedback } }
  const [savingGrades, setSavingGrades] = useState(false);

  // Student Academic Info Modal
  const [selectedStudentInfo, setSelectedStudentInfo] = useState(null);
  const [loadingStudentInfo, setLoadingStudentInfo] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);

  // Note authoring state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [descriptionOverride, setDescriptionOverride] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch approved assigned courses
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await api.get('/lecturer/assigned-courses');
      const coursesData = res.data.data || [];
      setAssignedCourses(coursesData);
      if (coursesData.length > 0 && !selectedCourse) {
        setSelectedCourse(coursesData[0]);
        setDescriptionOverride(coursesData[0].courseDescription || '');
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      // Fallback to registrar assignments
      try {
        const regRes = await api.get('/registrar/lecturer-assignments');
        const mine = (regRes.data.data || []).filter(
          (a) => a.lecturer?._id === user?._id || a.lecturer?.email === user?.email
        );
        setAssignedCourses(mine);
        if (mine.length > 0 && !selectedCourse) {
          setSelectedCourse(mine[0]);
          setDescriptionOverride(mine[0].courseDescription || '');
        }
      } catch (fallbackErr) {
        setErrorMsg('Could not fetch teaching assignments.');
      }
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch students enrolled in the selected course
  const fetchStudents = async () => {
    if (!selectedCourse?.course?._id) return;
    setLoadingStudents(true);
    try {
      const params = {
        courseId: selectedCourse.course._id,
      };
      if (selectedSection !== 'ALL') params.section = selectedSection;
      if (studentSearch.trim()) params.search = studentSearch.trim();

      const res = await api.get('/lecturer/assigned-students', { params });
      const enrollmentList = res.data.data || [];
      setStudents(enrollmentList);

      // Pre-populate grade inputs from DB
      const initialGrades = {};
      enrollmentList.forEach((e) => {
        initialGrades[e._id] = {
          classwork: e.classworkScore != null ? String(e.classworkScore) : '',
          quiz: e.quizScore != null ? String(e.quizScore) : '',
          midterm: e.midtermScore != null ? String(e.midtermScore) : '',
          finalExam: e.finalExamScore != null ? String(e.finalExamScore) : '',
          feedback: e.lecturerFeedback || '',
        };
      });
      setGradeInputs(initialGrades);
    } catch (err) {
      console.error('Failed to fetch assigned students:', err);
      setErrorMsg(err.response?.data?.message || 'Could not load assigned students.');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents();
    }
  }, [selectedCourse, selectedSection]);

  const handleScoreChange = (enrollmentId, field, value) => {
    setGradeInputs((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...(prev[enrollmentId] || {}),
        [field]: value,
      },
    }));
  };

  // Helper to calculate total mark and letter grade
  const calculateTotalAndGrade = (input) => {
    const cw = parseFloat(input?.classwork || 0) || 0;
    const qz = parseFloat(input?.quiz || 0) || 0;
    const mid = parseFloat(input?.midterm || 0) || 0;
    const fin = parseFloat(input?.finalExam || 0) || 0;
    const total = Math.min(100, Math.round((cw + qz + mid + fin) * 10) / 10);

    let letter = 'F';
    if (total >= 90) letter = 'A+';
    else if (total >= 85) letter = 'A';
    else if (total >= 80) letter = 'A-';
    else if (total >= 75) letter = 'B+';
    else if (total >= 70) letter = 'B';
    else if (total >= 65) letter = 'B-';
    else if (total >= 60) letter = 'C+';
    else if (total >= 50) letter = 'C';
    else if (total >= 45) letter = 'C-';
    else if (total >= 40) letter = 'D';

    return { total, letter };
  };

  // Save draft or publish grades
  const handleSaveGrades = async (status) => {
    if (!selectedCourse?.course?._id) return;
    setSavingGrades(true);
    setErrorMsg('');
    setFeedbackMsg('');

    try {
      const gradesPayload = students.map((enrollment) => {
        const inp = gradeInputs[enrollment._id] || {};
        return {
          enrollmentId: enrollment._id,
          classworkScore: inp.classwork ? Number(inp.classwork) : undefined,
          quizScore: inp.quiz ? Number(inp.quiz) : undefined,
          midtermScore: inp.midterm ? Number(inp.midterm) : undefined,
          finalExamScore: inp.finalExam ? Number(inp.finalExam) : undefined,
          feedback: inp.feedback || undefined,
        };
      });

      const res = await api.post('/lecturer/grades', {
        courseId: selectedCourse.course._id,
        section: selectedCourse.section,
        gradingStatus: status,
        grades: gradesPayload,
      });

      const successNotice =
        status === 'published'
          ? `Grades published to ${res.data.count || students.length} students! Official records updated.`
          : `Draft marks saved privately for ${res.data.count || students.length} students.`;

      Alert.alert(status === 'published' ? 'Grades Published' : 'Draft Saved', successNotice);
      setFeedbackMsg(successNotice);
      fetchStudents();
    } catch (err) {
      Alert.alert('Grading Error', err.response?.data?.message || 'Failed to save grades.');
      setErrorMsg(err.response?.data?.message || 'Failed to save grades.');
    } finally {
      setSavingGrades(false);
    }
  };

  // View Student Academic Info
  const handleViewStudentInfo = async (studentUser) => {
    if (!studentUser?._id || !selectedCourse?.course?._id) return;
    setLoadingStudentInfo(true);
    setShowStudentModal(true);
    try {
      const res = await api.get(`/lecturer/student-academic-info/${studentUser._id}`, {
        params: { courseId: selectedCourse.course._id },
      });
      setSelectedStudentInfo(res.data.data);
    } catch (err) {
      Alert.alert('Access Error', err.response?.data?.message || 'Could not fetch student academic record.');
      setShowStudentModal(false);
    } finally {
      setLoadingStudentInfo(false);
    }
  };

  // Publish Lecture Notes
  const handlePublishNote = async () => {
    if (!selectedCourse) {
      return Alert.alert('Missing Course', 'Please select a course first.');
    }
    if (!noteTitle.trim()) {
      return Alert.alert('Missing Title', 'Please enter a title for the lecture notes.');
    }
    if (!noteContent.trim()) {
      return Alert.alert('Missing Content', 'Please type the note content.');
    }

    setPublishing(true);
    try {
      await api.post('/materials', {
        title: noteTitle.trim(),
        subject: selectedCourse.course?.name || 'Computer Science',
        courseCode: selectedCourse.course?.code || 'CS',
        courseId: selectedCourse.course?._id,
        department: selectedCourse.department?._id,
        academicYear: selectedCourse.academicYear || 1,
        semester: selectedCourse.semester || 1,
        section: selectedCourse.section || 'A',
        materialType: 'text',
        textContent: noteContent.trim(),
        courseDescriptionOverride: descriptionOverride.trim() || undefined,
        description: `Lecture notes by ${user?.name || 'Lecturer'}.`,
      });

      Alert.alert('Published', 'Lecture notes uploaded successfully for enrolled students.');
      setNoteTitle('');
      setNoteContent('');
    } catch (err) {
      Alert.alert('Publish Error', err.response?.data?.message || 'Failed to upload lecture notes.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Lecturer Teaching Center</Text>
      <Text style={styles.headerSubtitle}>
        Lecturer: <Text style={{ fontWeight: 'bold', color: '#0b3954' }}>{user?.name}</Text> • ID: {user?.lecturerId || 'LEC/CS/101'}
      </Text>

      {/* Tabs */}
      <View style={styles.tabScrollBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'grading' && styles.tabBtnActive]}
            onPress={() => setActiveTab('grading')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'grading' && styles.tabBtnTextActive]}>
              My Assigned Students & Grading
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'materials' && styles.tabBtnActive]}
            onPress={() => setActiveTab('materials')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'materials' && styles.tabBtnTextActive]}>
              Lecture Notes & Syllabus
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Course Selector Scroll */}
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.miniLabel}>SELECT APPROVED TEACHING COURSE:</Text>
        {loadingCourses ? (
          <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 8 }} />
        ) : assignedCourses.length === 0 ? (
          <View style={{ backgroundColor: '#f0f9ff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd', marginVertical: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0369a1' }}>No Approved Teaching Assignments Yet</Text>
            <Text style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              Your teaching course assignments are dispatched by the Registrar and approved by the University Administrator. Once approved, your courses and student rosters will appear here automatically.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 4 }}>
            {assignedCourses.map((c) => {
              const isSelected = selectedCourse?._id === c._id;
              return (
                <TouchableOpacity
                  key={c._id}
                  style={[styles.coursePill, isSelected && styles.coursePillSelected]}
                  onPress={() => {
                    setSelectedCourse(c);
                    setDescriptionOverride(c.courseDescription || '');
                  }}
                >
                  <Text style={[styles.coursePillCode, isSelected && styles.coursePillCodeSelected]}>
                    {c.course?.code || 'CS'} ({c.section || 'A'})
                  </Text>
                  <Text style={[styles.coursePillMeta, isSelected && styles.coursePillMetaSelected]}>
                    {c.enrolledCount != null ? `${c.enrolledCount} Students` : 'Section ' + (c.section || 'A')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {activeTab === 'grading' ? (
        /* GRADING & ASSIGNED STUDENTS TAB */
        <View style={{ flex: 1 }}>
          {/* Search & Section Filter Bar */}
          <View style={styles.filterRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search student ID or name..."
              placeholderTextColor="#94a3b8"
              value={studentSearch}
              onChangeText={setStudentSearch}
              onSubmitEditing={fetchStudents}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={fetchStudents}>
              <Text style={styles.searchBtnText}>Filter</Text>
            </TouchableOpacity>
          </View>

          {/* Action Header: Draft vs Publish Buttons */}
          <View style={styles.actionsBar}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnDraft]}
              onPress={() => handleSaveGrades('draft')}
              disabled={savingGrades}
            >
              {savingGrades ? (
                <ActivityIndicator color="#0369a1" size="small" />
              ) : (
                <Text style={styles.btnDraftText}>Save Draft Marks</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.btnPublish]}
              onPress={() => handleSaveGrades('published')}
              disabled={savingGrades}
            >
              {savingGrades ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.btnPublishText}>Publish Grades</Text>
              )}
            </TouchableOpacity>
          </View>

          {loadingStudents ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={students}
              keyExtractor={(item) => item._id}
              refreshing={loadingStudents}
              onRefresh={fetchStudents}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>
                    No students currently enrolled in {selectedCourse?.course?.code || 'this course'}.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const inp = gradeInputs[item._id] || {};
                const { total, letter } = calculateTotalAndGrade(inp);
                const isPublished = item.gradingStatus === 'published';

                return (
                  <View style={styles.studentCard}>
                    <View style={styles.studentCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{item.student?.name || 'Student'}</Text>
                        <Text style={styles.studentMeta}>
                          ID: <Text style={{ fontWeight: 'bold' }}>{item.student?.studentId || 'N/A'}</Text> • Sec: {item.section || item.student?.section || 'A'}
                        </Text>
                        <Text style={styles.studentDept}>
                          {item.student?.department?.name || 'Computer Science'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[styles.badge, isPublished ? styles.badgeActive : styles.badgePending]}>
                          <Text style={[styles.badgeText, isPublished ? styles.textActive : styles.textPending]}>
                            {(item.gradingStatus || 'DRAFT').toUpperCase()}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.viewInfoBtn}
                          onPress={() => handleViewStudentInfo(item.student)}
                        >
                          <Text style={styles.viewInfoBtnText}>View Info</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Score Inputs Grid: CW /10, Quiz /10, Mid /30, Final /50 */}
                    <View style={styles.scoreGrid}>
                      <View style={styles.scoreCol}>
                        <Text style={styles.scoreHeader}>CW (10)</Text>
                        <TextInput
                          style={styles.scoreInput}
                          keyboardType="numeric"
                          maxLength={4}
                          value={inp.classwork}
                          onChangeText={(v) => handleScoreChange(item._id, 'classwork', v)}
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>

                      <View style={styles.scoreCol}>
                        <Text style={styles.scoreHeader}>Quiz (10)</Text>
                        <TextInput
                          style={styles.scoreInput}
                          keyboardType="numeric"
                          maxLength={4}
                          value={inp.quiz}
                          onChangeText={(v) => handleScoreChange(item._id, 'quiz', v)}
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>

                      <View style={styles.scoreCol}>
                        <Text style={styles.scoreHeader}>Mid (30)</Text>
                        <TextInput
                          style={styles.scoreInput}
                          keyboardType="numeric"
                          maxLength={4}
                          value={inp.midterm}
                          onChangeText={(v) => handleScoreChange(item._id, 'midterm', v)}
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>

                      <View style={styles.scoreCol}>
                        <Text style={styles.scoreHeader}>Final (50)</Text>
                        <TextInput
                          style={styles.scoreInput}
                          keyboardType="numeric"
                          maxLength={4}
                          value={inp.finalExam}
                          onChangeText={(v) => handleScoreChange(item._id, 'finalExam', v)}
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>

                      <View style={[styles.scoreCol, styles.totalCol]}>
                        <Text style={styles.scoreHeader}>Total</Text>
                        <Text style={styles.totalVal}>{total}</Text>
                        <Text style={[styles.letterVal, letter === 'F' ? { color: '#dc2626' } : { color: '#16a34a' }]}>
                          {letter}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Student Academic Info Modal */}
          <Modal visible={showStudentModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Student Academic Profile</Text>

                {loadingStudentInfo ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                ) : selectedStudentInfo ? (
                  <ScrollView style={{ maxHeight: 380 }}>
                    <Text style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Full Name: </Text>
                      {selectedStudentInfo.student?.name}
                    </Text>
                    <Text style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Student ID: </Text>
                      {selectedStudentInfo.student?.studentId}
                    </Text>
                    <Text style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Department: </Text>
                      {selectedStudentInfo.student?.department?.name || 'Computer Science'}
                    </Text>
                    <Text style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Year & Semester: </Text>
                      Year {selectedStudentInfo.student?.yearOfStudy || 1}, Sem {selectedStudentInfo.student?.semester || 1} (Sec {selectedStudentInfo.student?.section || 'A'})
                    </Text>
                    <Text style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Current CGPA: </Text>
                      {selectedStudentInfo.academicRecord?.cumulativeGPA != null
                        ? selectedStudentInfo.academicRecord.cumulativeGPA.toFixed(2)
                        : '3.65'}
                    </Text>
                    <Text style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Academic Standing: </Text>
                      {selectedStudentInfo.academicRecord?.academicStanding || 'Good Standing'}
                    </Text>

                    <Text style={[styles.infoLabel, { marginTop: 12, marginBottom: 4 }]}>Enrolled Courses:</Text>
                    {(selectedStudentInfo.enrolledCourses || []).map((ec, idx) => (
                      <Text key={idx} style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}>
                        • {ec.course?.code}: {ec.course?.name} ({ec.course?.credits || 3} Cr)
                      </Text>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={{ fontSize: 13, color: '#64748b' }}>No details available.</Text>
                )}

                <TouchableOpacity
                  style={[styles.approveBtn, { marginTop: 16 }]}
                  onPress={() => setShowStudentModal(false)}
                >
                  <Text style={styles.approveBtnText}>Close Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      ) : (
        /* LECTURE NOTES & SYLLABUS TAB */
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Course Overview & Description</Text>
            <Text style={styles.cardSub}>
              Override default syllabus description for Section {selectedCourse?.section || 'A'}:
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
              multiline
              value={descriptionOverride}
              onChangeText={setDescriptionOverride}
              placeholder="Enter custom course explanation or instructions for this section..."
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Upload Lecture Notes (Text)</Text>
            <Text style={styles.cardSub}>
              Target: {selectedCourse?.course?.code} — Section {selectedCourse?.section}
            </Text>

            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="e.g. Chapter 4: Relational Database Design"
              placeholderTextColor="#94a3b8"
            />

            <TextInput
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top', marginBottom: 12 }]}
              multiline
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="Type or paste lecture note content here..."
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={handlePublishNote}
              disabled={publishing}
            >
              {publishing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.approveBtnText}>Publish Lecture Material</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 14 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginTop: 6 },
  headerSubtitle: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  tabScrollBox: { marginBottom: 10 },
  tabScroll: { flexDirection: 'row' },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#ffffff', borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  tabBtnActive: { backgroundColor: '#0b3954', borderColor: '#0b3954' },
  tabBtnText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  tabBtnTextActive: { color: '#ffffff' },
  miniLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748b', letterSpacing: 0.5 },
  coursePill: { backgroundColor: '#ffffff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  coursePillSelected: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  coursePillCode: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  coursePillCodeSelected: { color: '#ffffff' },
  coursePillMeta: { fontSize: 10, color: '#64748b' },
  coursePillMetaSelected: { color: '#e0f2fe' },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  searchInput: { flex: 1, height: 38, backgroundColor: '#ffffff', borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, fontSize: 12, color: '#0f172a' },
  searchBtn: { backgroundColor: '#0284c7', paddingHorizontal: 14, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  actionsBar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: { flex: 1, height: 38, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  btnDraft: { backgroundColor: '#f0f9ff', borderColor: '#0284c7' },
  btnDraftText: { color: '#0284c7', fontWeight: 'bold', fontSize: 12 },
  btnPublish: { backgroundColor: '#059669', borderColor: '#059669' },
  btnPublishText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  studentCard: { backgroundColor: '#ffffff', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  studentCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  studentName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  studentMeta: { fontSize: 11, color: '#475569', marginTop: 1 },
  studentDept: { fontSize: 11, color: '#64748b', marginTop: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 9, fontWeight: 'bold' },
  textActive: { color: '#15803d' },
  textPending: { color: '#b45309' },
  viewInfoBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#cbd5e1', marginTop: 4 },
  viewInfoBtnText: { fontSize: 10, fontWeight: '600', color: '#0f172a' },
  scoreGrid: { flexDirection: 'row', gap: 6, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  scoreCol: { flex: 1, alignItems: 'center' },
  totalCol: { flex: 1.2, backgroundColor: '#f8fafc', borderRadius: 6, paddingVertical: 4 },
  scoreHeader: { fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 2 },
  scoreInput: { width: '100%', height: 34, backgroundColor: '#f8fafc', borderRadius: 4, borderWidth: 1, borderColor: '#cbd5e1', textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#0b3954' },
  totalVal: { fontSize: 12, fontWeight: 'bold', color: '#0b3954' },
  letterVal: { fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#ffffff', borderRadius: 10, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0b3954', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 6 },
  infoRow: { fontSize: 12, color: '#334155', marginBottom: 6 },
  infoLabel: { fontWeight: 'bold', color: '#0b3954' },
  card: { backgroundColor: '#ffffff', borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#0b3954' },
  cardSub: { fontSize: 11, color: '#64748b', marginBottom: 8, marginTop: 2 },
  input: { backgroundColor: '#ffffff', borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', padding: 10, fontSize: 12, color: '#0f172a' },
  approveBtn: { backgroundColor: '#059669', height: 38, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  approveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  emptyBox: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
});
