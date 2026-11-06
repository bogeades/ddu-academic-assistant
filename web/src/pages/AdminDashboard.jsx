import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users,
  Settings,
  Database,
  ShieldAlert,
  Activity,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Lock,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'settings' | 'backups' | 'logs' | 'ai'

  // Users State (FR-A02, FR-A03)
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Settings State (FR-A04)
  const [settings, setSettings] = useState({
    sessionTimeout: 120,
    registrationEnabled: true,
    materialApprovalRequired: false,
    maintenanceMode: false,
    passwordPolicy: { minLength: 8, requireNumbers: true, requireUppercase: true, requireSymbols: false },
    emailSettings: {
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      smtpPass: '',
      emailFrom: 'Dire Dawa University <no-reply@ddu.edu.et>',
    },
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState('');

  // Backups State (FR-A05)
  const [backups, setBackups] = useState([]);
  const [backingUp, setBackingUp] = useState(false);

  // Security Logs State (FR-A06)
  const [logs, setLogs] = useState([]);

  // AI Health State (FR-A06)
  const [aiHealth, setAiHealth] = useState(null);

  // Assignments & Placements State (Requirement 1, 3, 4)
  const [students, setStudents] = useState([]);
  const [lecturerAssignments, setLecturerAssignments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [newDept, setNewDept] = useState({ name: '', code: '', faculty: 'Institute of Technology', description: '' });
  const [newCourse, setNewCourse] = useState({ code: '', name: '', description: '', credits: 3, department: '', yearLevel: 1, semester: 1 });
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);

  const [notice, setNotice] = useState('');

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/admin/users', { params: { search: userSearch } });
      setUsers(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      if (res.data.data) setSettings(res.data.data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await api.get('/admin/backups');
      setBackups(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/logs');
      setLogs(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  const fetchAIHealth = async () => {
    try {
      const res = await api.get('/ai/health').catch(() => api.get('/admin/ai-health'));
      setAiHealth(res.data.data);
    } catch (err) {
      console.error('Failed to load AI health:', err);
    }
  };

  const fetchAssignmentsData = async () => {
    try {
      const [stuRes, lecRes] = await Promise.all([
        api.get('/registrar/students'),
        api.get('/registrar/lecturer-assignments'),
      ]);
      setStudents(stuRes.data.data || []);
      setLecturerAssignments(lecRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartmentsAndCourses = async () => {
    try {
      const [dRes, cRes] = await Promise.all([
        api.get('/admin/departments'),
        api.get('/admin/courses'),
      ]);
      setDepartments(dRes.data.data || []);
      setCourses(cRes.data.data || []);
      if (dRes.data.data?.length > 0 && !newCourse.department) {
        setNewCourse((prev) => ({ ...prev, department: dRes.data.data[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'assignments') fetchAssignmentsData();
    if (activeTab === 'departments') fetchDepartmentsAndCourses();
    if (activeTab === 'settings') fetchSettings();
    if (activeTab === 'backups') fetchBackups();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'ai') fetchAIHealth();
  }, [activeTab]);

  // Handle Approve Student Placement (Requirement 1)
  const handleApproveStudentAssignment = async (student) => {
    try {
      const res = await api.post(`/admin/student-assignments/${student._id}/approve`);
      const emailStatusText = res.data.emailDelivered
        ? '✅ Email dispatched successfully to student!'
        : `⚠️ Email not delivered (${res.data.emailError || 'Offline/Mock mode'}). Please provide credentials directly to student.`;

      alert(
        `Student Placement Approved!\n\nStudent: ${student.name} (${student.email})\n\nTemporary Default Password: ${res.data.tempPassword}\nOne-Time OTP Code: ${res.data.otpCode}\n\nEmail Delivery:\n${emailStatusText}`
      );
      setNotice(`Student placement for ${student.email} approved. Temporary password: ${res.data.tempPassword} | OTP: ${res.data.otpCode}`);
      fetchAssignmentsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve student assignment.');
    }
  };

  // Handle Approve Lecturer Assignment (Requirement 3)
  const handleApproveLecturerAssignment = async (assignment) => {
    try {
      await api.post(`/admin/lecturer-assignments/${assignment._id}/approve`);
      alert(
        `Lecturer Assignment Approved!\n\nCourse: ${assignment.course?.code}\nLecturer: ${assignment.lecturer?.name}\n\nEmail notification sent to lecturer!`
      );
      setNotice(`Lecturer assignment for ${assignment.course?.code} approved.`);
      fetchAssignmentsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve lecturer assignment.');
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/departments', newDept);
      setShowAddDeptModal(false);
      setNewDept({ name: '', code: '', faculty: 'Institute of Technology', description: '' });
      setNotice('New academic department created successfully.');
      fetchDepartmentsAndCourses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create department.');
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/courses', newCourse);
      setShowAddCourseModal(false);
      setNewCourse({
        code: '',
        name: '',
        description: '',
        credits: 3,
        department: departments[0]?._id || '',
        yearLevel: 1,
        semester: 1,
      });
      setNotice('New course with default description registered successfully.');
      fetchDepartmentsAndCourses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create course.');
    }
  };

  // Handle User Status (FR-A02)
  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.patch(`/admin/users/${user._id}/status`, { status: nextStatus });
      const defPass = res.data?.defaultPassword || res.data?.tempPassword;
      const otp = res.data?.otpCode;
      if (defPass && otp) {
        alert(
          `User ${user.name} (${user.email}) Activated!\n\nDefault Temporary Password: ${defPass}\nOne-Time OTP Code: ${otp}\n\nBoth credentials dispatched to user email!`
        );
        setNotice(`User ${user.email} activated! Default Password: ${defPass} | OTP: ${otp}`);
      } else {
        setNotice(`User ${user.email} marked as ${nextStatus}.`);
      }
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  // Handle Approve User & Dispatch Default Password + OTP (FR-A02, FR-S01)
  const handleApproveUser = async (user) => {
    try {
      const res = await api.post(`/admin/users/${user._id}/approve`);
      const otp = res.data.otpCode;
      const defPass = res.data.defaultPassword || res.data.tempPassword;
      const emailStatusText = res.data.emailDelivered
        ? '✅ Email dispatched successfully to inbox!'
        : `⚠️ Email not delivered (${res.data.emailError || 'Offline/Mock mode'}). Please provide credentials directly to user.`;

      setNotice(`User ${user.email} approved! Default Password: ${defPass} | Verification OTP: ${otp}`);
      alert(
        `User ${user.name} (${user.email}) Approved!\n\nDefault Temporary Password: ${defPass}\nOne-Time Verification OTP: ${otp}\n\nEmail Status:\n${emailStatusText}`
      );
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve user.');
    }
  };

  // Handle Reset User Credentials (Default Password + OTP)
  const handleResetCredentials = async (user) => {
    if (!window.confirm(`Generate and dispatch a new default temporary password and one-time OTP to ${user.email}?`)) {
      return;
    }
    try {
      const res = await api.post(`/admin/users/${user._id}/reset-credentials`);
      const otp = res.data.otpCode;
      const defPass = res.data.defaultPassword || res.data.tempPassword;
      const emailStatusText = res.data.emailDelivered
        ? '✅ Email dispatched successfully to inbox!'
        : `⚠️ Email not delivered (${res.data.emailError || 'Offline/Mock mode'}). Please provide credentials directly to user.`;

      setNotice(`Credentials reset for ${user.email}! Default Password: ${defPass} | OTP: ${otp}`);
      alert(
        `Credentials Reset for ${user.name} (${user.email})!\n\nDefault Temporary Password: ${defPass}\nOne-Time Verification OTP: ${otp}\n\nEmail Status:\n${emailStatusText}`
      );
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset credentials.');
    }
  };

  // Handle Role Assignment (FR-A03)
  const handleAssignRole = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setNotice(`Assigned role ${newRole} successfully.`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign role.');
    }
  };

  // Handle Delete User (FR-A02)
  const handleDeleteUser = async (user) => {
    if (window.confirm(`Permanently delete account for ${user.email}? This cannot be undone.`)) {
      try {
        await api.delete(`/admin/users/${user._id}`);
        setNotice(`User account ${user.email} permanently removed.`);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete user.');
      }
    }
  };

  // Handle Update Settings (FR-A04)
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.put('/admin/settings', settings);
      setNotice('University system configuration and security policies saved.');
    } catch (err) {
      alert('Failed to update system settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Test SMTP connection (FR-A04, FR-S01)
  const handleTestSmtp = async () => {
    setTestingEmail(true);
    setTestEmailResult('');
    try {
      const res = await api.post('/admin/settings/test-email', settings.emailSettings || {});
      setTestEmailResult(res.data.message || 'SMTP connected successfully!');
    } catch (err) {
      setTestEmailResult(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  // Handle Trigger Manual Backup (FR-A05)
  const handleTriggerBackup = async () => {
    setBackingUp(true);
    try {
      const res = await api.post('/admin/backups/manual');
      setNotice(res.data.message || 'Database snapshot created successfully.');
      fetchBackups();
    } catch (err) {
      alert('Backup failed.');
    } finally {
      setBackingUp(false);
    }
  };

  // Handle Restore Backup (FR-A05)
  const handleRestoreBackup = async (backupId) => {
    if (window.confirm('WARNING: Restoring will overwrite current database records with snapshot state. Proceed?')) {
      try {
        const res = await api.post(`/admin/backups/${backupId}/restore`);
        alert(res.data.message || 'Database restored.');
      } catch (err) {
        alert('Restore failed.');
      }
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954' }}>
          System Administration & Governance (FR-A01 to FR-A06)
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          User lifecycle control, role assignment, database backups, security audit logs, and AI service health monitoring.
        </p>
      </div>

      {notice && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '12px', borderRadius: '6px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <CheckCircle size={18} />
          <span>{notice}</span>
        </div>
      )}

      {/* Admin Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('users')}
          className="btn-outline"
          style={{ background: activeTab === 'users' ? '#0b3954' : 'transparent', color: activeTab === 'users' ? '#ffffff' : '#0f172a' }}
        >
          <Users size={16} /> User Management
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className="btn-outline"
          style={{ background: activeTab === 'assignments' ? '#0b3954' : 'transparent', color: activeTab === 'assignments' ? '#ffffff' : '#0f172a' }}
        >
          <CheckCircle size={16} /> Assignment Approvals
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className="btn-outline"
          style={{ background: activeTab === 'departments' ? '#0b3954' : 'transparent', color: activeTab === 'departments' ? '#ffffff' : '#0f172a' }}
        >
          <Database size={16} /> Departments & Courses
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className="btn-outline"
          style={{ background: activeTab === 'settings' ? '#0b3954' : 'transparent', color: activeTab === 'settings' ? '#ffffff' : '#0f172a' }}
        >
          <Settings size={16} /> System Settings
        </button>
        <button
          onClick={() => setActiveTab('backups')}
          className="btn-outline"
          style={{ background: activeTab === 'backups' ? '#0b3954' : 'transparent', color: activeTab === 'backups' ? '#ffffff' : '#0f172a' }}
        >
          <Database size={16} /> Database Backups
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className="btn-outline"
          style={{ background: activeTab === 'logs' ? '#0b3954' : 'transparent', color: activeTab === 'logs' ? '#ffffff' : '#0f172a' }}
        >
          <ShieldAlert size={16} /> Security Logs
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className="btn-outline"
          style={{ background: activeTab === 'ai' ? '#0b3954' : 'transparent', color: activeTab === 'ai' ? '#ffffff' : '#0f172a' }}
        >
          <Activity size={16} /> AI Gateway Health
        </button>
      </div>

      {/* Tab: Assignment Approvals (Requirement 1, 3, 4) */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Student Assignments Approval Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', color: '#0b3954', margin: 0 }}>
                  Student Placements Pending Approval (Requirement 1)
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Approving generates a secure temporary default password and one-time OTP, auto-enrolls student into courses, and delivers credentials via email.
                </span>
              </div>
              <span className="badge badge-student">
                {students.filter((s) => s.assignmentStatus === 'pending_approval').length} Pending
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 16px' }}>Student</th>
                  <th style={{ padding: '10px 16px' }}>Department</th>
                  <th style={{ padding: '10px 16px' }}>Academic Class</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const isPending = s.assignmentStatus === 'pending_approval';
                  return (
                    <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {s.assignedDepartment?.name || s.department?.name || 'Computer Science'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        Year {s.assignedYear || s.yearOfStudy || 1} • Sem {s.assignedSemester || s.semester || 1} • Section {s.assignedSection || s.section || 'A'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: s.assignmentStatus === 'approved' ? '#dcfce7' : isPending ? '#fef3c7' : '#f1f5f9',
                            color: s.assignmentStatus === 'approved' ? '#15803d' : isPending ? '#b45309' : '#475569',
                          }}
                        >
                          {(s.assignmentStatus || 'none').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {isPending && (
                          <button
                            onClick={() => handleApproveStudentAssignment(s)}
                            className="btn-accent"
                            style={{ minHeight: '32px', padding: '4px 12px', fontSize: '12px' }}
                          >
                            Approve Placement & Send Credentials
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lecturer Teaching Assignments Approval Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', color: '#0b3954', margin: 0 }}>
                  Lecturer Teaching Assignments Pending Approval (Requirement 3)
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Approving activates the teaching assignment and sends an official notification email to the instructor with assignment details.
                </span>
              </div>
              <span className="badge badge-student">
                {lecturerAssignments.filter((l) => l.status === 'pending_approval').length} Pending
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 16px' }}>Lecturer</th>
                  <th style={{ padding: '10px 16px' }}>Course</th>
                  <th style={{ padding: '10px 16px' }}>Class Section</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lecturerAssignments.map((a) => {
                  const isPending = a.status === 'pending_approval';
                  return (
                    <tr key={a._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{a.lecturer?.name}</div>
                        <div style={{ fontSize: '11px', color: '#0284c7' }}>
                          ID: {a.lecturer?.lecturerId || 'LEC/CS/101'} • {a.lecturer?.email}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: '600' }}>{a.course?.code}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{a.course?.name}</div>
                        {a.courseDescription && (
                          <div style={{ fontSize: '11px', color: '#0369a1', fontStyle: 'italic', marginTop: '2px' }}>
                            "{a.courseDescription}"
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {a.department?.name || 'CS'} • Year {a.academicYear} Sem {a.semester} • Section {a.section}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: a.status === 'approved' ? '#dcfce7' : '#fef3c7',
                            color: a.status === 'approved' ? '#15803d' : '#b45309',
                          }}
                        >
                          {a.status?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {isPending && (
                          <button
                            onClick={() => handleApproveLecturerAssignment(a)}
                            className="btn-accent"
                            style={{ minHeight: '32px', padding: '4px 12px', fontSize: '12px' }}
                          >
                            Approve & Notify Lecturer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Departments & Courses Management (Requirement 5 & 6) */}
      {activeTab === 'departments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Departments */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', color: '#0b3954', margin: 0 }}>
                  Academic Departments ({departments.length})
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Dynamic departments stored in database. New departments can be added dynamically.
                </span>
              </div>
              <button onClick={() => setShowAddDeptModal(true)} className="btn-accent" style={{ fontSize: '12px', padding: '6px 12px' }}>
                + Add New Department
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 16px' }}>Code</th>
                  <th style={{ padding: '10px 16px' }}>Department Name</th>
                  <th style={{ padding: '10px 16px' }}>Faculty</th>
                  <th style={{ padding: '10px 16px' }}>Description</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0b3954' }}>{d.code}</td>
                    <td style={{ padding: '10px 16px', fontWeight: '600' }}>{d.name}</td>
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{d.faculty}</td>
                    <td style={{ padding: '10px 16px', color: '#475569', fontSize: '12px' }}>{d.description || 'N/A'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: d.isActive ? '#16a34a' : '#dc2626' }}>
                        {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Courses */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', color: '#0b3954', margin: 0 }}>
                  Curriculum Courses & Default Overviews ({courses.length})
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Default descriptions are displayed on student dashboards if no custom lecturer description is provided.
                </span>
              </div>
              <button onClick={() => setShowAddCourseModal(true)} className="btn-accent" style={{ fontSize: '12px', padding: '6px 12px' }}>
                + Add Course
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 16px' }}>Code</th>
                  <th style={{ padding: '10px 16px' }}>Name</th>
                  <th style={{ padding: '10px 16px' }}>Department</th>
                  <th style={{ padding: '10px 16px' }}>Year & Sem</th>
                  <th style={{ padding: '10px 16px' }}>Default Description</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0284c7' }}>{c.code}</td>
                    <td style={{ padding: '10px 16px', fontWeight: '600' }}>{c.name}</td>
                    <td style={{ padding: '10px 16px' }}>{c.department?.name || c.department?.code || 'CS'}</td>
                    <td style={{ padding: '10px 16px' }}>Year {c.yearLevel || c.academicYear || 1} Sem {c.semester || 1}</td>
                    <td style={{ padding: '10px 16px', color: '#475569', fontSize: '12px', maxWidth: '300px' }}>
                      {c.description || 'Standard syllabus module.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Department */}
      {showAddDeptModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', color: '#0b3954', marginBottom: '14px' }}>Create New Academic Department</h3>
            <form onSubmit={handleCreateDepartment}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Department Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  placeholder="e.g. Electrical Engineering"
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Department Code</label>
                <input
                  type="text"
                  className="input-field"
                  value={newDept.code}
                  onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                  placeholder="e.g. EE"
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Faculty / Institute</label>
                <input
                  type="text"
                  className="input-field"
                  value={newDept.faculty}
                  onChange={(e) => setNewDept({ ...newDept, faculty: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  placeholder="Department academic focus..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowAddDeptModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">Create Department</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Course */}
      {showAddCourseModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', color: '#0b3954', marginBottom: '14px' }}>Register New Course with Default Description</h3>
            <form onSubmit={handleCreateCourse}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Course Code</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    placeholder="e.g. COSC401"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Course Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    placeholder="e.g. Distributed Cloud Systems"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Department</label>
                  <select
                    className="input-field"
                    value={newCourse.department}
                    onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
                    required
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Year Level</label>
                  <select
                    className="input-field"
                    value={newCourse.yearLevel}
                    onChange={(e) => setNewCourse({ ...newCourse, yearLevel: Number(e.target.value) })}
                  >
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Semester</label>
                  <select
                    className="input-field"
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({ ...newCourse, semester: Number(e.target.value) })}
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Default Course Description / Overview (Requirement 6)
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  placeholder="System default syllabus description shown if lecturer does not provide custom overview..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowAddCourseModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">Register Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 1: User Management (FR-A02, FR-A03) */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', color: '#0b3954', margin: 0 }}>All User Accounts</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ width: '220px' }}
              />
              <button onClick={fetchUsers} className="btn-accent" style={{ minHeight: '38px', padding: '0 14px' }}>
                Search
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 16px' }}>Name</th>
                <th style={{ padding: '10px 16px' }}>Email</th>
                <th style={{ padding: '10px 16px' }}>Role (Assign)</th>
                <th style={{ padding: '10px 16px' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    {loadingUsers ? 'Loading user accounts...' : 'No user accounts found.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 16px', fontWeight: '600' }}>{u.name}</td>
                    <td style={{ padding: '10px 16px', color: '#475569' }}>{u.email}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleAssignRole(u._id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                      >
                        <option value="student">student</option>
                        <option value="lecturer">lecturer</option>
                        <option value="registrar">registrar</option>
                        <option value="deptHead">deptHead</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {u.status === 'pending' ? (
                        <span style={{ fontWeight: 'bold', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#fef3c7', color: '#b45309' }}>
                          PENDING APPROVAL
                        </span>
                      ) : (
                        <span style={{ fontWeight: 'bold', color: u.status === 'active' ? '#16a34a' : '#dc2626' }}>
                          {u.status.toUpperCase()}
                        </span>
                      )}
                      {(u.otpCode || u.tempPassword) && (
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {u.tempPassword && (
                            <span style={{ fontSize: '10px', background: '#fef2f2', color: '#991b1b', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace' }}>
                              Default Pass: {u.tempPassword}
                            </span>
                          )}
                          {u.otpCode && (
                            <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                              OTP: {u.otpCode}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {u.status === 'pending' ? (
                          <button
                            onClick={() => handleApproveUser(u)}
                            style={{
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            Approve & Send Pass + OTP
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleResetCredentials(u)}
                              className="btn-outline"
                              style={{ minHeight: '30px', padding: '2px 8px', fontSize: '11px', borderColor: '#0284c7', color: '#0284c7' }}
                              title="Generate and email fresh temporary password and one-time OTP"
                            >
                              Resend Pass + OTP
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className="btn-outline"
                              style={{ minHeight: '30px', padding: '2px 8px', fontSize: '11px' }}
                            >
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteUser(u)}
                          style={{ background: '#fee2e2', border: 'none', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: System Settings (FR-A04) */}
      {activeTab === 'settings' && (
        <div className="card" style={{ maxWidth: '650px' }}>
          <h2 style={{ fontSize: '18px', color: '#0b3954', marginBottom: '16px' }}>Global System Security Settings</h2>
          <form onSubmit={handleSaveSettings}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Session Timeout (Minutes)
              </label>
              <input
                type="number"
                className="input-field"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: Number(e.target.value) })}
                min="15"
                max="1440"
                required
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>JWT validity will dynamically scale with this timeout setting.</span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Minimum Password Length
              </label>
              <input
                type="number"
                className="input-field"
                value={settings.passwordPolicy?.minLength || 8}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    passwordPolicy: { ...settings.passwordPolicy, minLength: Number(e.target.value) },
                  })
                }
                min="6"
                max="32"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.registrationEnabled}
                  onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Student Self-Registration Enabled</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.materialApprovalRequired}
                  onChange={(e) => setSettings({ ...settings, materialApprovalRequired: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Require Department Head Material Approval Before Publishing (FR-DH05)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ color: '#b91c1c', fontWeight: 'bold' }}>Maintenance Mode (Lock non-admin access)</span>
              </label>
            </div>

            {/* Email & SMTP Configuration */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '15px', color: '#0b3954', marginBottom: '8px' }}>
                Automated Email & OTP Dispatch Service (SMTP)
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                Configure live SMTP credentials (e.g. Gmail with App Password, Outlook, or University Mail) to deliver actual OTP verification emails to registered student accounts.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    SMTP Server Host
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. smtp.gmail.com"
                    value={settings.emailSettings?.smtpHost || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailSettings: { ...settings.emailSettings, smtpHost: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Port
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="587"
                    value={settings.emailSettings?.smtpPort || 587}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailSettings: { ...settings.emailSettings, smtpPort: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    SMTP User / Email
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="your-email@gmail.com"
                    value={settings.emailSettings?.smtpUser || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailSettings: { ...settings.emailSettings, smtpUser: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    SMTP Password / App Password
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="••••••••••••••••"
                    value={settings.emailSettings?.smtpPass || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailSettings: { ...settings.emailSettings, smtpPass: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Sender Display (From)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder='Dire Dawa University <no-reply@ddu.edu.et>'
                  value={settings.emailSettings?.emailFrom || 'Dire Dawa University <no-reply@ddu.edu.et>'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emailSettings: { ...settings.emailSettings, emailFrom: e.target.value },
                    })
                  }
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  className="btn-outline"
                  disabled={testingEmail}
                  style={{ fontSize: '12px', padding: '6px 12px', minHeight: '34px' }}
                >
                  {testingEmail ? 'Testing SMTP...' : 'Test SMTP Connection'}
                </button>
                {testEmailResult && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: testEmailResult.startsWith('Error') ? '#dc2626' : '#16a34a',
                    }}
                  >
                    {testEmailResult}
                  </span>
                )}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save System Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Backups (FR-A05) */}
      {activeTab === 'backups' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>Database Backup & Disaster Recovery</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                Daily automatic backups run at 02:00 AM via node-cron. Manual backups can be triggered anytime.
              </p>
            </div>
            <button onClick={handleTriggerBackup} className="btn-accent" disabled={backingUp}>
              <Database size={16} />
              <span>{backingUp ? 'Creating Snapshot...' : 'Trigger Manual Backup'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {backups.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>No backups recorded yet.</p>
            ) : (
              backups.map((b) => (
                <div
                  key={b._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#0b3954' }}>{b.filename}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Type: <strong>{b.type.toUpperCase()}</strong> • Size: {(b.sizeBytes / 1024).toFixed(1)} KB • Date:{' '}
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleRestoreBackup(b._id)}
                      className="btn-outline"
                      style={{ minHeight: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RotateCcw size={13} /> Restore Snapshot
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Security Logs (FR-A06) */}
      {activeTab === 'logs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', color: '#0b3954', margin: 0 }}>Security Audit Trail Logs ({logs.length})</h2>
            <button
              onClick={fetchLogs}
              className="btn-outline"
              style={{ minHeight: '30px', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={13} /> Refresh Logs
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px 14px' }}>Timestamp</th>
                <th style={{ padding: '8px 14px' }}>Action</th>
                <th style={{ padding: '8px 14px' }}>User</th>
                <th style={{ padding: '8px 14px' }}>IP Address</th>
                <th style={{ padding: '8px 14px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No security audit logs recorded yet. Events like user registration, approvals, role assignments, and logins will appear here automatically.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{new Date(log.timestamp || log.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 'bold' }}>{log.action}</td>
                    <td style={{ padding: '8px 14px' }}>{log.user?.email || 'Public / Anon'}</td>
                    <td style={{ padding: '8px 14px', color: '#475569' }}>{log.ip}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ fontWeight: 'bold', color: log.status === 'success' ? '#16a34a' : '#dc2626' }}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: AI Gateway Health & Metrics (FR-A06, FR-AI05) */}
      {activeTab === 'ai' && (
        <div className="card" style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#0284c7" /> AI Gateway Service Health (FR-A06)
            </h2>
            <button
              onClick={fetchAIHealth}
              className="btn-outline"
              style={{ minHeight: '30px', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={13} /> Refresh
            </button>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>AI Provider:</span>
              <span style={{ fontWeight: 'bold', color: '#0b3954' }}>
                {(aiHealth?.provider || 'gemini').toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Active Model:</span>
              <span style={{ fontWeight: 'bold', color: '#0369a1' }}>
                {aiHealth?.model || 'gemini-1.5-flash'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Configured:</span>
              <span style={{ fontWeight: 'bold', color: aiHealth?.configured ? '#16a34a' : '#d97706' }}>
                {aiHealth?.configured ? 'Yes (API Key active)' : 'No (API Key missing or placeholder)'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Total Calls:</span>
              <span style={{ fontWeight: 'bold', color: '#0f172a' }}>
                {aiHealth?.totalCalls || 0}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Failures:</span>
              <span style={{ fontWeight: 'bold', color: (aiHealth?.failures || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                {aiHealth?.failures || 0}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Cache Hits:</span>
              <span style={{ fontWeight: 'bold', color: '#0284c7' }}>
                {aiHealth?.cacheHits || 0}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Average Latency:</span>
              <span style={{ fontWeight: 'bold', color: '#0f172a' }}>
                {aiHealth?.averageLatency !== undefined ? aiHealth.averageLatency : aiHealth?.latencyMs || 0} ms
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Last Error:</span>
              <span style={{ fontSize: '12px', color: aiHealth?.lastErrorMessage ? '#dc2626' : '#64748b', maxWidth: '300px', textAlign: 'right', wordBreak: 'break-word' }}>
                {aiHealth?.lastErrorMessage || 'None'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
