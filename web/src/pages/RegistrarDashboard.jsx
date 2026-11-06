import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users,
  Search,
  Download,
  FileText,
  GraduationCap,
  Plus,
  CheckCircle,
  Eye,
  BookOpen,
  UserCheck,
  Send,
  UserPlus,
  X,
  ClipboardList,
  Award,
  Filter,
  Layers,
  AlertTriangle,
  Trash2,
  Printer,
  RefreshCw,
  Check,
  BookMarked,
  BarChart2,
} from 'lucide-react';

export const RegistrarDashboard = () => {
  // Tabs: 'student_placement' | 'lecturer_assignment' | 'course_enrollment' | 'academic_records' | 'official_reports'
  const [activeTab, setActiveTab] = useState('student_placement');
  const [students, setStudents] = useState([]);
  const [registrarStudents, setRegistrarStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturerAssignments, setLecturerAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Student Verification Search State (Requirement 2)
  const [verifySearchQuery, setVerifySearchQuery] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [verifySearched, setVerifySearched] = useState(false);

  // Direct Student Registration by Registrar (Requirement 2 & 4)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    studentId: '',
    departmentId: '',
    academicYear: '1',
    semester: '1',
    section: 'A',
  });
  const [registeringStudent, setRegisteringStudent] = useState(false);

  // Student Assignment Form (Requirement 2, 3, 4)
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignYear, setAssignYear] = useState('1');
  const [assignSem, setAssignSem] = useState('1');
  const [assignSection, setAssignSection] = useState('A');
  const [submittingStudent, setSubmittingStudent] = useState(false);

  // Lecturer Assignment Form (Requirement 3, 4, 6)
  const [assignLecturerId, setAssignLecturerId] = useState('');
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignLecDeptId, setAssignLecDeptId] = useState('');
  const [assignLecYear, setAssignLecYear] = useState('1');
  const [assignLecSem, setAssignLecSem] = useState('1');
  const [assignLecSection, setAssignLecSection] = useState('A');
  const [assignLecDesc, setAssignLecDesc] = useState('');
  const [submittingLecturer, setSubmittingLecturer] = useState(false);

  // Course Enrollment State (Requirement 5)
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);
  const [droppingEnrollmentId, setDroppingEnrollmentId] = useState(null);

  // Academic Records State (Requirement 7)
  const [recordStudentId, setRecordStudentId] = useState('');
  const [studentAcademicRecord, setStudentAcademicRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [targetStudentForGrade, setTargetStudentForGrade] = useState(null);
  const [semesterName, setSemesterName] = useState('Year 1 Semester 1');
  const [academicYearVal, setAcademicYearVal] = useState('2025/2026');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCredits, setCourseCredits] = useState('3');
  const [grade, setGrade] = useState('A');
  const [savingGrade, setSavingGrade] = useState(false);

  // Official Reports & Directory Filter State (Requirement 8)
  const [reportSearch, setReportSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterSem, setFilterSem] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedRosterCourseId, setSelectedRosterCourseId] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dirSettled, regStuSettled, lecSettled, deptSettled, courseSettled, assignSettled] =
        await Promise.allSettled([
          api.get('/reports/students'),
          api.get('/registrar/students'),
          api.get('/registrar/lecturers'),
          api.get('/registrar/departments').catch(() => api.get('/admin/departments')),
          api.get('/registrar/courses').catch(() => api.get('/admin/courses')),
          api.get('/registrar/lecturer-assignments'),
        ]);

      const dirData = dirSettled.status === 'fulfilled' ? (dirSettled.value.data?.data || []) : [];
      const regStuData = regStuSettled.status === 'fulfilled' ? (regStuSettled.value.data?.data || []) : [];
      const lecData = lecSettled.status === 'fulfilled' ? (lecSettled.value.data?.data || []) : [];
      const deptData = deptSettled.status === 'fulfilled' ? (deptSettled.value.data?.data || []) : [];
      const courseData = courseSettled.status === 'fulfilled' ? (courseSettled.value.data?.data || []) : [];
      const assignData = assignSettled.status === 'fulfilled' ? (assignSettled.value.data?.data || []) : [];

      setStudents(dirData);
      setRegistrarStudents(regStuData);
      setLecturers(lecData);
      setDepartments(deptData);
      setCourses(courseData);
      setLecturerAssignments(assignData);

      if (regStuData.length > 0) {
        if (!assignStudentId) setAssignStudentId(regStuData[0]._id);
        if (!enrollStudentId) setEnrollStudentId(regStuData[0]._id);
        if (!recordStudentId) setRecordStudentId(regStuData[0]._id);
      }
      if (deptData.length > 0) {
        if (!assignDeptId) setAssignDeptId(deptData[0]._id);
        if (!assignLecDeptId) setAssignLecDeptId(deptData[0]._id);
        setNewStudent((prev) => ({
          ...prev,
          departmentId: prev.departmentId || deptData[0]._id,
        }));
      }
      if (lecData.length > 0 && !assignLecturerId) {
        setAssignLecturerId(lecData[0]._id);
      }
      if (courseData.length > 0) {
        if (!assignCourseId) setAssignCourseId(courseData[0]._id);
        if (!selectedRosterCourseId) setSelectedRosterCourseId(courseData[0]._id);
        if (!courseCode) {
          setCourseCode(courseData[0].code);
          setCourseName(courseData[0].name);
          setCourseCredits(String(courseData[0].credits || 3));
        }
      }
    } catch (err) {
      console.error('Failed to load registrar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Fetch enrollments whenever the selected student changes in Course Enrollment tab
  useEffect(() => {
    if (enrollStudentId) {
      fetchStudentEnrollments(enrollStudentId);
    }
  }, [enrollStudentId]);

  // Fetch academic record whenever the selected student changes in Academic Records tab
  useEffect(() => {
    if (recordStudentId) {
      fetchStudentAcademicRecord(recordStudentId);
    }
  }, [recordStudentId]);

  const fetchStudentEnrollments = async (studentId) => {
    setLoadingEnrollments(true);
    try {
      const res = await api.get('/enrollments', { params: { studentId } });
      setStudentEnrollments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch enrollments for student:', err);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const fetchStudentAcademicRecord = async (studentId) => {
    setLoadingRecord(true);
    try {
      const res = await api.get(`/records/${studentId}`);
      setStudentAcademicRecord(res.data.data || null);
    } catch (err) {
      console.error('Failed to fetch academic record:', err);
    } finally {
      setLoadingRecord(false);
    }
  };

  // Student Verification Handler (Requirement 2)
  const handleVerifyStudent = (query) => {
    const q = (query || verifySearchQuery || '').trim().toLowerCase();
    if (!q) {
      setVerifiedStudent(null);
      setVerifySearched(false);
      return;
    }
    setVerifySearched(true);
    const found = registrarStudents.find(
      (s) =>
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
    setVerifiedStudent(found || null);
  };

  const handleApplyVerifiedToAssignment = (student) => {
    if (!student) return;
    setAssignStudentId(student._id);
    if (student.assignedDepartment?._id || student.department?._id) {
      setAssignDeptId(student.assignedDepartment?._id || student.department?._id);
    }
    if (student.assignedYear || student.yearOfStudy) {
      setAssignYear(String(student.assignedYear || student.yearOfStudy || 1));
    }
    if (student.assignedSemester || student.semester) {
      setAssignSem(String(student.assignedSemester || student.semester || 1));
    }
    if (student.assignedSection || student.section) {
      setAssignSection(student.assignedSection || student.section || 'A');
    }
    setNotice(`Student "${student.name}" loaded into academic placement form.`);
  };

  // Direct Student Registration Submit (Requirement 2 & 4)
  const handleRegisterStudentSubmit = async (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email || !newStudent.studentId || !newStudent.departmentId) {
      return alert('Please fill in Name, Email, Student ID, and Department.');
    }

    setRegisteringStudent(true);
    setError('');
    setNotice('');

    try {
      const res = await api.post('/registrar/register-student', {
        name: newStudent.name.trim(),
        email: newStudent.email.trim(),
        studentId: newStudent.studentId.trim(),
        departmentId: newStudent.departmentId,
        academicYear: parseInt(newStudent.academicYear, 10),
        semester: parseInt(newStudent.semester, 10),
        section: newStudent.section.trim().toUpperCase(),
      });

      setShowRegisterModal(false);
      setNotice(res.data.message || 'Student registered and submitted to Admin for approval!');
      setNewStudent({
        name: '',
        email: '',
        studentId: '',
        departmentId: departments[0]?._id || '',
        academicYear: '1',
        semester: '1',
        section: 'A',
      });
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register student.');
    } finally {
      setRegisteringStudent(false);
    }
  };

  // Submit Student Assignment for Admin Approval (Requirement 1, 3, 4)
  const handleAssignStudentSubmit = async (e) => {
    e.preventDefault();
    if (!assignStudentId || !assignDeptId) {
      return setError('Please select a student and department.');
    }

    setSubmittingStudent(true);
    setError('');
    setNotice('');

    try {
      const res = await api.post('/registrar/assign-student', {
        studentId: assignStudentId,
        departmentId: assignDeptId,
        academicYear: parseInt(assignYear, 10),
        semester: parseInt(assignSem, 10),
        section: assignSection.trim().toUpperCase(),
      });
      setNotice(res.data.message || 'Student placement submitted to Admin for approval!');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit student assignment.');
    } finally {
      setSubmittingStudent(false);
    }
  };

  // Submit Lecturer Assignment for Admin Approval (Requirement 3, 4, 6)
  const handleAssignLecturerSubmit = async (e) => {
    e.preventDefault();
    if (!assignLecturerId || !assignCourseId || !assignLecDeptId) {
      return setError('Please select lecturer, course, and department.');
    }

    setSubmittingLecturer(true);
    setError('');
    setNotice('');

    try {
      const res = await api.post('/registrar/assign-lecturer', {
        lecturerId: assignLecturerId,
        courseId: assignCourseId,
        departmentId: assignLecDeptId,
        academicYear: parseInt(assignLecYear, 10),
        semester: parseInt(assignLecSem, 10),
        section: assignLecSection.trim().toUpperCase(),
        courseDescription: assignLecDesc.trim() || undefined,
      });
      setNotice(res.data.message || 'Lecturer teaching assignment submitted to Admin for approval!');
      setAssignLecDesc('');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit lecturer assignment.');
    } finally {
      setSubmittingLecturer(false);
    }
  };

  // Course Enrollment Actions (Requirement 5)
  const handleEnrollStudentInCourse = async (course) => {
    const student = registrarStudents.find((s) => s._id === enrollStudentId);
    if (!student) return alert('Please select a student first.');

    const targetYear = student.assignedYear || student.yearOfStudy || 1;
    const targetSem = student.assignedSemester || student.semester || 1;
    const semString = `Year ${targetYear} Sem ${targetSem}`;

    setEnrollingCourseId(course._id);
    try {
      const res = await api.post('/enrollments', {
        studentId: student._id,
        courseId: course._id,
        semester: semString,
        academicYear: '2026/2027',
      });
      setNotice(res.data.message || `Student successfully enrolled in ${course.code}.`);
      await fetchStudentEnrollments(student._id);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to enroll student in course.');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleDropEnrollment = async (enrollmentId) => {
    if (!window.confirm('Are you sure you want to drop this course enrollment?')) return;
    setDroppingEnrollmentId(enrollmentId);
    try {
      const res = await api.delete(`/enrollments/${enrollmentId}`);
      setNotice(res.data.message || 'Course enrollment successfully dropped.');
      if (enrollStudentId) await fetchStudentEnrollments(enrollStudentId);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to drop course.');
    } finally {
      setDroppingEnrollmentId(null);
    }
  };

  // Academic Records & Grade Commit (Requirement 7)
  const handleOpenGradeModalForStudent = (student) => {
    setTargetStudentForGrade(student);
    const yr = student.assignedYear || student.yearOfStudy || 1;
    const sm = student.assignedSemester || student.semester || 1;
    setSemesterName(`Year ${yr} Semester ${sm}`);
    setShowGradeModal(true);
  };

  const handleSaveSemesterResult = async (e) => {
    e.preventDefault();
    if (!targetStudentForGrade) return;

    setSavingGrade(true);
    try {
      await api.post(`/records/${targetStudentForGrade._id}/semester`, {
        semesterName,
        academicYear: academicYearVal || '2025/2026',
        courses: [
          {
            courseCode: courseCode.trim().toUpperCase(),
            courseName: courseName.trim(),
            credits: Number(courseCredits || 3),
            grade: grade.trim().toUpperCase(),
          },
        ],
      });
      setShowGradeModal(false);
      setNotice('Student semester grades saved and CGPA updated with audit tracking.');
      if (recordStudentId) await fetchStudentAcademicRecord(recordStudentId);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update academic record.');
    } finally {
      setSavingGrade(false);
    }
  };

  // PDF Export Handlers (Requirement 8)
  const handleExportTranscript = (studentId) => {
    window.open(`${api.defaults.baseURL}/reports/transcript/${studentId}`, '_blank');
  };

  const handleExportCourseRoster = (courseId) => {
    const cid = courseId || selectedRosterCourseId || (courses[0]?._id);
    if (!cid) return alert('Please select a course to export its official enrollment roster.');
    window.open(`${api.defaults.baseURL}/reports/enrollment-list/${cid}`, '_blank');
  };

  // Derived: Current Student Selected in Enrollment Tab
  const currentEnrollStudent = registrarStudents.find((s) => s._id === enrollStudentId);

  // Derived: Courses matching current enroll student's Department, Year, and Semester (Requirement 5)
  const availableEnrollCourses = courses.filter((c) => {
    if (!currentEnrollStudent) return false;
    const studentDeptId = currentEnrollStudent.assignedDepartment?._id || currentEnrollStudent.department?._id;
    const courseDeptId = c.department?._id || c.department;
    if (studentDeptId && courseDeptId && studentDeptId.toString() !== courseDeptId.toString()) {
      return false;
    }
    const studentYear = currentEnrollStudent.assignedYear || currentEnrollStudent.yearOfStudy || 1;
    const courseYear = c.yearLevel || c.academicYear || 1;
    if (Number(courseYear) !== Number(studentYear)) {
      return false;
    }
    const studentSem = currentEnrollStudent.assignedSemester || currentEnrollStudent.semester || 1;
    if (c.semester && Number(c.semester) !== Number(studentSem)) {
      return false;
    }
    return true;
  });

  // Derived: Filtered Registered Students List for Reports Tab (Requirement 8)
  const filteredReportStudents = registrarStudents.filter((s) => {
    const q = reportSearch.trim().toLowerCase();
    if (q) {
      const match =
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (filterDept !== 'ALL') {
      const deptId = s.assignedDepartment?._id || s.department?._id;
      if (deptId?.toString() !== filterDept) return false;
    }

    if (filterYear !== 'ALL') {
      const yr = s.assignedYear || s.yearOfStudy || 1;
      if (String(yr) !== filterYear) return false;
    }

    if (filterSem !== 'ALL') {
      const sm = s.assignedSemester || s.semester || 1;
      if (String(sm) !== filterSem) return false;
    }

    if (filterSection !== 'ALL') {
      const sec = (s.assignedSection || s.section || 'A').toUpperCase();
      if (sec !== filterSection) return false;
    }

    if (filterStatus !== 'ALL') {
      const st = s.assignmentStatus || 'none';
      if (st !== filterStatus) return false;
    }

    return true;
  });

  // KPI Metrics
  const pendingPlacementsCount = registrarStudents.filter((s) => s.assignmentStatus === 'pending_approval').length;
  const approvedPlacementsCount = registrarStudents.filter((s) => s.assignmentStatus === 'approved').length;
  const activeLecturerAssignmentsCount = lecturerAssignments.filter((l) => l.status === 'approved').length;

  return (
    <div className="page-wrapper">
      {/* Top Header & Fast Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GraduationCap size={28} color="#0b3954" />
            Office of the University Registrar
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
            Student verification & placement, course enrollment, faculty assignments, official academic transcripts, and reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
          >
            <UserPlus size={16} /> Register New Student
          </button>
          <button
            onClick={() => handleExportCourseRoster(selectedRosterCourseId)}
            className="btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
          >
            <Download size={16} /> Export Course Roster (PDF)
          </button>
          <button
            onClick={loadAll}
            className="btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 10px' }}
            title="Refresh All Records"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Registered Students</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954', marginTop: '4px' }}>{registrarStudents.length}</div>
          <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>Total student directory</div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Pending Admin Approval</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b45309', marginTop: '4px' }}>{pendingPlacementsCount}</div>
          <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>Submitted placements awaiting Admin</div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Approved Placements</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d', marginTop: '4px' }}>{approvedPlacementsCount}</div>
          <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>Active students with OTP sent</div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Faculty Assignments</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6d28d9', marginTop: '4px' }}>{lecturerAssignments.length}</div>
          <div style={{ fontSize: '11px', color: '#6d28d9', marginTop: '2px' }}>{activeLecturerAssignmentsCount} approved teaching classes</div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #0f766e' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Departments</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f766e', marginTop: '4px' }}>{departments.length}</div>
          <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '2px' }}>CS, IT, Software Eng, & expansion</div>
        </div>
      </div>

      {/* 5-Pillar Tabs Navigation */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', overflowX: 'auto', paddingBottom: '2px' }}>
        <button
          onClick={() => { setActiveTab('student_placement'); setNotice(''); setError(''); }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'student_placement' ? '3px solid #0b3954' : '3px solid transparent',
            color: activeTab === 'student_placement' ? '#0b3954' : '#64748b',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <GraduationCap size={17} /> Student Placement & Approval
        </button>

        <button
          onClick={() => { setActiveTab('lecturer_assignment'); setNotice(''); setError(''); }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'lecturer_assignment' ? '3px solid #0b3954' : '3px solid transparent',
            color: activeTab === 'lecturer_assignment' ? '#0b3954' : '#64748b',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <BookOpen size={17} /> Lecturer Teaching Assignment
        </button>

        <button
          onClick={() => { setActiveTab('course_enrollment'); setNotice(''); setError(''); }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'course_enrollment' ? '3px solid #0b3954' : '3px solid transparent',
            color: activeTab === 'course_enrollment' ? '#0b3954' : '#64748b',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <BookMarked size={17} /> Course Enrollment
        </button>

        <button
          onClick={() => { setActiveTab('academic_records'); setNotice(''); setError(''); }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'academic_records' ? '3px solid #0b3954' : '3px solid transparent',
            color: activeTab === 'academic_records' ? '#0b3954' : '#64748b',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <Award size={17} /> Academic Records & Grades
        </button>

        <button
          onClick={() => { setActiveTab('official_reports'); setNotice(''); setError(''); }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'official_reports' ? '3px solid #0b3954' : '3px solid transparent',
            color: activeTab === 'official_reports' ? '#0b3954' : '#64748b',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <ClipboardList size={17} /> Official Reports & Directory
        </button>
      </div>

      {notice && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
          <CheckCircle size={18} color="#059669" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: Student Verification, Academic Placement & Approval (Req 1, 2, 3, 4) */}
      {/* ========================================================================= */}
      {activeTab === 'student_placement' && (
        <div>
          {/* Requirement 2: Student Verification Search */}
          <div className="card" style={{ marginBottom: '20px', padding: '18px 20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '15px', color: '#0b3954', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={16} color="#0284c7" /> Verify Student Existence in University Database (Requirement 2)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
              Check if a student exists in the university database by searching their unique Student ID or full name before submitting an official placement.
            </p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', maxWidth: '600px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter Student ID (e.g. DDU1024) or Name..."
                  value={verifySearchQuery}
                  onChange={(e) => {
                    setVerifySearchQuery(e.target.value);
                    handleVerifyStudent(e.target.value);
                  }}
                  style={{ paddingLeft: '34px', fontSize: '13px' }}
                />
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '11px' }} />
              </div>
              <button
                type="button"
                onClick={() => handleVerifyStudent(verifySearchQuery)}
                className="btn-accent"
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                Verify
              </button>
            </div>

            {/* Verification Result Card */}
            {verifySearched && (
              <div style={{ marginTop: '12px' }}>
                {verifiedStudent ? (
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '13px' }}>✓ Verified Student Record:</span>
                        <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{verifiedStudent.name}</span>
                        <span style={{ color: '#0284c7', fontSize: '12px', fontFamily: 'monospace' }}>({verifiedStudent.studentId || 'ID Pending'})</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                        Email: <strong>{verifiedStudent.email}</strong> • Dept: <strong>{verifiedStudent.assignedDepartment?.name || verifiedStudent.department?.name || 'Unassigned'}</strong> • Placement Status:{' '}
                        <span style={{ fontWeight: 'bold', color: verifiedStudent.assignmentStatus === 'approved' ? '#16a34a' : '#b45309' }}>
                          {(verifiedStudent.assignmentStatus || 'none').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyVerifiedToAssignment(verifiedStudent)}
                      className="btn-outline"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Check size={14} color="#16a34a" /> Load into Placement Form
                    </button>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '13px', color: '#9f1239' }}>
                      <strong>No matching student found</strong> for "{verifySearchQuery}". If this is a new student, register them directly.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRegisterModal(true);
                        setNewStudent((prev) => ({ ...prev, name: verifySearchQuery }));
                      }}
                      className="btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <UserPlus size={14} /> Register New Student
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Placement Form */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '17px', color: '#0b3954', marginBottom: '6px' }}>
              Assign Student Academic Placement (Requirement 1, 3, & 4)
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Assign student to Department, Academic Year, Semester, and Section. Assignments are submitted to the Admin for approval before one-time OTP login credentials and secure default passwords are dispatched.
            </p>

            <form onSubmit={handleAssignStudentSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Select Student
                  </label>
                  <select
                    className="input-field"
                    value={assignStudentId}
                    onChange={(e) => setAssignStudentId(e.target.value)}
                    required
                  >
                    {registrarStudents.length === 0 ? (
                      <option value="">No registered students found</option>
                    ) : (
                      registrarStudents.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.studentId || 'No ID'} • {s.email}) — Status: {(s.assignmentStatus || 'Unassigned').toUpperCase()}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Department (Dynamic DB Support)
                  </label>
                  <select
                    className="input-field"
                    value={assignDeptId}
                    onChange={(e) => setAssignDeptId(e.target.value)}
                    required
                  >
                    {departments.length === 0 ? (
                      <option value="">No departments available</option>
                    ) : (
                      departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Academic Year
                  </label>
                  <select
                    className="input-field"
                    value={assignYear}
                    onChange={(e) => setAssignYear(e.target.value)}
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Semester
                  </label>
                  <select
                    className="input-field"
                    value={assignSem}
                    onChange={(e) => setAssignSem(e.target.value)}
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Assigned Section
                  </label>
                  <select
                    className="input-field"
                    value={assignSection}
                    onChange={(e) => setAssignSection(e.target.value)}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                    <option value="E">Section E</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submittingStudent}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Send size={16} />
                <span>{submittingStudent ? 'Submitting to Admin...' : 'Submit Placement for Admin Approval'}</span>
              </button>
            </form>
          </div>

          {/* Placement Status Overview Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', color: '#0b3954', margin: 0 }}>
                Student Placement Status Overview ({registrarStudents.length})
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 16px' }}>Student</th>
                  <th style={{ padding: '10px 16px' }}>Department</th>
                  <th style={{ padding: '10px 16px' }}>Placement Details</th>
                  <th style={{ padding: '10px 16px' }}>Approval Status</th>
                  <th style={{ padding: '10px 16px' }}>Assigned By</th>
                </tr>
              </thead>
              <tbody>
                {registrarStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No registered students found.
                    </td>
                  </tr>
                ) : (
                  registrarStudents.map((s) => (
                    <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {s.email} • ID: <span style={{ fontFamily: 'monospace', color: '#0284c7' }}>{s.studentId || 'N/A'}</span>
                        </div>
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
                            backgroundColor:
                              s.assignmentStatus === 'approved'
                                ? '#dcfce7'
                                : s.assignmentStatus === 'pending_approval'
                                ? '#fef3c7'
                                : '#f1f5f9',
                            color:
                              s.assignmentStatus === 'approved'
                                ? '#15803d'
                                : s.assignmentStatus === 'pending_approval'
                                ? '#b45309'
                                : '#475569',
                          }}
                        >
                          {(s.assignmentStatus || 'none').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '12px' }}>
                        {s.assignedBy?.name || 'Registrar Office'}
                        {s.assignedAt ? ` (${new Date(s.assignedAt).toLocaleDateString()})` : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Lecturer Course Teaching Assignments (Req 3, 4, & 6) */}
      {/* ========================================================================= */}
      {activeTab === 'lecturer_assignment' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '17px', color: '#0b3954', marginBottom: '6px' }}>
              Assign Lecturer to Course & Section (Requirement 3 & 4)
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Assign a faculty lecturer with their unique Lecturer ID to a department course and section. After Admin approval, email notification containing assignment details is dispatched to the instructor.
            </p>

            <form onSubmit={handleAssignLecturerSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Select Lecturer (with unique Lecturer ID)
                  </label>
                  <select
                    className="input-field"
                    value={assignLecturerId}
                    onChange={(e) => setAssignLecturerId(e.target.value)}
                    required
                  >
                    {lecturers.length === 0 ? (
                      <option value="">No lecturers available</option>
                    ) : (
                      lecturers.map((l) => (
                        <option key={l._id} value={l._id}>
                          {l.name} ({l.email}) — ID: {l.lecturerId || 'LEC/CS/101'}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Select Course
                  </label>
                  <select
                    className="input-field"
                    value={assignCourseId}
                    onChange={(e) => setAssignCourseId(e.target.value)}
                    required
                  >
                    {courses.length === 0 ? (
                      <option value="">No courses available</option>
                    ) : (
                      courses.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.code}: {c.name} ({c.credits || 3} ECTS)
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Department
                  </label>
                  <select
                    className="input-field"
                    value={assignLecDeptId}
                    onChange={(e) => setAssignLecDeptId(e.target.value)}
                    required
                  >
                    {departments.length === 0 ? (
                      <option value="">No departments</option>
                    ) : (
                      departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.code} - {d.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Academic Year
                  </label>
                  <select
                    className="input-field"
                    value={assignLecYear}
                    onChange={(e) => setAssignLecYear(e.target.value)}
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Semester
                  </label>
                  <select
                    className="input-field"
                    value={assignLecSem}
                    onChange={(e) => setAssignLecSem(e.target.value)}
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Section (Supports Multiple)
                  </label>
                  <select
                    className="input-field"
                    value={assignLecSection}
                    onChange={(e) => setAssignLecSection(e.target.value)}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                    <option value="ALL">All Sections</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Custom Course Description / Syllabus Note (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={assignLecDesc}
                  onChange={(e) => setAssignLecDesc(e.target.value)}
                  placeholder="Optional section-specific syllabus notes or course explanation..."
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submittingLecturer}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Send size={16} />
                <span>{submittingLecturer ? 'Submitting to Admin...' : 'Submit Teaching Assignment for Admin Approval'}</span>
              </button>
            </form>
          </div>

          {/* Lecturer Assignments List */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ fontSize: '15px', color: '#0b3954', margin: 0 }}>
                Teaching Assignments Pipeline ({lecturerAssignments.length})
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 16px' }}>Course</th>
                  <th style={{ padding: '10px 16px' }}>Lecturer</th>
                  <th style={{ padding: '10px 16px' }}>Class Level & Section</th>
                  <th style={{ padding: '10px 16px' }}>Custom Overview</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {lecturerAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No lecturer teaching assignments recorded yet.
                    </td>
                  </tr>
                ) : (
                  lecturerAssignments.map((a) => (
                    <tr key={a._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{a.course?.code}: {a.course?.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{a.department?.name}</div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: '600' }}>{a.lecturer?.name}</div>
                        <div style={{ fontSize: '11px', color: '#0284c7', fontFamily: 'monospace' }}>
                          ID: {a.lecturer?.lecturerId || 'LEC/CS/101'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        Year {a.academicYear} Sem {a.semester} • <span style={{ fontWeight: 'bold' }}>Sec {a.section}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#475569', fontSize: '12px', maxWidth: '240px' }}>
                        {a.courseDescription ? `"${a.courseDescription}"` : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Default Curriculum</span>}
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
                          {(a.status || 'pending').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Course Enrollment Management (Requirement 5 & 9) */}
      {/* ========================================================================= */}
      {activeTab === 'course_enrollment' && (
        <div>
          {/* Student Selector Card */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '17px', color: '#0b3954', marginBottom: '6px' }}>
              Manage Course Enrollment by Student (Requirement 5)
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
              Search for a student to view their current semester courses, inspect department catalog availability, check seat capacity and prerequisites, and enroll them officially.
            </p>

            <div style={{ maxWidth: '480px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                Select Active Student
              </label>
              <select
                className="input-field"
                value={enrollStudentId}
                onChange={(e) => setEnrollStudentId(e.target.value)}
              >
                {registrarStudents.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.studentId || 'No ID'}) — {s.assignedDepartment?.code || 'CS'} Year {s.assignedYear || s.yearOfStudy || 1} Sem {s.assignedSemester || s.semester || 1} Sec {s.assignedSection || s.section || 'A'}
                  </option>
                ))}
              </select>
            </div>

            {currentEnrollStudent && (
              <div style={{ marginTop: '14px', padding: '12px 16px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
                <div><strong>Department:</strong> {currentEnrollStudent.assignedDepartment?.name || currentEnrollStudent.department?.name || 'Computer Science'}</div>
                <div><strong>Academic Level:</strong> Year {currentEnrollStudent.assignedYear || currentEnrollStudent.yearOfStudy || 1} • Semester {currentEnrollStudent.assignedSemester || currentEnrollStudent.semester || 1}</div>
                <div><strong>Section:</strong> Section {currentEnrollStudent.assignedSection || currentEnrollStudent.section || 'A'}</div>
                <div><strong>Placement Status:</strong> <span style={{ fontWeight: 'bold', color: currentEnrollStudent.assignmentStatus === 'approved' ? '#16a34a' : '#b45309' }}>{(currentEnrollStudent.assignmentStatus || 'none').toUpperCase()}</span></div>
              </div>
            )}
          </div>

          {/* Section 1: Current Enrolled Courses */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', color: '#0b3954', margin: 0 }}>
                Currently Enrolled Courses ({studentEnrollments.length})
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Total Enrolled Credits: {studentEnrollments.reduce((acc, e) => acc + (e.course?.credits || 3), 0)} ECTS
              </span>
            </div>

            {loadingEnrollments ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading student enrollments...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                    <th style={{ padding: '10px 16px' }}>Course Code</th>
                    <th style={{ padding: '10px 16px' }}>Course Title</th>
                    <th style={{ padding: '10px 16px' }}>Credits</th>
                    <th style={{ padding: '10px 16px' }}>Semester</th>
                    <th style={{ padding: '10px 16px' }}>Status</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        Student has no active course enrollments. Use the available catalog below to enroll courses.
                      </td>
                    </tr>
                  ) : (
                    studentEnrollments.map((enr) => (
                      <tr key={enr._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0284c7' }}>
                          {enr.course?.code}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: '600' }}>
                          {enr.course?.name}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {enr.course?.credits || 3} ECTS
                        </td>
                        <td style={{ padding: '10px 16px', color: '#475569' }}>
                          {enr.semester}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#16a34a' }}>
                            ENROLLED
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDropEnrollment(enr._id)}
                            disabled={droppingEnrollmentId === enr._id}
                            className="btn-outline"
                            style={{ minHeight: '30px', padding: '3px 10px', fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            <Trash2 size={12} /> Drop
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 2: Available Courses for Student's Dept/Year/Semester */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', color: '#0b3954', margin: 0 }}>
                  Available Curriculum Courses for Student's Placement Level ({availableEnrollCourses.length})
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                  Restricted strictly to the student's assigned department, academic year, and semester (Requirement 2 & 5).
                </p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 16px' }}>Code</th>
                  <th style={{ padding: '10px 16px' }}>Course Title & Overview</th>
                  <th style={{ padding: '10px 16px' }}>Credits</th>
                  <th style={{ padding: '10px 16px' }}>Prerequisites</th>
                  <th style={{ padding: '10px 16px' }}>Capacity</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {availableEnrollCourses.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No available courses matching student's department, year, and semester level.
                    </td>
                  </tr>
                ) : (
                  availableEnrollCourses.map((c) => {
                    const isAlreadyEnrolled = studentEnrollments.some(
                      (e) => e.course?._id === c._id || e.course === c._id
                    );
                    const isAtCapacity = (c.enrolledCount || 0) >= (c.capacity || 50);

                    return (
                      <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0284c7' }}>
                          {c.code}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '320px' }}>
                            {c.description ? c.description.slice(0, 90) + '...' : 'Standard Course'}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>{c.credits || 3} ECTS</td>
                        <td style={{ padding: '10px 16px', fontSize: '12px', color: '#475569' }}>
                          {c.prerequisites && c.prerequisites.length > 0 ? (
                            <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                              {c.prerequisites.join(', ')}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: isAtCapacity ? '#dc2626' : '#16a34a' }}>
                            {c.enrolledCount || 0} / {c.capacity || 50} seats
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          {isAlreadyEnrolled ? (
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={14} /> Enrolled
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEnrollStudentInCourse(c)}
                              disabled={isAtCapacity || enrollingCourseId === c._id}
                              className="btn-accent"
                              style={{ minHeight: '30px', padding: '4px 12px', fontSize: '11px' }}
                            >
                              {enrollingCourseId === c._id ? 'Enrolling...' : isAtCapacity ? 'Class Full' : '+ Enroll'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Student Academic Records & Certified Transcripts (Req 7) */}
      {/* ========================================================================= */}
      {activeTab === 'academic_records' && (
        <div>
          {/* Student Selector Card */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '17px', color: '#0b3954', margin: 0 }}>
                  Student Academic Records & CGPA Management (Requirement 7)
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                  Inspect completed coursework, term grade reports, and cumulative GPA. Record verified semester grades with automatic Senate policy CGPA calculation and audit logging.
                </p>
              </div>

              {recordStudentId && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const st = registrarStudents.find((s) => s._id === recordStudentId);
                      handleOpenGradeModalForStudent(st);
                    }}
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Add / Update Semester Grades
                  </button>
                  <button
                    onClick={() => handleExportTranscript(recordStudentId)}
                    className="btn-accent"
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> Export Transcript PDF
                  </button>
                </div>
              )}
            </div>

            <div style={{ maxWidth: '480px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                Select Student Record to Inspect
              </label>
              <select
                className="input-field"
                value={recordStudentId}
                onChange={(e) => setRecordStudentId(e.target.value)}
              >
                {registrarStudents.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.studentId || 'No ID'} • {s.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transcript Preview Card */}
          {loadingRecord ? (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              Loading student academic record...
            </div>
          ) : !studentAcademicRecord ? (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              No academic record found for this student. Click "Add / Update Semester Grades" above to record their first semester.
            </div>
          ) : (
            <div>
              {/* CGPA Summary Banner */}
              <div className="card" style={{ marginBottom: '20px', backgroundColor: '#0b3954', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase' }}>DIRE DAWA UNIVERSITY • OFFICIAL ACADEMIC STANDING</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                    {studentAcademicRecord.student?.name} ({studentAcademicRecord.student?.studentId || 'ID Pending'})
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Total Credits Earned: <strong>{studentAcademicRecord.totalCredits || 0} ECTS</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>CUMULATIVE CGPA</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#38bdf8' }}>
                      {typeof studentAcademicRecord.cgpa === 'number' ? studentAcademicRecord.cgpa.toFixed(2) : studentAcademicRecord.cgpa || '0.00'}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#0284c7', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
                    {studentAcademicRecord.academicStanding || 'Good Standing'}
                  </div>
                </div>
              </div>

              {/* Semester Breakdown */}
              {(!studentAcademicRecord.semesters || studentAcademicRecord.semesters.length === 0) ? (
                <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No completed semester records on file. Click "Add / Update Semester Grades" to record grades.
                </div>
              ) : (
                studentAcademicRecord.semesters.map((sem, sIndex) => (
                  <div key={sIndex} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '18px' }}>
                    <div style={{ padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#0b3954', fontSize: '14px' }}>{sem.name}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>({sem.academicYear || '2025/2026'})</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7' }}>
                        Term GPA: {typeof sem.gpa === 'number' ? sem.gpa.toFixed(2) : sem.gpa || '0.00'} • Credits: {sem.creditsEarned || 0}
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                          <th style={{ padding: '8px 16px' }}>Course Code</th>
                          <th style={{ padding: '8px 16px' }}>Course Title</th>
                          <th style={{ padding: '8px 16px' }}>Credits</th>
                          <th style={{ padding: '8px 16px' }}>Letter Grade</th>
                          <th style={{ padding: '8px 16px' }}>Grade Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sem.courses?.map((c, cIndex) => (
                          <tr key={cIndex} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 16px', fontWeight: 'bold', color: '#0284c7' }}>{c.courseCode}</td>
                            <td style={{ padding: '8px 16px' }}>{c.courseName}</td>
                            <td style={{ padding: '8px 16px' }}>{c.credits} ECTS</td>
                            <td style={{ padding: '8px 16px' }}>
                              <span style={{ fontWeight: 'bold', color: c.grade === 'F' ? '#dc2626' : '#16a34a' }}>
                                {c.grade}
                              </span>
                            </td>
                            <td style={{ padding: '8px 16px' }}>{c.gradePoint?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: Official Reports & Filtered Directory (Req 8) */}
      {/* ========================================================================= */}
      {activeTab === 'official_reports' && (
        <div>
          {/* Comprehensive Filter Bar (Requirement 8) */}
          <div className="card" style={{ marginBottom: '20px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '16px', color: '#0b3954', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={18} color="#0284c7" /> Official Registration & Enrollment Filters (Requirement 8)
              </h2>
              <button
                type="button"
                onClick={() => {
                  setReportSearch('');
                  setFilterDept('ALL');
                  setFilterYear('ALL');
                  setFilterSem('ALL');
                  setFilterSection('ALL');
                  setFilterStatus('ALL');
                }}
                className="btn-outline"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                Reset Filters
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Department</label>
                <select className="input-field" value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ fontSize: '12px' }}>
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Academic Year</label>
                <select className="input-field" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ fontSize: '12px' }}>
                  <option value="ALL">All Years</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Semester</label>
                <select className="input-field" value={filterSem} onChange={(e) => setFilterSem(e.target.value)} style={{ fontSize: '12px' }}>
                  <option value="ALL">All Semesters</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Section</label>
                <select className="input-field" value={filterSection} onChange={(e) => setFilterSection(e.target.value)} style={{ fontSize: '12px' }}>
                  <option value="ALL">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Approval Status</label>
                <select className="input-field" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: '12px' }}>
                  <option value="ALL">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="none">Unassigned</option>
                </select>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search registered students by Full Name, Student ID, or Institutional Email..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '13px' }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            </div>
          </div>

          {/* Official Course Enrollment List PDF Downloader */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px 20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '14px', color: '#166534', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="#16a34a" /> Official Course Enrollment Roster PDF (Requirement 8)
              </h3>
              <p style={{ fontSize: '12px', color: '#15803d', margin: 0 }}>
                Select any active department course to generate and export its certified student enrollment list.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                className="input-field"
                value={selectedRosterCourseId}
                onChange={(e) => setSelectedRosterCourseId(e.target.value)}
                style={{ minWidth: '220px', fontSize: '12px', marginBottom: 0 }}
              >
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.code}: {c.name} ({c.enrolledCount || 0} enrolled)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleExportCourseRoster(selectedRosterCourseId)}
                className="btn-primary"
                style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#16a34a' }}
              >
                <Download size={14} /> Download PDF Roster
              </button>
            </div>
          </div>

          {/* Filtered Students Directory Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', color: '#0b3954', margin: 0 }}>
                Registered Students List ({filteredReportStudents.length} matching)
              </h3>
              <button
                onClick={() => window.print()}
                className="btn-outline"
                style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Printer size={13} /> Print Summary Report
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 16px' }}>Student ID</th>
                  <th style={{ padding: '10px 16px' }}>Full Name</th>
                  <th style={{ padding: '10px 16px' }}>Email</th>
                  <th style={{ padding: '10px 16px' }}>Department</th>
                  <th style={{ padding: '10px 16px' }}>Class & Section</th>
                  <th style={{ padding: '10px 16px' }}>Approval Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Official Transcripts</th>
                </tr>
              </thead>
              <tbody>
                {filteredReportStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      No students found matching your selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredReportStudents.map((s) => (
                    <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0284c7', fontFamily: 'monospace' }}>
                        {s.studentId || 'N/A'}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: '600', color: '#0f172a' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#475569' }}>
                        {s.email}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {s.assignedDepartment?.name || s.department?.name || 'Computer Science'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        Year {s.assignedYear || s.yearOfStudy || 1} • Sem {s.assignedSemester || s.semester || 1} • <span style={{ fontWeight: 'bold' }}>Sec {s.assignedSection || s.section || 'A'}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor:
                              s.assignmentStatus === 'approved'
                                ? '#dcfce7'
                                : s.assignmentStatus === 'pending_approval'
                                ? '#fef3c7'
                                : '#f1f5f9',
                            color:
                              s.assignmentStatus === 'approved'
                                ? '#15803d'
                                : s.assignmentStatus === 'pending_approval'
                                ? '#b45309'
                                : '#475569',
                          }}
                        >
                          {(s.assignmentStatus || 'none').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleExportTranscript(s._id)}
                          className="btn-outline"
                          style={{ minHeight: '30px', padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Export Certified PDF Transcript"
                        >
                          <Download size={13} /> Transcript PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GRADE ENTRY MODAL (Requirement 7) */}
      {/* ========================================================================= */}
      {showGradeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="#0b3954" /> Record Student Grades (Requirement 7)
              </h2>
              <button onClick={() => setShowGradeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Student: <strong>{targetStudentForGrade?.name}</strong> (ID: {targetStudentForGrade?.studentId})
            </p>

            <form onSubmit={handleSaveSemesterResult}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Semester Term</label>
                  <select className="input-field" value={semesterName} onChange={(e) => setSemesterName(e.target.value)} required>
                    <option value="Year 1 Semester 1">Year 1 Semester 1</option>
                    <option value="Year 1 Semester 2">Year 1 Semester 2</option>
                    <option value="Year 2 Semester 1">Year 2 Semester 1</option>
                    <option value="Year 2 Semester 2">Year 2 Semester 2</option>
                    <option value="Year 3 Semester 1">Year 3 Semester 1</option>
                    <option value="Year 3 Semester 2">Year 3 Semester 2</option>
                    <option value="Year 4 Semester 1">Year 4 Semester 1</option>
                    <option value="Year 4 Semester 2">Year 4 Semester 2</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Academic Year</label>
                  <input
                    type="text"
                    className="input-field"
                    value={academicYearVal}
                    onChange={(e) => setAcademicYearVal(e.target.value)}
                    placeholder="2025/2026"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Course Code</label>
                  <input
                    type="text"
                    className="input-field"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="COSC101"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Course Title</label>
                  <input
                    type="text"
                    className="input-field"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Introduction to Computer Science"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Credit Hours (ECTS)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(e.target.value)}
                    min="1"
                    max="8"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Final Grade</label>
                  <select className="input-field" value={grade} onChange={(e) => setGrade(e.target.value)}>
                    <option value="A+">A+ (4.00 - Excellent)</option>
                    <option value="A">A (4.00 - Very Good)</option>
                    <option value="A-">A- (3.75 - Very Good)</option>
                    <option value="B+">B+ (3.50 - Good)</option>
                    <option value="B">B (3.00 - Good)</option>
                    <option value="B-">B- (2.75 - Satisfactory)</option>
                    <option value="C+">C+ (2.50 - Satisfactory)</option>
                    <option value="C">C (2.00 - Bare Pass)</option>
                    <option value="C-">C- (1.75 - Conditional)</option>
                    <option value="D">D (1.00 - Very Weak)</option>
                    <option value="F">F (0.00 - Fail)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowGradeModal(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingGrade}>
                  {savingGrade ? 'Recalculating...' : 'Commit Grade & Recalculate CGPA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIRECT STUDENT REGISTRATION MODAL (Req 2 & 4) */}
      {/* ========================================================================= */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div className="card" style={{ maxWidth: '540px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: '#0b3954', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={20} color="#0b3954" /> Register New Student (Requirement 2 & 4)
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                  Direct student registration by Registrar. Placement is submitted for Admin approval before OTP & temporary password credentials are dispatched to the student's email.
                </p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterStudentSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Hawi Kebede"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Institutional / Student Email
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="student@ddu.edu.et"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Student ID
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="DDU1400807"
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Department (Dynamic Support)
                </label>
                <select
                  className="input-field"
                  value={newStudent.departmentId}
                  onChange={(e) => setNewStudent({ ...newStudent, departmentId: e.target.value })}
                  required
                >
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Academic Year
                  </label>
                  <select
                    className="input-field"
                    value={newStudent.academicYear}
                    onChange={(e) => setNewStudent({ ...newStudent, academicYear: e.target.value })}
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Semester
                  </label>
                  <select
                    className="input-field"
                    value={newStudent.semester}
                    onChange={(e) => setNewStudent({ ...newStudent, semester: e.target.value })}
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Section
                  </label>
                  <select
                    className="input-field"
                    value={newStudent.section}
                    onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={registeringStudent}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserPlus size={16} />
                  <span>{registeringStudent ? 'Registering...' : 'Register & Submit for Approval'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
