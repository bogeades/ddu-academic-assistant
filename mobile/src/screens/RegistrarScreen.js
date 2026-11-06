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
  Modal,
} from 'react-native';
import api from '../services/api';
import { colors } from '../theme/colors';

export const RegistrarScreen = () => {
  // Tabs: 'students' | 'lecturer_assign' | 'register_lecturer'
  const [activeTab, setActiveTab] = useState('register_lecturer');
  const [students, setStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Direct Student Registration form state
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [newYear, setNewYear] = useState('1');
  const [newSem, setNewSem] = useState('1');
  const [newSection, setNewSection] = useState('A');
  const [registering, setRegistering] = useState(false);

  // Student Assignment form state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deptId, setDeptId] = useState('');
  const [academicYear, setAcademicYear] = useState('1');
  const [semester, setSemester] = useState('1');
  const [section, setSection] = useState('A');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Lecturer Assignment form state
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [courseDescription, setCourseDescription] = useState('');

  // Lecturer Registration Workflow State
  const [lecReqs, setLecReqs] = useState([]);
  const [loadingLecReqs, setLoadingLecReqs] = useState(false);
  const [showLecForm, setShowLecForm] = useState(false);
  const [submittingLec, setSubmittingLec] = useState(false);
  const [newLecturer, setNewLecturer] = useState({
    lecturerId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'Male',
    email: '',
    phoneNumber: '',
    departmentId: '',
    academicQualification: 'MSc',
    specialization: '',
    notes: '',
  });

  // Resubmit modal state
  const [resubmitTarget, setResubmitTarget] = useState(null);
  const [resubmitData, setResubmitData] = useState({});
  const [submittingResubmit, setSubmittingResubmit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuRes, lecRes, deptRes, courseRes] = await Promise.allSettled([
        api.get('/registrar/students'),
        api.get('/registrar/lecturers'),
        api.get('/registrar/departments').catch(() => api.get('/admin/departments')),
        api.get('/registrar/courses').catch(() => api.get('/admin/courses')),
      ]);

      const stuData = stuRes.status === 'fulfilled' ? (stuRes.value.data?.data || []) : [];
      const lecData = lecRes.status === 'fulfilled' ? (lecRes.value.data?.data || []) : [];
      const deptData = deptRes.status === 'fulfilled' ? (deptRes.value.data?.data || []) : [];
      const courseData = courseRes.status === 'fulfilled' ? (courseRes.value.data?.data || []) : [];

      setStudents(stuData);
      setLecturers(lecData);
      setDepartments(deptData);
      setCourses(courseData);

      if (deptData.length > 0) {
        if (!deptId) setDeptId(deptData[0]._id);
        if (!newDeptId) setNewDeptId(deptData[0]._id);
        setNewLecturer((prev) => ({
          ...prev,
          departmentId: prev.departmentId || deptData[0]._id,
        }));
      }
      if (courseData.length > 0 && !courseId) {
        setCourseId(courseData[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError('Could not load registrar records.');
    } finally {
      setLoading(false);
    }
  };

  const loadLecRequests = async () => {
    setLoadingLecReqs(true);
    try {
      const res = await api.get('/registrar/lecturer-registrations');
      setLecReqs(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load lecturer registrations:', err);
    } finally {
      setLoadingLecReqs(false);
    }
  };

  useEffect(() => {
    loadData();
    loadLecRequests();
  }, []);

  const handleRegisterLecturer = async () => {
    const { lecturerId, firstName, lastName, gender, email, phoneNumber, departmentId, academicQualification } = newLecturer;
    if (!lecturerId.trim() || !firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim()) {
      return Alert.alert('Required Fields', 'Please complete Lecturer ID, First Name, Last Name, Email, and Phone.');
    }
    const targetDept = departmentId || departments[0]?._id;
    if (!targetDept) {
      return Alert.alert('Department Required', 'Please select an academic department.');
    }

    setSubmittingLec(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('/registrar/register-lecturer', {
        ...newLecturer,
        lecturerId: lecturerId.trim().toUpperCase(),
        departmentId: targetDept,
      });

      const refId = res.data?.data?.referenceId;
      Alert.alert(
        'Lecturer Registration Submitted!',
        `Reference ID: ${refId}\n\nSubmitted to System Administrator for review and approval.`
      );
      setMessage(`Lecturer ${firstName} ${lastName} submitted for Admin review (Ref: ${refId}).`);
      setShowLecForm(false);
      setNewLecturer({
        lecturerId: '',
        firstName: '',
        middleName: '',
        lastName: '',
        gender: 'Male',
        email: '',
        phoneNumber: '',
        departmentId: departments[0]?._id || '',
        academicQualification: 'MSc',
        specialization: '',
        notes: '',
      });
      loadLecRequests();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      Alert.alert('Registration Failed', msg);
      setError(msg);
    } finally {
      setSubmittingLec(false);
    }
  };

  const handleOpenResubmit = (item) => {
    setResubmitTarget(item);
    setResubmitData({
      firstName: item.firstName || '',
      middleName: item.middleName || '',
      lastName: item.lastName || '',
      gender: item.gender || 'Male',
      email: item.email || '',
      phoneNumber: item.phoneNumber || '',
      departmentId: item.department?._id || item.department || departments[0]?._id || '',
      academicQualification: item.academicQualification || 'MSc',
      specialization: item.specialization || '',
      notes: item.notes || '',
    });
  };

  const handleExecuteResubmit = async () => {
    if (!resubmitTarget) return;
    setSubmittingResubmit(true);
    try {
      await api.put(`/registrar/lecturer-registrations/${resubmitTarget._id}/resubmit`, resubmitData);
      Alert.alert('Request Resubmitted', 'Corrected lecturer request has been resubmitted to Administrator for review.');
      setResubmitTarget(null);
      loadLecRequests();
    } catch (err) {
      Alert.alert('Resubmit Error', err.response?.data?.message || 'Failed to resubmit request.');
    } finally {
      setSubmittingResubmit(false);
    }
  };

  const handleRegisterStudent = async () => {
    if (!newName.trim() || !newEmail.trim() || !newStudentId.trim()) {
      return Alert.alert('Required Fields', 'Please fill in Name, Email, and Student ID.');
    }
    const targetDept = newDeptId || departments[0]?._id;
    if (!targetDept) {
      return Alert.alert('Department Required', 'Please select a department.');
    }

    setRegistering(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('/registrar/register-student', {
        name: newName.trim(),
        email: newEmail.trim(),
        studentId: newStudentId.trim(),
        departmentId: targetDept,
        academicYear: parseInt(newYear, 10),
        semester: parseInt(newSem, 10),
        section: newSection.trim().toUpperCase(),
      });

      Alert.alert('Student Registered', res.data.message || 'Placement submitted to Admin for approval!');
      setMessage(`Student ${newName} registered and submitted for Admin approval!`);
      setShowRegisterForm(false);
      setNewName('');
      setNewEmail('');
      setNewStudentId('');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      Alert.alert('Registration Failed', msg);
      setError(msg);
    } finally {
      setRegistering(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudent) return setError('Please select a student from the list.');
    if (!deptId) return setError('Please select a department.');
    if (!section.trim()) return setError('Please specify section (e.g. A, B, C).');

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await api.post('/registrar/assign-student', {
        studentId: selectedStudent._id,
        departmentId: deptId,
        academicYear: parseInt(academicYear, 10),
        semester: parseInt(semester, 10),
        section: section.trim().toUpperCase(),
      });
      setMessage(`Student assignment for ${selectedStudent.name} submitted to Admin for approval!`);
      setSelectedStudent(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit student assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignLecturer = async () => {
    if (!selectedLecturer) return setError('Please select a lecturer.');
    if (!courseId) return setError('Please select a course.');
    if (!deptId) return setError('Please select a department.');
    if (!section.trim()) return setError('Please specify section (e.g. A, B, C).');

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await api.post('/registrar/assign-lecturer', {
        lecturerId: selectedLecturer._id,
        courseId,
        departmentId: deptId,
        academicYear: parseInt(academicYear, 10),
        semester: parseInt(semester, 10),
        section: section.trim().toUpperCase(),
        courseDescription: courseDescription.trim() || undefined,
      });
      setMessage(`Lecturer assignment for ${selectedLecturer.name} submitted to Admin for approval!`);
      setSelectedLecturer(null);
      setCourseDescription('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit lecturer assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Registrar Office</Text>
      <Text style={styles.headerSubtitle}>
        Lecturer Registration, Academic Placement & Teaching Assignment
      </Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'register_lecturer' && styles.tabBtnActive]}
          onPress={() => { setActiveTab('register_lecturer'); setMessage(''); setError(''); }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'register_lecturer' && styles.tabBtnTextActive]}>
            Register Lecturer ({lecReqs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'students' && styles.tabBtnActive]}
          onPress={() => { setActiveTab('students'); setMessage(''); setError(''); }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'students' && styles.tabBtnTextActive]}>
            Student Placement
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'lecturer_assign' && styles.tabBtnActive]}
          onPress={() => { setActiveTab('lecturer_assign'); setMessage(''); setError(''); }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'lecturer_assign' && styles.tabBtnTextActive]}>
            Assign Course
          </Text>
        </TouchableOpacity>
      </View>

      {message ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* TAB 1: LECTURER REGISTRATION & REQUEST TRACKING */}
      {activeTab === 'register_lecturer' && (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>LECTURER ONBOARDING WORKFLOW</Text>
            <TouchableOpacity
              style={[styles.smallActionBtn, showLecForm && styles.smallActionBtnActive]}
              onPress={() => setShowLecForm(!showLecForm)}
            >
              <Text style={[styles.smallActionBtnText, showLecForm && styles.smallActionBtnTextActive]}>
                {showLecForm ? '✕ Close Form' : '+ Register New Lecturer'}
              </Text>
            </TouchableOpacity>
          </View>

          {showLecForm && (
            <View style={[styles.formCard, { borderColor: '#0b3954', borderWidth: 2, marginBottom: 16 }]}>
              <Text style={[styles.formCardTitle, { color: '#0b3954' }]}>
                👨‍🏫 Register Lecturer for Admin Approval
              </Text>

              <Text style={styles.label}>Lecturer ID (Unique University ID)</Text>
              <TextInput
                style={styles.input}
                value={newLecturer.lecturerId}
                onChangeText={(t) => setNewLecturer({ ...newLecturer, lecturerId: t.toUpperCase() })}
                placeholder="e.g. LEC/CS/101"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={newLecturer.firstName}
                    onChangeText={(t) => setNewLecturer({ ...newLecturer, firstName: t })}
                    placeholder="e.g. Abebe"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Middle Name</Text>
                  <TextInput
                    style={styles.input}
                    value={newLecturer.middleName}
                    onChangeText={(t) => setNewLecturer({ ...newLecturer, middleName: t })}
                    placeholder="e.g. Kebede"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={newLecturer.lastName}
                onChangeText={(t) => setNewLecturer({ ...newLecturer, lastName: t })}
                placeholder="e.g. Tadesse"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Gender</Text>
              <View style={styles.chipsRow}>
                {['Male', 'Female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, newLecturer.gender === g && styles.chipActive]}
                    onPress={() => setNewLecturer({ ...newLecturer, gender: g })}
                  >
                    <Text style={[styles.chipText, newLecturer.gender === g && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Official / Personal Email</Text>
              <TextInput
                style={styles.input}
                value={newLecturer.email}
                onChangeText={(t) => setNewLecturer({ ...newLecturer, email: t.trim() })}
                placeholder="e.g. abebe.kebede@ddu.edu.et"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={newLecturer.phoneNumber}
                onChangeText={(t) => setNewLecturer({ ...newLecturer, phoneNumber: t.trim() })}
                placeholder="+251911223344"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Department</Text>
              <View style={styles.chipsRow}>
                {departments.map((d) => (
                  <TouchableOpacity
                    key={d._id}
                    style={[styles.chip, newLecturer.departmentId === d._id && styles.chipActive]}
                    onPress={() => setNewLecturer({ ...newLecturer, departmentId: d._id })}
                  >
                    <Text style={[styles.chipText, newLecturer.departmentId === d._id && styles.chipTextActive]}>
                      {d.code} - {d.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Academic Qualification</Text>
              <View style={styles.chipsRow}>
                {['BSc', 'MSc', 'PhD', 'Professor'].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.chipSmall, newLecturer.academicQualification === q && styles.chipActive]}
                    onPress={() => setNewLecturer({ ...newLecturer, academicQualification: q })}
                  >
                    <Text style={[styles.chipText, newLecturer.academicQualification === q && styles.chipTextActive]}>
                      {q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Specialization</Text>
              <TextInput
                style={styles.input}
                value={newLecturer.specialization}
                onChangeText={(t) => setNewLecturer({ ...newLecturer, specialization: t })}
                placeholder="e.g. Distributed Computing & Security"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Notes for Reviewer (Optional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={newLecturer.notes}
                onChangeText={(t) => setNewLecturer({ ...newLecturer, notes: t })}
                placeholder="Optional notes or background information..."
                placeholderTextColor="#94a3b8"
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#0284c7', marginTop: 14 }]}
                onPress={handleRegisterLecturer}
                disabled={submittingLec}
              >
                {submittingLec ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit to Administrator for Approval</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>SUBMITTED REGISTRATION REQUESTS ({lecReqs.length})</Text>
          {loadingLecReqs ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : lecReqs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardTitle}>No Lecturer Requests Yet</Text>
              <Text style={styles.emptyCardSub}>
                Use the "+ Register New Lecturer" button above to submit an onboarding request.
              </Text>
            </View>
          ) : (
            lecReqs.map((req) => {
              const status = req.status || 'pending';
              const isPending = status === 'pending';
              const isApproved = status === 'approved';
              const isRejected = status === 'rejected';

              return (
                <View key={req._id} style={styles.reqCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.reqRef}>{req.referenceId || req._id.substring(0, 8)}</Text>
                    <View
                      style={[
                        styles.badge,
                        isPending && styles.badgePending,
                        isApproved && styles.badgeApproved,
                        isRejected && styles.badgeRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isPending && styles.badgeTextPending,
                          isApproved && styles.badgeTextApproved,
                          isRejected && styles.badgeTextRejected,
                        ]}
                      >
                        {status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reqName}>
                    {req.fullName || `${req.firstName} ${req.lastName}`} • {req.lecturerId}
                  </Text>
                  <Text style={styles.reqDetail}>
                    📧 {req.email} • 📞 {req.phoneNumber}
                  </Text>
                  <Text style={styles.reqDetail}>
                    🏛️ {req.department?.name || 'Department'} ({req.academicQualification || 'MSc'})
                  </Text>

                  {isRejected && req.rejectionReason && (
                    <View style={styles.rejectionBox}>
                      <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                      <Text style={styles.rejectionText}>{req.rejectionReason}</Text>
                      <TouchableOpacity
                        style={styles.resubmitBtn}
                        onPress={() => handleOpenResubmit(req)}
                      >
                        <Text style={styles.resubmitBtnText}>✏️ Correct & Resubmit Request</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isApproved && (
                    <Text style={styles.approvedNotice}>
                      ✅ Approved! Invitation email with OTP & temp password dispatched to lecturer.
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {/* TAB 2: STUDENT PLACEMENT */}
      {activeTab === 'students' && (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>STUDENT PLACEMENTS ({students.length})</Text>
            <TouchableOpacity
              style={[styles.smallActionBtn, showRegisterForm && styles.smallActionBtnActive]}
              onPress={() => setShowRegisterForm(!showRegisterForm)}
            >
              <Text style={[styles.smallActionBtnText, showRegisterForm && styles.smallActionBtnTextActive]}>
                {showRegisterForm ? '✕ Close' : '+ Register New Student'}
              </Text>
            </TouchableOpacity>
          </View>

          {showRegisterForm && (
            <View style={[styles.formCard, { marginBottom: 18, borderColor: '#0b3954', borderWidth: 2 }]}>
              <Text style={[styles.formCardTitle, { color: '#0b3954' }]}>
                📝 Onboard & Place New Student
              </Text>

              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Hawi Kebede"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Institutional / Student Email</Text>
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="student@ddu.edu.et"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Student ID</Text>
              <TextInput
                style={styles.input}
                value={newStudentId}
                onChangeText={setNewStudentId}
                placeholder="DDU1400807"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Department</Text>
              <View style={styles.chipsRow}>
                {departments.map((d) => (
                  <TouchableOpacity
                    key={d._id}
                    style={[styles.chip, newDeptId === d._id && styles.chipActive]}
                    onPress={() => setNewDeptId(d._id)}
                  >
                    <Text style={[styles.chipText, newDeptId === d._id && styles.chipTextActive]}>
                      {d.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Year</Text>
                  <View style={styles.chipsRow}>
                    {['1', '2', '3', '4'].map((y) => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.chipSmall, newYear === y && styles.chipActive]}
                        onPress={() => setNewYear(y)}
                      >
                        <Text style={[styles.chipText, newYear === y && styles.chipTextActive]}>
                          Y{y}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Semester</Text>
                  <View style={styles.chipsRow}>
                    {['1', '2'].map((sem) => (
                      <TouchableOpacity
                        key={sem}
                        style={[styles.chipSmall, newSem === sem && styles.chipActive]}
                        onPress={() => setNewSem(sem)}
                      >
                        <Text style={[styles.chipText, newSem === sem && styles.chipTextActive]}>
                          S{sem}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Section</Text>
              <View style={styles.chipsRow}>
                {['A', 'B', 'C', 'D'].map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    style={[styles.chipSmall, newSection === sec && styles.chipActive]}
                    onPress={() => setNewSection(sec)}
                  >
                    <Text style={[styles.chipText, newSection === sec && styles.chipTextActive]}>
                      Sec {sec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#16a34a', marginTop: 14 }]}
                onPress={handleRegisterStudent}
                disabled={registering}
              >
                {registering ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Register & Submit for Approval</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>SELECT STUDENT TO ASSIGN</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {students.length === 0 ? (
              <View style={[styles.personCard, { width: 260 }]}>
                <Text style={styles.personName}>No Students Found</Text>
                <Text style={styles.personSub}>Use button above to register</Text>
              </View>
            ) : (
              students.map((s) => {
                const isSelected = selectedStudent?._id === s._id;
                return (
                  <TouchableOpacity
                    key={s._id}
                    style={[styles.personCard, isSelected && styles.personCardSelected]}
                    onPress={() => setSelectedStudent(s)}
                  >
                    <Text style={styles.personName}>{s.name}</Text>
                    <Text style={styles.personSub}>{s.email}</Text>
                    <Text style={styles.personBadge}>
                      Status: {s.assignmentStatus || 'none'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {selectedStudent && (
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>
                Assign Placement for: <Text style={{ color: '#0284c7' }}>{selectedStudent.name}</Text>
              </Text>

              <Text style={styles.label}>Department</Text>
              <View style={styles.chipsRow}>
                {departments.map((d) => (
                  <TouchableOpacity
                    key={d._id}
                    style={[styles.chip, deptId === d._id && styles.chipActive]}
                    onPress={() => setDeptId(d._id)}
                  >
                    <Text style={[styles.chipText, deptId === d._id && styles.chipTextActive]}>
                      {d.name} ({d.code})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Academic Year</Text>
                  <View style={styles.chipsRow}>
                    {['1', '2', '3', '4'].map((y) => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.chipSmall, academicYear === y && styles.chipActive]}
                        onPress={() => setAcademicYear(y)}
                      >
                        <Text style={[styles.chipText, academicYear === y && styles.chipTextActive]}>
                          Y{y}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Semester</Text>
                  <View style={styles.chipsRow}>
                    {['1', '2'].map((sem) => (
                      <TouchableOpacity
                        key={sem}
                        style={[styles.chipSmall, semester === sem && styles.chipActive]}
                        onPress={() => setSemester(sem)}
                      >
                        <Text style={[styles.chipText, semester === sem && styles.chipTextActive]}>
                          Sem {sem}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Assigned Section</Text>
              <View style={styles.chipsRow}>
                {['A', 'B', 'C', 'D'].map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    style={[styles.chipSmall, section === sec && styles.chipActive]}
                    onPress={() => setSection(sec)}
                  >
                    <Text style={[styles.chipText, section === sec && styles.chipTextActive]}>
                      Sec {sec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAssignStudent}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit to Admin for Approval</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* TAB 3: LECTURER COURSE ASSIGNMENT */}
      {activeTab === 'lecturer_assign' && (
        <View>
          <Text style={styles.sectionTitle}>SELECT LECTURER TO ASSIGN</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {lecturers.length === 0 ? (
              <View style={[styles.personCard, { width: 260 }]}>
                <Text style={styles.personName}>No Lecturers Found</Text>
                <Text style={styles.personSub}>Faculty accounts will appear here</Text>
              </View>
            ) : (
              lecturers.map((l) => {
                const isSelected = selectedLecturer?._id === l._id;
                return (
                  <TouchableOpacity
                    key={l._id}
                    style={[styles.personCard, isSelected && styles.personCardSelected]}
                    onPress={() => setSelectedLecturer(l)}
                  >
                    <Text style={styles.personName}>{l.name}</Text>
                    <Text style={styles.personSub}>{l.email}</Text>
                    <Text style={styles.personBadge}>ID: {l.lecturerId || 'LEC/CS/101'}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {selectedLecturer && (
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>
                Assign Course for: <Text style={{ color: '#0284c7' }}>{selectedLecturer.name}</Text>
              </Text>

              <Text style={styles.label}>Select Course</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {courses.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginVertical: 6 }}>
                    No active courses found.
                  </Text>
                ) : (
                  courses.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.chip, courseId === c._id && styles.chipActive]}
                      onPress={() => setCourseId(c._id)}
                    >
                      <Text style={[styles.chipText, courseId === c._id && styles.chipTextActive]}>
                        {c.code}: {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <Text style={styles.label}>Department</Text>
              <View style={styles.chipsRow}>
                {departments.map((d) => (
                  <TouchableOpacity
                    key={d._id}
                    style={[styles.chip, deptId === d._id && styles.chipActive]}
                    onPress={() => setDeptId(d._id)}
                  >
                    <Text style={[styles.chipText, deptId === d._id && styles.chipTextActive]}>
                      {d.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Year</Text>
                  <View style={styles.chipsRow}>
                    {['1', '2', '3', '4'].map((y) => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.chipSmall, academicYear === y && styles.chipActive]}
                        onPress={() => setAcademicYear(y)}
                      >
                        <Text style={[styles.chipText, academicYear === y && styles.chipTextActive]}>
                          Y{y}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Semester</Text>
                  <View style={styles.chipsRow}>
                    {['1', '2'].map((sem) => (
                      <TouchableOpacity
                        key={sem}
                        style={[styles.chipSmall, semester === sem && styles.chipActive]}
                        onPress={() => setSemester(sem)}
                      >
                        <Text style={[styles.chipText, semester === sem && styles.chipTextActive]}>
                          Sem {sem}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Section</Text>
              <View style={styles.chipsRow}>
                {['A', 'B', 'C', 'ALL'].map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    style={[styles.chipSmall, section === sec && styles.chipActive]}
                    onPress={() => setSection(sec)}
                  >
                    <Text style={[styles.chipText, section === sec && styles.chipTextActive]}>
                      {sec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Custom Course Description / Syllabus (Optional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={courseDescription}
                onChangeText={setCourseDescription}
                placeholder="Optional custom syllabus description for this section..."
                placeholderTextColor="#94a3b8"
                multiline
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAssignLecturer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit to Admin for Approval</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Resubmit Modal */}
      <Modal visible={!!resubmitTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Resubmit Lecturer Request</Text>
            <Text style={styles.modalSub}>
              Ref: {resubmitTarget?.referenceId} • Reason: {resubmitTarget?.rejectionReason}
            </Text>

            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={resubmitData.firstName}
              onChangeText={(t) => setResubmitData({ ...resubmitData, firstName: t })}
            />

            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={resubmitData.lastName}
              onChangeText={(t) => setResubmitData({ ...resubmitData, lastName: t })}
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={resubmitData.email}
              onChangeText={(t) => setResubmitData({ ...resubmitData, email: t.trim() })}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={resubmitData.phoneNumber}
              onChangeText={(t) => setResubmitData({ ...resubmitData, phoneNumber: t.trim() })}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { minHeight: 50 }]}
              value={resubmitData.notes}
              onChangeText={(t) => setResubmitData({ ...resubmitData, notes: t })}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#64748b' }]}
                onPress={() => setResubmitTarget(null)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#0284c7' }]}
                onPress={handleExecuteResubmit}
                disabled={submittingResubmit}
              >
                {submittingResubmit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnText}>Resubmit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginTop: 10 },
  headerSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16, marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0b3954', borderColor: '#0b3954' },
  tabBtnText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  tabBtnTextActive: { color: '#ffffff' },
  successBox: { backgroundColor: '#d1fae5', padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: '#a7f3d0' },
  successText: { color: '#065f46', fontSize: 13, fontWeight: '600' },
  errorBox: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748b', letterSpacing: 0.5, marginBottom: 10 },
  formCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10 },
  formCardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipSmall: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  chipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  row: { flexDirection: 'row', gap: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0f172a' },
  smallActionBtn: { backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#bae6fd' },
  smallActionBtnActive: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  smallActionBtnText: { color: '#0369a1', fontSize: 12, fontWeight: 'bold' },
  smallActionBtnTextActive: { color: '#991b1b' },
  submitBtn: { backgroundColor: '#0b3954', height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  personCard: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, marginRight: 10, width: 190, borderWidth: 1, borderColor: '#e2e8f0' },
  personCardSelected: { borderColor: '#0284c7', borderWidth: 2, backgroundColor: '#f0f9ff' },
  personName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  personSub: { fontSize: 11, color: '#64748b', marginVertical: 3 },
  personBadge: { fontSize: 10, fontWeight: 'bold', color: '#0369a1', backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  emptyCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
  emptyCardSub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  reqCard: { backgroundColor: '#ffffff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  reqRef: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  reqName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginTop: 4 },
  reqDetail: { fontSize: 12, color: '#475569', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeApproved: { backgroundColor: '#d1fae5' },
  badgeRejected: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  badgeTextPending: { color: '#b45309' },
  badgeTextApproved: { color: '#047857' },
  badgeTextRejected: { color: '#b91c1c' },
  rejectionBox: { backgroundColor: '#fff1f2', padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#fecdd3' },
  rejectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#be123c' },
  rejectionText: { fontSize: 12, color: '#881337', marginTop: 2 },
  resubmitBtn: { backgroundColor: '#be123c', paddingVertical: 6, borderRadius: 6, marginTop: 8, alignItems: 'center' },
  resubmitBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  approvedNotice: { fontSize: 11, color: '#047857', fontWeight: '600', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalSub: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 12 },
  modalBtn: { flex: 1, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});