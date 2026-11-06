import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import api from '../services/api';
import { colors } from '../theme/colors';

export const AdminScreen = () => {
  // Tabs: 'lecturer_requests' | 'users' | 'student_assignments' | 'lecturer_assignments' | 'departments' | 'logs'
  const [activeTab, setActiveTab] = useState('lecturer_requests');
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [lecturerAssignments, setLecturerAssignments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [lecturerRequests, setLecturerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Rejection modal state for Lecturer Requests
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchAllData = async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/admin/users', { params: { search } }),
        api.get('/registrar/students'),
        api.get('/registrar/lecturer-assignments'),
        api.get('/admin/departments'),
        api.get('/admin/courses'),
        api.get('/admin/logs'),
        api.get('/admin/lecturer-registrations'),
      ]);

      if (results[0].status === 'fulfilled') setUsers(results[0].value.data?.data || []);
      if (results[1].status === 'fulfilled') setStudents(results[1].value.data?.data || []);
      if (results[2].status === 'fulfilled') setLecturerAssignments(results[2].value.data?.data || []);
      if (results[3].status === 'fulfilled') setDepartments(results[3].value.data?.data || []);
      if (results[4].status === 'fulfilled') setCourses(results[4].value.data?.data || []);
      if (results[5].status === 'fulfilled') setLogs(results[5].value.data?.data || []);
      if (results[6].status === 'fulfilled') setLecturerRequests(results[6].value.data?.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Lecturer Registration Request Approval
  const handleApproveLecturerRequest = async (request) => {
    setProcessingId(request._id);
    try {
      const res = await api.post(`/admin/lecturer-registrations/${request._id}/approve`);
      const { tempPassword, otp } = res.data?.credentials || {};
      const emailStatus = res.data?.emailDelivered
        ? '✅ Invitation email dispatched to lecturer!'
        : `⚠️ Email note: ${res.data?.emailError || 'Offline mode'}`;

      Alert.alert(
        'Lecturer Approved & Account Created!',
        `Lecturer: ${request.fullName || `${request.firstName} ${request.lastName}`}\nID: ${request.lecturerId}\nEmail: ${request.email}\n\nTemporary Password: ${tempPassword}\n24-Hour OTP: ${otp}\n\nEmail Status:\n${emailStatus}`,
        [{ text: 'OK', onPress: fetchAllData }]
      );
    } catch (err) {
      Alert.alert('Approval Error', err.response?.data?.message || 'Failed to approve lecturer.');
    } finally {
      setProcessingId(null);
    }
  };

  // Lecturer Registration Request Rejection
  const openRejectModal = (request) => {
    setRejectTarget(request);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      return Alert.alert('Reason Required', 'Please explain why this registration is being rejected.');
    }
    setSubmittingReject(true);
    try {
      await api.post(`/admin/lecturer-registrations/${rejectTarget._id}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });
      Alert.alert('Request Rejected', 'The registrar has been notified and can correct & resubmit this record.');
      setRejectModalVisible(false);
      setRejectTarget(null);
      fetchAllData();
    } catch (err) {
      Alert.alert('Reject Error', err.response?.data?.message || 'Failed to reject request.');
    } finally {
      setSubmittingReject(false);
    }
  };

  // Resend Lecturer Invitation
  const handleResendLecturerInvite = async (request) => {
    setProcessingId(request._id);
    try {
      const res = await api.post(`/admin/lecturer-registrations/${request._id}/resend-invite`);
      Alert.alert(
        'Invitation Resent!',
        `A fresh 24-hour OTP and invitation email have been sent to ${request.email}.`,
        [{ text: 'OK', onPress: fetchAllData }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to resend invitation.');
    } finally {
      setProcessingId(null);
    }
  };

  // Student Assignment Approval
  const handleApproveStudentAssignment = async (student) => {
    setProcessingId(student._id);
    try {
      const res = await api.post(`/admin/student-assignments/${student._id}/approve`);
      const emailStatusText = res.data.emailDelivered
        ? '✅ Email dispatched successfully to student!'
        : `⚠️ Email not delivered (${res.data.emailError || 'Offline mode'}).`;

      Alert.alert(
        'Student Placement Approved!',
        `Student: ${student.name} (${student.email})\n\nTemporary Default Password: ${res.data.tempPassword}\nOne-Time OTP: ${res.data.otpCode}\n\nEmail Delivery:\n${emailStatusText}`,
        [{ text: 'OK', onPress: fetchAllData }]
      );
    } catch (err) {
      Alert.alert('Approval Error', err.response?.data?.message || 'Failed to approve student assignment.');
    } finally {
      setProcessingId(null);
    }
  };

  // Lecturer Assignment Approval
  const handleApproveLecturerAssignment = async (assignment) => {
    setProcessingId(assignment._id);
    try {
      await api.post(`/admin/lecturer-assignments/${assignment._id}/approve`);
      Alert.alert(
        'Lecturer Assignment Approved!',
        `Course: ${assignment.course?.code} - Section ${assignment.section}\nLecturer: ${assignment.lecturer?.name}\n\nNotification sent to instructor.`,
        [{ text: 'OK', onPress: fetchAllData }]
      );
    } catch (err) {
      Alert.alert('Approval Error', err.response?.data?.message || 'Failed to approve lecturer assignment.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveUser = async (user) => {
    setProcessingId(user._id);
    try {
      const res = await api.post(`/admin/users/${user._id}/approve`);
      const defPass = res.data?.defaultPassword || res.data?.tempPassword;
      const otp = res.data?.otpCode;
      const emailStatusText = res.data?.emailDelivered
        ? '✅ Email dispatched successfully!'
        : `⚠️ Email note: ${res.data?.emailError || 'Offline mode'}.`;

      Alert.alert(
        'User Approved!',
        `User: ${user.name} (${user.email})\n\nDefault Temporary Password: ${defPass}\nOne-Time OTP: ${otp}\n\n${emailStatusText}`,
        [{ text: 'OK', onPress: fetchAllData }]
      );
    } catch (err) {
      Alert.alert('Approval Error', err.response?.data?.message || 'Failed to approve user.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleResetCredentials = async (user) => {
    setProcessingId(user._id);
    try {
      const res = await api.post(`/admin/users/${user._id}/reset-credentials`);
      const defPass = res.data?.defaultPassword || res.data?.tempPassword;
      const otp = res.data?.otpCode;
      Alert.alert(
        'Credentials Reset!',
        `User: ${user.name} (${user.email})\n\nNew Default Password: ${defPass}\nNew One-Time OTP: ${otp}`,
        [{ text: 'OK', onPress: fetchAllData }]
      );
    } catch (err) {
      Alert.alert('Reset Error', err.response?.data?.message || 'Failed to reset credentials.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/admin/users/${user._id}/status`, { status: nextStatus });
      Alert.alert('Updated', `Account status set to ${nextStatus}.`);
      fetchAllData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status.');
    }
  };

  const pendingStudents = students.filter((s) => s.assignmentStatus === 'pending_approval');
  const pendingLecturers = lecturerAssignments.filter((l) => l.status === 'pending_approval');
  const pendingLecRequests = lecturerRequests.filter((r) => r.status === 'pending');

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>University Administration</Text>
      <Text style={styles.headerSubtitle}>Dire Dawa University Management & Approvals Portal</Text>

      {/* Tabs */}
      <View style={styles.tabScrollBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'lecturer_requests' && styles.tabBtnActive]}
            onPress={() => setActiveTab('lecturer_requests')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'lecturer_requests' && styles.tabBtnTextActive]}>
              Lecturer Requests ({pendingLecRequests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'users' && styles.tabBtnTextActive]}>
              Users ({users.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'student_assignments' && styles.tabBtnActive]}
            onPress={() => setActiveTab('student_assignments')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'student_assignments' && styles.tabBtnTextActive]}>
              Student Placements ({pendingStudents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'lecturer_assignments' && styles.tabBtnActive]}
            onPress={() => setActiveTab('lecturer_assignments')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'lecturer_assignments' && styles.tabBtnTextActive]}>
              Lecturer Placements ({pendingLecturers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'departments' && styles.tabBtnActive]}
            onPress={() => setActiveTab('departments')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'departments' && styles.tabBtnTextActive]}>
              Departments ({departments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'logs' && styles.tabBtnActive]}
            onPress={() => setActiveTab('logs')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'logs' && styles.tabBtnTextActive]}>
              Security Logs ({logs.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : activeTab === 'lecturer_requests' ? (
        /* LECTURER REGISTRATION REQUESTS TAB */
        <FlatList
          data={lecturerRequests}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No lecturer registration requests submitted yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPending = item.status === 'pending';
            const isApproved = item.status === 'approved';
            const isRejected = item.status === 'rejected';
            const isProcessing = processingId === item._id;

            return (
              <View style={[styles.card, isPending && styles.cardHighlight]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {item.fullName || `${item.firstName} ${item.lastName}`} • {item.lecturerId}
                    </Text>
                    <Text style={styles.cardSub}>Ref: {item.referenceId || item._id.substring(0, 8)}</Text>
                    <Text style={styles.cardMeta}>
                      📧 {item.email} • 📞 {item.phoneNumber}
                    </Text>
                    <Text style={styles.cardMeta}>
                      🏛️ {item.department?.name || 'Department'} ({item.academicQualification || 'MSc'})
                    </Text>
                    {item.specialization ? (
                      <Text style={styles.descSnippet}>Specialization: {item.specialization}</Text>
                    ) : null}
                    {item.notes ? (
                      <Text style={[styles.descSnippet, { backgroundColor: '#f1f5f9', color: '#475569' }]}>
                        Registrar Note: "{item.notes}"
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.badge,
                      isPending && styles.badgePending,
                      isApproved && styles.badgeActive,
                      isRejected && styles.badgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isPending && styles.textPending,
                        isApproved && styles.textActive,
                        isRejected && styles.textInactive,
                      ]}
                    >
                      {item.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {isRejected && (
                  <View style={styles.rejectionBox}>
                    <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                    <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
                  </View>
                )}

                {isPending && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.approveBtn, { flex: 1, backgroundColor: '#059669', marginTop: 0 }]}
                      onPress={() => handleApproveLecturerRequest(item)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.approveBtnText}>Approve & Send Invitation</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.toggleBtn, { flex: 0.6, borderColor: '#ef4444', backgroundColor: '#fef2f2', marginTop: 0 }]}
                      onPress={() => openRejectModal(item)}
                      disabled={isProcessing}
                    >
                      <Text style={[styles.toggleBtnText, { color: '#dc2626' }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isApproved && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: '#047857', fontWeight: '600', marginBottom: 6 }}>
                      {item.activationStatus === 'activated'
                        ? '✅ Account activated by lecturer.'
                        : '⏳ Account created; waiting for lecturer OTP verification.'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.toggleBtn, { borderColor: '#0284c7', backgroundColor: '#f0f9ff' }]}
                      onPress={() => handleResendLecturerInvite(item)}
                      disabled={isProcessing}
                    >
                      <Text style={[styles.toggleBtnText, { color: '#0284c7' }]}>Resend Invitation Email & OTP</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      ) : activeTab === 'users' ? (
        /* USERS TAB */
        <View style={{ flex: 1 }}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search user by name, email, or ID..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={fetchAllData}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={fetchAllData}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={users}
            keyExtractor={(item) => item._id}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No user accounts found.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSub}>{item.email}</Text>
                    <Text style={styles.cardMeta}>
                      Role: <Text style={{ fontWeight: 'bold' }}>{item.role}</Text> • ID: {item.studentId || item.lecturerId || 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgePending]}>
                    <Text style={[styles.badgeText, item.status === 'active' ? styles.textActive : styles.textPending]}>
                      {item.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {(item.otpCode || item.tempPassword) && (
                  <View style={[styles.otpBox, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                    {item.tempPassword && (
                      <Text style={{ fontSize: 12, color: '#b91c1c', fontFamily: 'monospace' }}>
                        Default Pass: <Text style={{ fontWeight: 'bold' }}>{item.tempPassword}</Text>
                      </Text>
                    )}
                    {item.otpCode && (
                      <Text style={{ fontSize: 12, color: '#0369a1', fontFamily: 'monospace' }}>
                        Active OTP: <Text style={{ fontWeight: 'bold' }}>{item.otpCode}</Text>
                      </Text>
                    )}
                  </View>
                )}

                {item.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.approveBtn, { marginBottom: 8 }]}
                    onPress={() => handleApproveUser(item)}
                    disabled={processingId === item._id}
                  >
                    {processingId === item._id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.approveBtnText}>Approve & Send Default Password + OTP</Text>
                    )}
                  </TouchableOpacity>
                )}

                {item.status === 'active' && (
                  <TouchableOpacity
                    style={[styles.toggleBtn, { borderColor: '#0284c7', backgroundColor: '#f0f9ff', marginBottom: 8 }]}
                    onPress={() => handleResetCredentials(item)}
                    disabled={processingId === item._id}
                  >
                    <Text style={[styles.toggleBtnText, { color: '#0284c7' }]}>
                      Resend Default Password + OTP
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.toggleBtn, item.status === 'active' ? styles.btnDeactivate : styles.btnActivate]}
                  onPress={() => handleToggleUserStatus(item)}
                >
                  <Text style={[styles.toggleBtnText, item.status === 'active' ? styles.textDeactivate : styles.textActivate]}>
                    {item.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      ) : activeTab === 'student_assignments' ? (
        /* STUDENT ASSIGNMENTS APPROVAL TAB */
        <FlatList
          data={students}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No student placements found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPending = item.assignmentStatus === 'pending_approval';
            const isProcessing = processingId === item._id;

            return (
              <View style={[styles.card, isPending && styles.cardHighlight]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSub}>{item.email}</Text>
                    <Text style={styles.cardMeta}>
                      Assigned: {item.assignedDepartment?.name || item.department?.name || 'Computer Science'} • Year {item.assignedYear || item.yearOfStudy || 1} Sem {item.assignedSemester || item.semester || 1} Sec {item.assignedSection || item.section || 'A'}
                    </Text>
                  </View>
                  <View style={[styles.badge, isPending ? styles.badgePending : styles.badgeActive]}>
                    <Text style={[styles.badgeText, isPending ? styles.textPending : styles.textActive]}>
                      {item.assignmentStatus || 'none'}
                    </Text>
                  </View>
                </View>

                {isPending && (
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApproveStudentAssignment(item)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.approveBtnText}>Approve Placement & Send Temp Pass + OTP</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      ) : activeTab === 'lecturer_assignments' ? (
        /* LECTURER ASSIGNMENTS APPROVAL TAB */
        <FlatList
          data={lecturerAssignments}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No lecturer placements found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPending = item.status === 'pending_approval';
            const isProcessing = processingId === item._id;

            return (
              <View style={[styles.card, isPending && styles.cardHighlight]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.course?.code}: {item.course?.name}</Text>
                    <Text style={styles.cardSub}>Lecturer: {item.lecturer?.name} ({item.lecturer?.lecturerId || 'LEC/CS/101'})</Text>
                    <Text style={styles.cardMeta}>
                      {item.department?.name || 'CS'} • Year {item.academicYear} Sem {item.semester} • Section {item.section}
                    </Text>
                    {item.courseDescription ? (
                      <Text style={styles.descSnippet}>Custom Overview: "{item.courseDescription}"</Text>
                    ) : null}
                  </View>
                  <View style={[styles.badge, isPending ? styles.badgePending : styles.badgeActive]}>
                    <Text style={[styles.badgeText, isPending ? styles.textPending : styles.textActive]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                {isPending && (
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApproveLecturerAssignment(item)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.approveBtnText}>Approve Assignment & Notify Lecturer</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      ) : activeTab === 'departments' ? (
        /* DEPARTMENTS TAB */
        <FlatList
          data={departments}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No departments found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name} ({item.code})</Text>
                  <Text style={styles.cardSub}>{item.faculty || 'Institute of Technology'}</Text>
                  <Text style={styles.cardMeta}>
                    Status: {item.isActive ? 'Active' : 'Deactivated'}
                  </Text>
                </View>
                <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, item.isActive ? styles.textActive : styles.textInactive]}>
                    {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        /* SECURITY LOGS TAB */
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id || String(Math.random())}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No security audit logs recorded yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: '#0b3954' }]}>{item.action}</Text>
                  <Text style={styles.cardSub}>
                    User: {item.user?.email || item.user?.name || 'System / Public'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    IP: {item.ip || '127.0.0.1'} • {new Date(item.timestamp || item.createdAt).toLocaleString()}
                  </Text>
                  {item.details && (
                    <Text style={[styles.descSnippet, { marginTop: 6 }]}>
                      {typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}
                    </Text>
                  )}
                </View>
                <View style={[styles.badge, item.status === 'success' ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, item.status === 'success' ? styles.textActive : styles.textInactive]}>
                    {(item.status || 'INFO').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Reject Reason Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Lecturer Registration</Text>
            <Text style={styles.modalSub}>
              Lecturer: {rejectTarget?.fullName || `${rejectTarget?.firstName} ${rejectTarget?.lastName}`} ({rejectTarget?.lecturerId})
            </Text>

            <Text style={styles.label}>Mandatory Reason for Rejection:</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="e.g. Qualification document missing, invalid phone number, department mismatch..."
              placeholderTextColor="#94a3b8"
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#64748b' }]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#dc2626' }]}
                onPress={handleConfirmReject}
                disabled={submittingReject}
              >
                {submittingReject ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnText}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginTop: 10 },
  headerSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 12, marginTop: 2 },
  tabScrollBox: { marginBottom: 14 },
  tabScroll: { flexDirection: 'row' },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#ffffff', borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  tabBtnActive: { backgroundColor: '#0b3954', borderColor: '#0b3954' },
  tabBtnText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  tabBtnTextActive: { color: '#ffffff' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, height: 42, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, fontSize: 13, color: '#0f172a' },
  searchBtn: { backgroundColor: '#0284c7', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHighlight: { borderColor: '#f59e0b', borderWidth: 1.5, backgroundColor: '#fffdfa' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardMeta: { fontSize: 11, color: '#334155', marginTop: 4 },
  descSnippet: { fontSize: 11, fontStyle: 'italic', color: '#0369a1', marginTop: 4, backgroundColor: '#f0f9ff', padding: 6, borderRadius: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  textActive: { color: '#15803d' },
  textPending: { color: '#b45309' },
  textInactive: { color: '#991b1b' },
  otpBox: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6, marginVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  approveBtn: { backgroundColor: '#059669', height: 40, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  approveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  toggleBtn: { height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 6, borderWidth: 1 },
  btnActivate: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  btnDeactivate: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  toggleBtnText: { fontSize: 12, fontWeight: '600' },
  emptyBox: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#64748b', fontSize: 14 },
  rejectionBox: { backgroundColor: '#fff1f2', padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#fecdd3' },
  rejectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#be123c' },
  rejectionText: { fontSize: 12, color: '#881337', marginTop: 2 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0f172a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalSub: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 12 },
  modalBtn: { flex: 1, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});