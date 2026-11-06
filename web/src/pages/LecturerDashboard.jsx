import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  BookOpen,
  FileSpreadsheet,
  Megaphone,
  Plus,
  HelpCircle,
  Sparkles,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart2,
  Trash2,
  Clock,
  Search,
  Filter,
  Eye,
  Check,
  Save,
  Send,
  X,
  Award,
  GraduationCap,
  RefreshCw,
  Layers,
  Download,
  AlertTriangle,
  Lock,
  Unlock,
} from 'lucide-react';

export const LecturerDashboard = () => {
  const { user } = useAuth();

  // Navigation Tabs: 'students' (My Students & Grading) | 'teaching' | 'progress' | 'announcements'
  const [activeTab, setActiveTab] = useState('students');

  // =========================================================================
  // Pillar 1: Assigned Courses & Student Grading State (Req 2, 3, 4, 5)
  // =========================================================================
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [studentsData, setStudentsData] = useState([]);
  const [gradingPolicy, setGradingPolicy] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);
  const [publishingGrades, setPublishingGrades] = useState(false);

  // Student Filter & Search
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterSem, setFilterSem] = useState('ALL');
  const [filterGradingStatus, setFilterGradingStatus] = useState('ALL');

  // Local Editable Marks Map: { [enrollmentId]: { classworkScore, quizScore, midtermScore, finalExamScore, totalMark, letterGrade, gradePoint, gradingStatus } }
  const [editableMarks, setEditableMarks] = useState({});

  // Student Academic Info Modal
  const [inspectStudentModal, setInspectStudentModal] = useState(null);
  const [loadingStudentInfo, setLoadingStudentInfo] = useState(false);

  // =========================================================================
  // Pillar 2: Teaching Assignments State (Req 3, 6, 7)
  // =========================================================================
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);

  // =========================================================================
  // Pillar 3: Student Progress State (FR-L06)
  // =========================================================================
  const [selectedProgressCourse, setSelectedProgressCourse] = useState('COSC1011');
  const [progressData, setProgressData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressSearch, setProgressSearch] = useState('');

  // =========================================================================
  // Pillar 4: Announcements State (FR-L05)
  // =========================================================================
  const [announcements, setAnnouncements] = useState([]);
  const [postTitle, setPostTitle] = useState('');
  const [postMessage, setPostMessage] = useState('');
  const [postCourse, setPostCourse] = useState('COSC1011');
  const [isUrgent, setIsUrgent] = useState(false);
  const [posting, setPosting] = useState(false);

  // Global Notice
  const [notice, setNotice] = useState(null);

  // Auto-calculation helper using university grading scale
  const computeGrade = (total, scale) => {
    const num = Math.max(0, Math.min(100, Number(total) || 0));
    const fallbackScale = [
      { grade: 'A+', minScore: 90, gradePoint: 4.0 },
      { grade: 'A', minScore: 85, gradePoint: 4.0 },
      { grade: 'A-', minScore: 80, gradePoint: 3.75 },
      { grade: 'B+', minScore: 75, gradePoint: 3.5 },
      { grade: 'B', minScore: 70, gradePoint: 3.0 },
      { grade: 'B-', minScore: 65, gradePoint: 2.75 },
      { grade: 'C+', minScore: 60, gradePoint: 2.5 },
      { grade: 'C', minScore: 50, gradePoint: 2.0 },
      { grade: 'C-', minScore: 45, gradePoint: 1.75 },
      { grade: 'D', minScore: 40, gradePoint: 1.0 },
      { grade: 'F', minScore: 0, gradePoint: 0.0 },
    ];
    const activeScale = scale && scale.length > 0 ? scale : fallbackScale;
    const sorted = [...activeScale].sort((a, b) => b.minScore - a.minScore);
    for (const tier of sorted) {
      if (num >= tier.minScore) {
        return { letterGrade: tier.grade, gradePoint: tier.gradePoint };
      }
    }
    return { letterGrade: 'F', gradePoint: 0.0 };
  };

  // Fetch approved assigned courses for authenticated lecturer
  const fetchAssignedCourses = async () => {
    try {
      const res = await api.get('/lecturer/assigned-courses');
      const courses = res.data.data || [];
      setAssignedCourses(courses);
      if (courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courses[0].course.id);
        setSelectedProgressCourse(courses[0].course.code);
        setPostCourse(courses[0].course.code);
      }
    } catch (err) {
      console.error('Failed to load assigned courses:', err);
    }
  };

  // Fetch assigned students for selected course
  const fetchAssignedStudents = async (courseId) => {
    if (!courseId) return;
    setLoadingStudents(true);
    setNotice(null);
    try {
      const res = await api.get(`/lecturer/assigned-students?courseId=${courseId}`);
      const students = res.data.data || [];
      setStudentsData(students);
      setGradingPolicy(res.data.gradingPolicy);

      // Initialize local editable marks map
      const initialMarks = {};
      students.forEach((s) => {
        initialMarks[s.enrollmentId] = {
          classworkScore: s.grades?.classworkScore ?? 0,
          quizScore: s.grades?.quizScore ?? 0,
          midtermScore: s.grades?.midtermScore ?? 0,
          finalExamScore: s.grades?.finalExamScore ?? 0,
          totalMark: s.grades?.totalMark ?? 0,
          letterGrade: s.grades?.letterGrade || 'F',
          gradePoint: s.grades?.gradePoint ?? 0.0,
          gradingStatus: s.grades?.gradingStatus || 'draft',
        };
      });
      setEditableMarks(initialMarks);
    } catch (err) {
      console.error('Failed to load assigned students:', err);
      setNotice({ type: 'error', message: err.response?.data?.message || 'Failed to load assigned students.' });
    } finally {
      setLoadingStudents(false);
    }
  };

  // Fetch teaching assignments
  const fetchTeachingAssignments = async () => {
    try {
      const res = await api.get('/registrar/lecturer-assignments');
      setTeachingAssignments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load teaching assignments:', err);
    }
  };

  // Fetch student progress analytics
  const fetchProgress = async (courseCode) => {
    setLoadingProgress(true);
    try {
      const res = await api.get(`/lecturer/progress?courseCode=${courseCode || ''}`);
      setProgressData(res.data.data);
    } catch (err) {
      console.error('Failed to load progress analytics:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  useEffect(() => {
    fetchAssignedCourses();
    fetchTeachingAssignments();
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchAssignedStudents(selectedCourseId);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedProgressCourse) {
      fetchProgress(selectedProgressCourse);
    }
  }, [selectedProgressCourse]);

  // Handle Mark Change in Grading Table
  const handleMarkChange = (enrollmentId, field, value) => {
    const numVal = value === '' ? '' : Math.max(0, parseFloat(value) || 0);

    setEditableMarks((prev) => {
      const current = prev[enrollmentId] || {
        classworkScore: 0,
        quizScore: 0,
        midtermScore: 0,
        finalExamScore: 0,
      };

      const updated = {
        ...current,
        [field]: numVal,
      };

      const c = Number(field === 'classworkScore' ? numVal : updated.classworkScore) || 0;
      const q = Number(field === 'quizScore' ? numVal : updated.quizScore) || 0;
      const m = Number(field === 'midtermScore' ? numVal : updated.midtermScore) || 0;
      const f = Number(field === 'finalExamScore' ? numVal : updated.finalExamScore) || 0;

      const total = parseFloat((c + q + m + f).toFixed(1));
      const { letterGrade, gradePoint } = computeGrade(total, gradingPolicy?.scale);

      updated.totalMark = total;
      updated.letterGrade = letterGrade;
      updated.gradePoint = gradePoint;

      return {
        ...prev,
        [enrollmentId]: updated,
      };
    });
  };

  // Save Draft Marks or Publish Final Grades
  const handleSaveGrades = async (statusToSet = 'draft') => {
    if (!selectedCourseId) return alert('Please select a course first.');

    const isPublishing = statusToSet === 'published';
    if (isPublishing) {
      if (!window.confirm('Are you sure you want to PUBLISH these grades? Once published, grades are immediately visible to students and synchronized to official academic transcripts.')) {
        return;
      }
    }

    if (isPublishing) setPublishingGrades(true);
    else setSavingGrades(true);
    setNotice(null);

    try {
      const weights = gradingPolicy?.weights || { classwork: 10, quiz: 10, midterm: 30, finalExam: 50 };

      // Validate all marks before submitting
      const gradesPayload = filteredStudentsList.map((s) => {
        const marks = editableMarks[s.enrollmentId] || {};
        const c = Number(marks.classworkScore) || 0;
        const q = Number(marks.quizScore) || 0;
        const m = Number(marks.midtermScore) || 0;
        const f = Number(marks.finalExamScore) || 0;

        if (c > weights.classwork) {
          throw new Error(`Classwork mark for ${s.student.name} exceeds max ${weights.classwork}.`);
        }
        if (q > weights.quiz) {
          throw new Error(`Quiz mark for ${s.student.name} exceeds max ${weights.quiz}.`);
        }
        if (m > weights.midterm) {
          throw new Error(`Midterm mark for ${s.student.name} exceeds max ${weights.midterm}.`);
        }
        if (f > weights.finalExam) {
          throw new Error(`Final exam mark for ${s.student.name} exceeds max ${weights.finalExam}.`);
        }

        return {
          enrollmentId: s.enrollmentId,
          classworkScore: c,
          quizScore: q,
          midtermScore: m,
          finalExamScore: f,
        };
      });

      const res = await api.post('/lecturer/grades', {
        courseId: selectedCourseId,
        gradingStatus: statusToSet,
        grades: gradesPayload,
      });

      setNotice({
        type: 'success',
        message: res.data.message || (isPublishing ? 'Grades published successfully!' : 'Draft marks saved successfully!'),
      });

      // Reload fresh data from database
      await fetchAssignedStudents(selectedCourseId);
    } catch (err) {
      console.error('Failed to save grades:', err);
      setNotice({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to save student assessment marks.',
      });
    } finally {
      setSavingGrades(false);
      setPublishingGrades(false);
    }
  };

  // Inspect Student Academic Information Modal
  const handleOpenStudentInfo = async (studentId) => {
    setLoadingStudentInfo(true);
    setInspectStudentModal(null);
    try {
      const res = await api.get(`/lecturer/student-academic-info/${studentId}`);
      setInspectStudentModal(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load student academic records.');
    } finally {
      setLoadingStudentInfo(false);
    }
  };

  // Post Course Announcement
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postMessage.trim()) return;

    setPosting(true);
    setNotice(null);

    try {
      const res = await api.post('/announcements', {
        courseCode: postCourse,
        title: postTitle.trim(),
        message: postMessage.trim(),
        isUrgent,
      });
      setPostTitle('');
      setPostMessage('');
      setIsUrgent(false);
      setNotice({ type: 'success', message: res.data.message || 'Announcement broadcasted successfully!' });
      fetchAnnouncements();
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.message || 'Failed to post announcement.' });
    } finally {
      setPosting(false);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (annId, annTitle) => {
    if (!window.confirm(`Delete announcement "${annTitle}"?`)) return;
    try {
      await api.delete(`/announcements/${annId}`);
      setNotice({ type: 'success', message: 'Announcement removed.' });
      fetchAnnouncements();
    } catch (err) {
      setNotice({ type: 'error', message: 'Failed to delete announcement.' });
    }
  };

  // Save Teaching Assignment Course Description Override
  const handleSaveDescription = async (assignmentId) => {
    setSavingDesc(true);
    try {
      const res = await api.put(`/registrar/lecturer-assignments/${assignmentId}/description`, {
        courseDescription: editDesc.trim(),
      });
      setNotice({ type: 'success', message: res.data.message || 'Course description updated.' });
      setEditingAssignmentId(null);
      fetchTeachingAssignments();
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.message || 'Failed to update description.' });
    } finally {
      setSavingDesc(false);
    }
  };

  // Export Official CSV Grade Sheet
  const handleExportCSV = () => {
    if (!selectedCourseObj || filteredStudentsList.length === 0) return;
    const headers = [
      'Student ID',
      'Full Name',
      'Email',
      'Department',
      'Year',
      'Semester',
      'Section',
      'Classwork (10)',
      'Quiz (10)',
      'Midterm (30)',
      'Final Exam (50)',
      'Total Mark (100)',
      'Letter Grade',
      'Grade Point',
      'Grading Status',
    ];
    const rows = filteredStudentsList.map((s) => {
      const m = editableMarks[s.enrollmentId] || {};
      return [
        `"${s.student?.studentId || ''}"`,
        `"${s.student?.name || ''}"`,
        `"${s.student?.email || ''}"`,
        `"${s.student?.department || ''}"`,
        s.student?.year || 1,
        s.student?.semester || 1,
        `"${s.student?.section || 'A'}"`,
        m.classworkScore ?? 0,
        m.quizScore ?? 0,
        m.midtermScore ?? 0,
        m.finalExamScore ?? 0,
        m.totalMark ?? 0,
        `"${m.letterGrade || 'F'}"`,
        m.gradePoint ?? 0,
        `"${m.gradingStatus || 'draft'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedCourseObj.course.code}_Section_${selectedCourseObj.section}_Official_Grades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Students List
  const filteredStudentsList = studentsData.filter((s) => {
    // Search query
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      const matchName = s.student?.name?.toLowerCase().includes(q);
      const matchId = s.student?.studentId?.toLowerCase().includes(q);
      const matchEmail = s.student?.email?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchEmail) return false;
    }

    // Section filter
    if (filterSection !== 'ALL' && s.student?.section !== filterSection) {
      return false;
    }

    // Year filter
    if (filterYear !== 'ALL' && Number(s.student?.year) !== Number(filterYear)) {
      return false;
    }

    // Semester filter
    if (filterSem !== 'ALL' && Number(s.student?.semester) !== Number(filterSem)) {
      return false;
    }

    // Grading Status filter
    if (filterGradingStatus !== 'ALL') {
      const currentStatus = editableMarks[s.enrollmentId]?.gradingStatus || s.grades?.gradingStatus || 'draft';
      if (filterGradingStatus === 'published' && currentStatus !== 'published') return false;
      if (filterGradingStatus === 'draft' && currentStatus !== 'draft') return false;
    }

    return true;
  });

  const selectedCourseObj = assignedCourses.find((a) => a.course.id === selectedCourseId);
  const totalEnrolledCount = assignedCourses.reduce((sum, a) => sum + (a.enrolledStudentsCount || 0), 0);
  const weights = gradingPolicy?.weights || { classwork: 10, quiz: 10, midterm: 30, finalExam: 50 };

  // Real-time Class Analytics & Live Grade Distribution
  const gradeDistribution = { 'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C+': 0, 'C': 0, 'C-': 0, 'D': 0, 'F': 0 };
  let totalScoreSum = 0;
  let passingCount = 0;
  let publishedCount = 0;

  filteredStudentsList.forEach((s) => {
    const m = editableMarks[s.enrollmentId];
    const grade = m?.letterGrade || 'F';
    const total = Number(m?.totalMark) || 0;
    if (gradeDistribution[grade] !== undefined) gradeDistribution[grade]++;
    totalScoreSum += total;
    if (total >= 40) passingCount++;
    if (m?.gradingStatus === 'published') publishedCount++;
  });

  const classAverage = filteredStudentsList.length > 0 ? (totalScoreSum / filteredStudentsList.length).toFixed(1) : 0;
  const classPassRate = filteredStudentsList.length > 0 ? Math.round((passingCount / filteredStudentsList.length) * 100) : 0;

  return (
    <div className="page-wrapper anim-fade-in" style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Faculty Portal Banner Header with High-End Gradient & Glass Accent */}
      <div
        className="card card-interactive"
        style={{
          background: 'linear-gradient(135deg, #0b3954 0%, #0369a1 60%, #0284c7 100%)',
          color: '#ffffff',
          padding: '26px 30px',
          marginBottom: '22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '18px',
          boxShadow: '0 12px 30px -6px rgba(11, 57, 84, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#bae6fd', fontWeight: 'bold' }}>
            <GraduationCap size={18} color="#38bdf8" /> DIRE DAWA UNIVERSITY • FACULTY EXECUTIVE PORTAL
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '6px 0 4px', color: '#ffffff', letterSpacing: '-0.3px' }}>
            Lecturer Teaching Center & Grading Matrix
          </h1>
          <p style={{ fontSize: '13px', color: '#e0f2fe', margin: 0 }}>
            Faculty Member: <strong style={{ color: '#ffffff' }}>{user?.name || 'Faculty Member'}</strong> • ID: <strong style={{ color: '#fed7aa', fontFamily: 'monospace' }}>{user?.lecturerId || 'LEC/CS/101'}</strong> • Department: <strong>{user?.department?.name || 'Computer Science'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '30px',
              fontSize: '13px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="pulse-dot-green" />
            <span>{assignedCourses.length} Approved Teaching Assignments</span>
          </div>
        </div>
      </div>

      {/* Global Alerts & Notifications */}
      {notice && (
        <div
          className="card anim-fade-in"
          style={{
            backgroundColor: notice.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: notice.type === 'success' ? '#065f46' : '#991b1b',
            borderLeft: `5px solid ${notice.type === 'success' ? '#10b981' : '#ef4444'}`,
            padding: '14px 20px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {notice.type === 'success' ? <CheckCircle size={20} color="#10b981" /> : <AlertCircle size={20} color="#ef4444" />}
            <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Quick Action Interactive Cards with Micro-Lifts */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <Link to="/materials" className="card card-interactive" style={{ textDecoration: 'none', borderLeft: '4px solid #0284c7', margin: 0, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <BookOpen size={24} color="#0284c7" />
            <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>Manage ›</span>
          </div>
          <div style={{ fontWeight: 'bold', color: '#0b3954', fontSize: '14.5px', marginTop: '10px' }}>Course Materials</div>
          <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>Upload slides & type lecture notes</p>
        </Link>

        <Link to="/quizzes" className="card card-interactive" style={{ textDecoration: 'none', borderLeft: '4px solid #16a34a', margin: 0, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <HelpCircle size={24} color="#16a34a" />
            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>Build ›</span>
          </div>
          <div style={{ fontWeight: 'bold', color: '#0b3954', fontSize: '14.5px', marginTop: '10px' }}>Quizzes & Tests</div>
          <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>Practice bank & AI question generator</p>
        </Link>

        <Link to="/assignments" className="card card-interactive" style={{ textDecoration: 'none', borderLeft: '4px solid #f59e0b', margin: 0, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <FileSpreadsheet size={24} color="#f59e0b" />
            <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>Review ›</span>
          </div>
          <div style={{ fontWeight: 'bold', color: '#0b3954', fontSize: '14.5px', marginTop: '10px' }}>Assignments & Tasks</div>
          <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>Student homework & submissions</p>
        </Link>

        <Link to="/summarizer" className="card card-interactive" style={{ textDecoration: 'none', borderLeft: '4px solid #8b5cf6', margin: 0, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Sparkles size={24} color="#8b5cf6" />
            <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '700' }}>AI Assistant ›</span>
          </div>
          <div style={{ fontWeight: 'bold', color: '#0b3954', fontSize: '14.5px', marginTop: '10px' }}>Document Summarizer</div>
          <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>Synthesize multi-page course materials</p>
        </Link>
      </div>

      {/* Tabs Control Header with Underline Animation */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '22px', overflowX: 'auto', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('students')}
          style={{
            padding: '11px 20px',
            fontWeight: activeTab === 'students' ? '700' : '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'students' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'students' ? '#0284c7' : '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={17} />
          <span>My Assigned Students & Grading Matrix</span>
          {studentsData.length > 0 && (
            <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', fontSize: '11px', padding: '2px 9px', borderRadius: '12px', fontWeight: 'bold' }}>
              {studentsData.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teaching')}
          style={{
            padding: '11px 20px',
            fontWeight: activeTab === 'teaching' ? '700' : '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'teaching' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'teaching' ? '#0284c7' : '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
        >
          <BookOpen size={17} />
          <span>Teaching Assignments & Syllabus</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          style={{
            padding: '11px 20px',
            fontWeight: activeTab === 'progress' ? '700' : '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'progress' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'progress' ? '#0284c7' : '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
        >
          <TrendingUp size={17} />
          <span>Progress & At-Risk Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          style={{
            padding: '11px 20px',
            fontWeight: activeTab === 'announcements' ? '700' : '600',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'announcements' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'announcements' ? '#0284c7' : '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
        >
          <Megaphone size={17} />
          <span>Broadcast Announcements</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Assigned Students List & Integrated Grading System (Req 2, 3, 4, 5) */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="anim-fade-in">
          {/* Executive KPI Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '22px' }}>
            <div className="card card-interactive" style={{ padding: '16px 20px', borderLeft: '4px solid #0284c7', margin: 0 }}>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Approved Courses</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0b3954', marginTop: '2px' }}>
                {assignedCourses.length}
              </div>
              <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600', marginTop: '2px' }}>Active faculty assignments</div>
            </div>

            <div className="card card-interactive" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a', margin: 0 }}>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Enrolled Cohort</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>
                {studentsData.length}
              </div>
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginTop: '2px' }}>
                {selectedCourseObj ? `${selectedCourseObj.course.code} (Sec ${selectedCourseObj.section})` : 'All assigned'}
              </div>
            </div>

            <div className="card card-interactive" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b', margin: 0 }}>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Class Average Score</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#b45309', marginTop: '2px' }}>
                {classAverage} <span style={{ fontSize: '14px', color: '#78350f' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '11px', color: '#b45309', fontWeight: '600', marginTop: '2px' }}>
                Live mean based on current marks
              </div>
            </div>

            <div className="card card-interactive" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6', margin: 0 }}>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Projected Pass Rate</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#6d28d9', marginTop: '2px' }}>
                {classPassRate}%
              </div>
              <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: '600', marginTop: '2px' }}>
                {passingCount} of {filteredStudentsList.length} students ($Score \ge 40$)
              </div>
            </div>
          </div>

          {/* Interactive Course Selector Cards (Carousel Ribbon) */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0b3954', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} color="#0284c7" /> Select Official Teaching Course Assignment:
            </div>
            {assignedCourses.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>No approved teaching assignments assigned to your account.</p>
            ) : (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                {assignedCourses.map((a) => {
                  const isSelected = selectedCourseId === a.course.id;
                  return (
                    <button
                      key={a.course.id}
                      type="button"
                      onClick={() => {
                        setSelectedCourseId(a.course.id);
                        setSelectedProgressCourse(a.course.code);
                        setPostCourse(a.course.code);
                      }}
                      className="card-interactive"
                      style={{
                        padding: '12px 18px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        minWidth: '220px',
                        boxShadow: isSelected ? '0 4px 14px -1px rgba(2, 132, 199, 0.25)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '800', fontSize: '15px', color: isSelected ? '#0369a1' : '#0b3954' }}>
                          {a.course.code}
                        </span>
                        <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', backgroundColor: isSelected ? '#0284c7' : '#e2e8f0', color: isSelected ? '#ffffff' : '#475569', fontWeight: 'bold' }}>
                          Sec {a.section}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                        {a.course.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        Year {a.academicYear} Sem {a.semester} • <strong>{a.enrolledStudentsCount || 0} Enrolled</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Real-Time Grade Distribution & Class Health Gauge */}
          <div className="card anim-fade-in" style={{ padding: '16px 20px', marginBottom: '20px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color="#7e22ce" />
                <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#581c87' }}>
                  Live Class Grade Distribution (Interactive Preview)
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#7e22ce', fontWeight: '600' }}>
                Assessment Weights: Classwork ({weights.classwork}) • Quiz ({weights.quiz}) • Midterm ({weights.midterm}) • Final ({weights.finalExam})
              </span>
            </div>

            {/* Visual Grade Count Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(gradeDistribution).map(([grade, count]) => {
                const isFail = grade === 'F';
                const isTop = grade.startsWith('A');
                return (
                  <div
                    key={grade}
                    style={{
                      flex: 1,
                      minWidth: '50px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      padding: '8px 10px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: isFail ? '#dc2626' : isTop ? '#16a34a' : '#0284c7' }}>
                      {grade}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search, Cohort Filter & Export Control Console */}
          <div className="card" style={{ marginBottom: '20px', padding: '18px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', alignItems: 'flex-end', marginBottom: '14px' }}>
              {/* Search Box */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Search Roster (Name, ID, Email)
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '13px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search by student name or ID..."
                    style={{ paddingLeft: '32px' }}
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery('')}
                      style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Section Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Section Cohort
                </label>
                <select className="input-field" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                  <option value="ALL">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                </select>
              </div>

              {/* Publication Status Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Grading Publication Status
                </label>
                <select className="input-field" value={filterGradingStatus} onChange={(e) => setFilterGradingStatus(e.target.value)}>
                  <option value="ALL">All Grading States</option>
                  <option value="draft">Draft Mode Only</option>
                  <option value="published">Published Grades</option>
                </select>
              </div>

              {/* Quick Actions / CSV Export */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn-outline"
                  style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600' }}
                  title="Download Official CSV Grade Sheet"
                  disabled={filteredStudentsList.length === 0}
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentSearchQuery('');
                    setFilterSection('ALL');
                    setFilterGradingStatus('ALL');
                    fetchAssignedStudents(selectedCourseId);
                  }}
                  className="btn-outline"
                  style={{ padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Reset and refresh table"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Action Bar: Save Draft vs Publish */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: '#166534' }}>Official Grading Governance:</strong>
                <span style={{ fontSize: '12px', color: '#15803d', marginLeft: '6px' }}>
                  Draft marks are held privately. Published grades are synced to the university registrar & visible to students.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSaveGrades('draft')}
                  className="btn-accent"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '8px 18px', fontWeight: '600' }}
                  disabled={savingGrades || publishingGrades || filteredStudentsList.length === 0}
                >
                  <Save size={15} />
                  {savingGrades ? 'Saving Draft...' : 'Save Draft Marks'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveGrades('published')}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '8px 18px', backgroundColor: '#16a34a', fontWeight: '700' }}
                  disabled={savingGrades || publishingGrades || filteredStudentsList.length === 0}
                >
                  <Send size={15} />
                  {publishingGrades ? 'Publishing...' : 'Publish Grades to Students'}
                </button>
              </div>
            </div>
          </div>

          {/* Assigned Students & Interactive Assessment Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.06)' }}>
            {loadingStudents ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0284c7' }} />
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0b3954' }}>Loading Student Grade Sheet...</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Connecting to official Dire Dawa University enrollment database</div>
              </div>
            ) : assignedCourses.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                <AlertCircle size={36} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#0b3954' }}>No Approved Teaching Assignments</h3>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '480px', margin: '4px auto 0' }}>
                  You currently have no teaching assignments approved by the university administrator. Please contact the Registrar to assign courses.
                </p>
              </div>
            ) : filteredStudentsList.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                <Users size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#0b3954' }}>No Enrolled Students Matching Criteria</h3>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '480px', margin: '4px auto 0' }}>
                  No students are enrolled in this course matching the active filters. Try searching with a different term or selecting "All Sections".
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px', width: '40px' }}>#</th>
                      <th style={{ padding: '12px 14px', width: '130px' }}>Student ID</th>
                      <th style={{ padding: '12px 14px' }}>Student Details</th>
                      <th style={{ padding: '12px 14px', width: '80px' }}>Section</th>
                      <th style={{ padding: '12px 10px', width: '105px', textAlign: 'center' }}>
                        CW ({weights.classwork})
                      </th>
                      <th style={{ padding: '12px 10px', width: '105px', textAlign: 'center' }}>
                        Quiz ({weights.quiz})
                      </th>
                      <th style={{ padding: '12px 10px', width: '105px', textAlign: 'center' }}>
                        Midterm ({weights.midterm})
                      </th>
                      <th style={{ padding: '12px 10px', width: '105px', textAlign: 'center' }}>
                        Final ({weights.finalExam})
                      </th>
                      <th style={{ padding: '12px 12px', width: '110px', textAlign: 'center' }}>
                        Total (100)
                      </th>
                      <th style={{ padding: '12px 10px', width: '70px', textAlign: 'center' }}>Grade</th>
                      <th style={{ padding: '12px 10px', width: '70px', textAlign: 'center' }}>Points</th>
                      <th style={{ padding: '12px 12px', width: '110px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', width: '90px' }}>Dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudentsList.map((s, idx) => {
                      const marks = editableMarks[s.enrollmentId] || {
                        classworkScore: 0,
                        quizScore: 0,
                        midtermScore: 0,
                        finalExamScore: 0,
                        totalMark: 0,
                        letterGrade: 'F',
                        gradePoint: 0.0,
                        gradingStatus: 'draft',
                      };

                      const isPublished = marks.gradingStatus === 'published';
                      const isPassing = (marks.totalMark || 0) >= 40;

                      // Validation checks against max weights
                      const cwExceeded = Number(marks.classworkScore) > weights.classwork;
                      const qzExceeded = Number(marks.quizScore) > weights.quiz;
                      const midExceeded = Number(marks.midtermScore) > weights.midterm;
                      const finExceeded = Number(marks.finalExamScore) > weights.finalExam;

                      // Fill progress color
                      const fillColor =
                        marks.totalMark >= 85
                          ? '#10b981'
                          : marks.totalMark >= 70
                          ? '#0284c7'
                          : marks.totalMark >= 50
                          ? '#f59e0b'
                          : '#ef4444';

                      return (
                        <tr
                          key={s.enrollmentId}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: '500' }}>{idx + 1}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0284c7', fontFamily: 'monospace' }}>
                            {s.student.studentId}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '600', color: '#0b3954' }}>{s.student.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{s.student.email}</div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', fontSize: '11px' }}>
                              Sec {s.student.section}
                            </span>
                          </td>

                          {/* Classwork Input */}
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max={weights.classwork}
                              step="0.5"
                              className="input-field"
                              style={{
                                width: '82px',
                                padding: '6px 8px',
                                fontSize: '13px',
                                textAlign: 'center',
                                fontWeight: '700',
                                color: '#0b3954',
                                borderColor: cwExceeded ? '#ef4444' : '#cbd5e1',
                                backgroundColor: cwExceeded ? '#fef2f2' : '#ffffff',
                              }}
                              value={marks.classworkScore ?? 0}
                              onChange={(e) => handleMarkChange(s.enrollmentId, 'classworkScore', e.target.value)}
                            />
                            {cwExceeded && <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 'bold' }}>Max {weights.classwork}!</div>}
                          </td>

                          {/* Quiz Input */}
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max={weights.quiz}
                              step="0.5"
                              className="input-field"
                              style={{
                                width: '82px',
                                padding: '6px 8px',
                                fontSize: '13px',
                                textAlign: 'center',
                                fontWeight: '700',
                                color: '#0b3954',
                                borderColor: qzExceeded ? '#ef4444' : '#cbd5e1',
                                backgroundColor: qzExceeded ? '#fef2f2' : '#ffffff',
                              }}
                              value={marks.quizScore ?? 0}
                              onChange={(e) => handleMarkChange(s.enrollmentId, 'quizScore', e.target.value)}
                            />
                            {qzExceeded && <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 'bold' }}>Max {weights.quiz}!</div>}
                          </td>

                          {/* Midterm Input */}
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max={weights.midterm}
                              step="0.5"
                              className="input-field"
                              style={{
                                width: '82px',
                                padding: '6px 8px',
                                fontSize: '13px',
                                textAlign: 'center',
                                fontWeight: '700',
                                color: '#0b3954',
                                borderColor: midExceeded ? '#ef4444' : '#cbd5e1',
                                backgroundColor: midExceeded ? '#fef2f2' : '#ffffff',
                              }}
                              value={marks.midtermScore ?? 0}
                              onChange={(e) => handleMarkChange(s.enrollmentId, 'midtermScore', e.target.value)}
                            />
                            {midExceeded && <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 'bold' }}>Max {weights.midterm}!</div>}
                          </td>

                          {/* Final Exam Input */}
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max={weights.finalExam}
                              step="0.5"
                              className="input-field"
                              style={{
                                width: '82px',
                                padding: '6px 8px',
                                fontSize: '13px',
                                textAlign: 'center',
                                fontWeight: '700',
                                color: '#0b3954',
                                borderColor: finExceeded ? '#ef4444' : '#cbd5e1',
                                backgroundColor: finExceeded ? '#fef2f2' : '#ffffff',
                              }}
                              value={marks.finalExamScore ?? 0}
                              onChange={(e) => handleMarkChange(s.enrollmentId, 'finalExamScore', e.target.value)}
                            />
                            {finExceeded && <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 'bold' }}>Max {weights.finalExam}!</div>}
                          </td>

                          {/* Total Mark with Live Visual Progress Bar */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0b3954' }}>
                              {marks.totalMark}
                            </div>
                            <div className="score-progress-bar">
                              <div
                                className="score-progress-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(0, marks.totalMark))}%`,
                                  backgroundColor: fillColor,
                                }}
                              />
                            </div>
                          </td>

                          {/* Auto-Calculated Letter Grade */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                minWidth: '32px',
                                padding: '3px 6px',
                                borderRadius: '6px',
                                fontWeight: '800',
                                fontSize: '12.5px',
                                backgroundColor: isPassing ? '#ecfdf5' : '#fef2f2',
                                color: isPassing ? '#15803d' : '#dc2626',
                                border: `1px solid ${isPassing ? '#bbf7d0' : '#fecaca'}`,
                              }}
                            >
                              {marks.letterGrade}
                            </span>
                          </td>

                          {/* Auto-Calculated Grade Point */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700', color: '#475569' }}>
                            {typeof marks.gradePoint === 'number' ? marks.gradePoint.toFixed(2) : marks.gradePoint}
                          </td>

                          {/* Publication Status Badge with Animated Dot */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 9px',
                                borderRadius: '14px',
                                fontSize: '11px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                backgroundColor: isPublished ? '#dcfce7' : '#fef3c7',
                                color: isPublished ? '#15803d' : '#b45309',
                                border: `1px solid ${isPublished ? '#86efac' : '#fde68a'}`,
                              }}
                            >
                              {isPublished ? (
                                <>
                                  <Check size={11} strokeWidth={3} /> Published
                                </>
                              ) : (
                                <>
                                  <span className="pulse-dot-amber" /> Draft
                                </>
                              )}
                            </span>
                          </td>

                          {/* Action Button: View Student Academic Dossier */}
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenStudentInfo(s.student.id)}
                              className="btn-accent"
                              style={{
                                fontSize: '11.5px',
                                padding: '5px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: '600',
                                borderRadius: '6px',
                              }}
                              title="View Student Academic Record Dossier"
                            >
                              <Eye size={13} /> Dossier
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Teaching Assignments (Preserved & Styled) */}
      {/* ========================================================================= */}
      {activeTab === 'teaching' && (
        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', color: '#0b3954', margin: 0, fontWeight: '700' }}>
                  Approved Teaching Assignments & Class Overviews
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Manage customized course descriptions for your assigned cohorts. If provided, your explanation replaces the default syllabus description.
                </span>
              </div>
              <Link to="/materials" className="btn-accent" style={{ fontSize: '12px', padding: '7px 14px', fontWeight: '600' }}>
                + Upload / Type Lecture Notes
              </Link>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 16px' }}>Course</th>
                  <th style={{ padding: '10px 16px' }}>Department</th>
                  <th style={{ padding: '10px 16px' }}>Academic Class</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Course Overview / Explanation</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachingAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No teaching assignments found. Contact the Registrar to assign courses.
                    </td>
                  </tr>
                ) : (
                  teachingAssignments.map((a) => (
                    <tr key={a._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 'bold', color: '#0b3954' }}>{a.course?.code}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{a.course?.name}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{a.department?.name || 'Computer Science'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        Year {a.academicYear} • Sem {a.semester} • <strong>Sec {a.section}</strong>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: a.status === 'approved' ? '#dcfce7' : '#fef3c7',
                            color: a.status === 'approved' ? '#15803d' : '#b45309',
                          }}
                        >
                          {a.status === 'approved' ? 'Active / Approved' : a.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '320px' }}>
                        {editingAssignmentId === a._id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <textarea
                              className="input-field"
                              rows="3"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              placeholder="Write a clear syllabus note or explanation for your students..."
                              style={{ fontSize: '12px' }}
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleSaveDescription(a._id)}
                                className="btn-primary"
                                style={{ fontSize: '11px', padding: '4px 10px' }}
                                disabled={savingDesc}
                              >
                                {savingDesc ? 'Saving...' : 'Save Description'}
                              </button>
                              <button
                                onClick={() => setEditingAssignmentId(null)}
                                className="btn-accent"
                                style={{ fontSize: '11px', padding: '4px 10px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '12px', color: a.courseDescription ? '#334155' : '#94a3b8', fontStyle: a.courseDescription ? 'normal' : 'italic' }}>
                              {a.courseDescription || 'Using default university catalog description.'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {editingAssignmentId !== a._id && (
                          <button
                            onClick={() => {
                              setEditingAssignmentId(a._id);
                              setEditDesc(a.courseDescription || '');
                            }}
                            className="btn-accent"
                            style={{ fontSize: '11px', padding: '5px 10px', fontWeight: '600' }}
                          >
                            Edit Overview
                          </button>
                        )}
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
      {/* TAB 3: Student Progress Analytics (Preserved & Styled) */}
      {/* ========================================================================= */}
      {activeTab === 'progress' && (
        <div className="anim-fade-in">
          {/* Course Selector & Search Controls */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <strong style={{ fontSize: '14px', color: '#0b3954' }}>Filter Course:</strong>
              <select
                className="input-field"
                value={selectedProgressCourse}
                onChange={(e) => setSelectedProgressCourse(e.target.value)}
                style={{ minWidth: '180px' }}
              >
                {assignedCourses.map((a) => (
                  <option key={a.course.id} value={a.course.code}>
                    {a.course.code} - {a.course.name}
                  </option>
                ))}
                {assignedCourses.length === 0 && <option value="COSC1011">COSC1011</option>}
              </select>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search students..."
                style={{ paddingLeft: '32px' }}
                value={progressSearch}
                onChange={(e) => setProgressSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Progress Analytics Summary Cards */}
          {loadingProgress ? (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#0284c7' }} />
              Loading student progress analytics...
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div className="card card-interactive" style={{ padding: '16px 20px', borderLeft: '4px solid #0284c7', margin: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>CLASS QUIZ AVERAGE</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#0369a1', marginTop: '2px' }}>
                    {progressData?.classQuizAverage || 0}%
                  </div>
                </div>

                <div className="card card-interactive" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a', margin: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>ASSIGNMENT COMPLETION</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>
                    {progressData?.classCompletionRate || 0}%
                  </div>
                </div>

                <div className="card card-interactive" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444', margin: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>AT-RISK STUDENTS</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#b91c1c', marginTop: '2px' }}>
                    {progressData?.atRiskCount || 0}
                  </div>
                </div>
              </div>

              {/* Progress Students Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 16px' }}>Student</th>
                      <th style={{ padding: '10px 16px' }}>Quizzes Taken</th>
                      <th style={{ padding: '10px 16px' }}>Quiz Avg</th>
                      <th style={{ padding: '10px 16px' }}>Assignments Submitted</th>
                      <th style={{ padding: '10px 16px' }}>Overall Progress</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!progressData?.students || progressData.students.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                          No progress data recorded yet.
                        </td>
                      </tr>
                    ) : (
                      progressData.students.map((st, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <strong>{st.student?.name}</strong> ({st.student?.studentId || 'N/A'})
                          </td>
                          <td style={{ padding: '10px 16px' }}>{st.quizzesTaken} / {st.totalQuizzes}</td>
                          <td style={{ padding: '10px 16px' }}>{st.quizAverage}%</td>
                          <td style={{ padding: '10px 16px' }}>{st.assignmentsSubmitted} / {st.totalAssignments}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '80px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${st.overallAverage}%`, height: '100%', backgroundColor: st.isAtRisk ? '#ef4444' : '#16a34a' }} />
                              </div>
                              <span>{st.overallAverage}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                backgroundColor: st.isAtRisk ? '#fee2e2' : '#dcfce7',
                                color: st.isAtRisk ? '#b91c1c' : '#15803d',
                              }}
                            >
                              {st.isAtRisk ? 'At Risk' : 'On Track'}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Announcements (Preserved & Styled) */}
      {/* ========================================================================= */}
      {activeTab === 'announcements' && (
        <div className="anim-fade-in">
          {/* Post Announcement Form */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', color: '#0b3954', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
              <Megaphone size={18} color="#0284c7" /> Broadcast Class Announcement
            </h3>

            <form onSubmit={handlePostAnnouncement}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Midterm Examination Schedule Announcement"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    Target Course
                  </label>
                  <select className="input-field" value={postCourse} onChange={(e) => setPostCourse(e.target.value)}>
                    {assignedCourses.map((a) => (
                      <option key={a.course.id} value={a.course.code}>
                        {a.course.code} ({a.section})
                      </option>
                    ))}
                    {assignedCourses.length === 0 && <option value="COSC1011">COSC1011</option>}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Announcement Message
                </label>
                <textarea
                  className="input-field"
                  rows="4"
                  placeholder="Type important updates, deadline reminders, or exam schedules..."
                  value={postMessage}
                  onChange={(e) => setPostMessage(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
                  <span style={{ fontWeight: 'bold', color: isUrgent ? '#dc2626' : '#64748b' }}>Mark as Urgent Notification</span>
                </label>

                <button type="submit" className="btn-primary" disabled={posting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={15} />
                  {posting ? 'Broadcasting...' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>

          {/* Announcements Feed */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ fontSize: '15px', color: '#0b3954', margin: 0, fontWeight: '700' }}>Active Class Announcements</h3>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {announcements.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No announcements posted yet.</div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann._id} className="card-interactive" style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#0b3954' }}>{ann.title}</strong>
                        <span style={{ fontSize: '11px', color: '#0284c7', marginLeft: '8px', fontWeight: 'bold' }}>({ann.courseCode})</span>
                      </div>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann._id, ann.title)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                        title="Delete announcement"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#334155', margin: '4px 0 8px', whiteSpace: 'pre-wrap' }}>{ann.message}</p>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Posted on {new Date(ann.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Student Academic Information Dossier Modal (Req 2, 3) */}
      {/* ========================================================================= */}
      {inspectStudentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 57, 84, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div className="card anim-scale-in" style={{ maxWidth: '680px', width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: '26px', backgroundColor: '#ffffff', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                  {inspectStudentModal.student?.name ? inspectStudentModal.student.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#0284c7', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    Official University Student Academic Dossier
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0b3954', margin: '2px 0 0' }}>
                    {inspectStudentModal.student?.name}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    ID: <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>{inspectStudentModal.student?.studentId}</strong> • {inspectStudentModal.student?.email}
                  </div>
                </div>
              </div>

              <button onClick={() => setInspectStudentModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            {/* Student Profile Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Academic Department</div>
                <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#0b3954' }}>{inspectStudentModal.student?.department}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Academic Cohort</div>
                <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#0b3954' }}>
                  Year {inspectStudentModal.student?.yearOfStudy} • Sem {inspectStudentModal.student?.semester} • Sec {inspectStudentModal.student?.section}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Cumulative CGPA</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7' }}>
                  {inspectStudentModal.academicRecord ? inspectStudentModal.academicRecord.cgpa?.toFixed(2) : '3.65'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Senate Academic Standing</div>
                <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#16a34a' }}>
                  {inspectStudentModal.academicRecord ? inspectStudentModal.academicRecord.academicStanding : 'Good Standing'}
                </div>
              </div>
            </div>

            {/* Courses Enrolled with this Lecturer */}
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b3954', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} color="#0284c7" /> Enrolled Courses & Assessment History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {inspectStudentModal.enrolledCourses?.map((c, cIdx) => (
                <div key={cIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '12.5px' }}>
                  <span><strong>{c.code}</strong> - {c.name} ({c.credits} ECTS)</span>
                  <span style={{ fontWeight: 'bold', color: c.grade === 'F' ? '#dc2626' : '#15803d', backgroundColor: c.grade === 'F' ? '#fee2e2' : '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                    {c.grade} {c.totalMark !== undefined ? `(${c.totalMark} pts)` : ''}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setInspectStudentModal(null)} className="btn-accent" style={{ fontSize: '12.5px', padding: '8px 18px', fontWeight: '600' }}>
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
