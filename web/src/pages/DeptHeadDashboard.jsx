import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart2,
  Users,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Download,
  Printer,
  Filter,
  RefreshCw,
  BookOpen,
  Clock,
  Shield,
  Search,
  Eye,
  AlertCircle,
  FileText,
  Check,
  X,
  Award,
  Layers,
  GraduationCap,
} from 'lucide-react';

export const DeptHeadDashboard = () => {
  const { user } = useAuth();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('performance'); // 'performance' | 'instructors' | 'materials' | 'reports'

  // Core Data States
  const [deptInfo, setDeptInfo] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [reports, setReports] = useState(null);

  // Loading & Notifications
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  // Performance Filters
  const [perfYear, setPerfYear] = useState('ALL');
  const [perfSem, setPerfSem] = useState('ALL');
  const [perfSection, setPerfSection] = useState('ALL');
  const [perfCourseCode, setPerfCourseCode] = useState('');

  // Materials Filters & Modals
  const [matStatus, setMatStatus] = useState('all');
  const [matSearch, setMatSearch] = useState('');
  const [flagModalMaterial, setFlagModalMaterial] = useState(null);
  const [flagReasonInput, setFlagReasonInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState(null);

  // Reports Filters
  const [repYear, setRepYear] = useState('ALL');
  const [repSem, setRepSem] = useState('ALL');
  const [repSection, setRepSection] = useState('ALL');
  const [repStanding, setRepStanding] = useState('ALL');

  // Load Department Metadata
  const loadDeptInfo = async () => {
    try {
      const res = await api.get('/department/info');
      setDeptInfo(res.data.data);
    } catch (err) {
      console.error('Failed to load department info:', err);
      setError(err.response?.data?.message || 'Failed to load department profile.');
    }
  };

  // Load Performance Metrics
  const loadPerformance = async () => {
    try {
      const params = {};
      if (perfYear !== 'ALL') params.academicYear = perfYear;
      if (perfSem !== 'ALL') params.semester = perfSem;
      if (perfSection !== 'ALL') params.section = perfSection;
      if (perfCourseCode.trim()) params.courseCode = perfCourseCode.trim();

      const res = await api.get('/department/performance', { params });
      setPerformance(res.data.data);
    } catch (err) {
      console.error('Failed to load performance data:', err);
      setError(err.response?.data?.message || 'Failed to load performance metrics.');
    }
  };

  // Load Lecturer Activities
  const loadInstructors = async () => {
    try {
      const res = await api.get('/department/instructors');
      setInstructors(res.data.data || []);
    } catch (err) {
      console.error('Failed to load instructors data:', err);
    }
  };

  // Load Learning Materials
  const loadMaterials = async () => {
    try {
      const params = {};
      if (matStatus !== 'all') params.approvalStatus = matStatus;
      if (matSearch.trim()) params.search = matSearch.trim();

      const res = await api.get('/department/materials', { params });
      setMaterials(res.data.data || []);
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  };

  // Load Departmental Reports
  const loadReports = async () => {
    try {
      const params = {};
      if (repYear !== 'ALL') params.academicYear = repYear;
      if (repSem !== 'ALL') params.semester = repSem;
      if (repSection !== 'ALL') params.section = repSection;
      if (repStanding !== 'ALL') params.standing = repStanding;

      const res = await api.get('/department/reports', { params });
      setReports(res.data.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  // Master Initial Data Load
  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        loadDeptInfo(),
        loadPerformance(),
        loadInstructors(),
        loadMaterials(),
        loadReports(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Reload tab-specific data when tab or filters change
  useEffect(() => {
    if (!loading) {
      if (activeTab === 'performance') loadPerformance();
      if (activeTab === 'instructors') loadInstructors();
      if (activeTab === 'materials') loadMaterials();
      if (activeTab === 'reports') loadReports();
    }
  }, [activeTab, perfYear, perfSem, perfSection, perfCourseCode, matStatus, repYear, repSem, repSection, repStanding]);

  // Handle Material Approval or Flagging
  const handleReviewMaterial = async (materialId, status, flagReason) => {
    setSubmittingReview(true);
    setError('');
    setNotice('');
    try {
      const res = await api.patch(`/department/materials/${materialId}/approval`, {
        status,
        flagReason: status === 'flagged' ? flagReason : undefined,
      });
      setNotice(res.data.message || `Material marked as ${status}.`);
      setFlagModalMaterial(null);
      setFlagReasonInput('');
      await loadMaterials();
      await loadDeptInfo();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update material approval status.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Export Official Department Academic Report PDF
  const handleExportPDF = async () => {
    setExportingPdf(true);
    setError('');
    try {
      const params = {};
      if (repYear !== 'ALL') params.academicYear = repYear;
      if (repSem !== 'ALL') params.semester = repSem;
      if (repSection !== 'ALL') params.section = repSection;
      if (repStanding !== 'ALL') params.standing = repStanding;

      const response = await api.get('/department/reports/pdf', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Department_Report_${deptInfo?.department?.code || 'COSC'}_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download official PDF report.');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: '#0284c7', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b3954' }}>
          Loading Department Head Executive Portal...
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Retrieving departmental performance statistics, faculty activities, and academic quality records...
        </p>
      </div>
    );
  }

  const dept = deptInfo?.department || {};
  const isWorkflowRequired = !!deptInfo?.materialApprovalRequired;

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Executive University Header */}
      <div
        className="card"
        style={{
          backgroundColor: '#0b3954',
          color: '#ffffff',
          padding: '24px 28px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#93c5fd' }}>
            <GraduationCap size={16} /> DIRE DAWA UNIVERSITY • INSTITUTE OF TECHNOLOGY
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '6px 0 2px', color: '#ffffff' }}>
            {dept.name || 'Department Academic Executive Portal'}
          </h1>
          <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
            Department Code: <strong>{dept.code || 'COSC'}</strong> • Head of Department: <strong>{user?.name || 'Assigned Department Head'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              backgroundColor: isWorkflowRequired ? '#f59e0b' : '#0284c7',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={14} />
            {isWorkflowRequired ? 'Material Approval Required' : 'Material Monitoring Mode'}
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              loadAll().then(() => setRefreshing(false));
            }}
            className="btn-accent"
            style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Alerts & Notices */}
      {error && (
        <div className="card" style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '12px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {notice && (
        <div className="card" style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #16a34a', color: '#15803d', padding: '12px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Top Department KPI Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #16a34a', margin: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Overall Pass Rate</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#15803d', marginTop: '4px' }}>
            {performance?.overallPassRate !== undefined ? `${performance.overallPassRate}%` : '88.5%'}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>University Target: 80%</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #0284c7', margin: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Average Dept CGPA</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0369a1', marginTop: '4px' }}>
            {performance?.averageCGPA !== undefined ? performance.averageCGPA.toFixed(2) : '3.24'}
          </div>
          <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>Academic Senate Standing</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6', margin: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Active Students</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6d28d9', marginTop: '4px' }}>
            {performance?.totalStudents || deptInfo?.kpiSummary?.studentsCount || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '2px' }}>Assigned to {dept.code || 'COSC'}</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #0f766e', margin: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Faculty Lecturers</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f766e', marginTop: '4px' }}>
            {instructors.length || deptInfo?.kpiSummary?.lecturersCount || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '2px' }}>Teaching assigned courses</div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b', margin: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Pending Material Reviews</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#b45309', marginTop: '4px' }}>
            {materials.filter((m) => m.approvalStatus === 'pending').length}
          </div>
          <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
            {isWorkflowRequired ? 'Action Required' : 'Monitoring Mode'}
          </div>
        </div>
      </div>

      {/* 4 Core Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', overflowX: 'auto', paddingBottom: '2px' }}>
        <button
          onClick={() => { setActiveTab('performance'); setError(''); setNotice(''); }}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'performance' ? '700' : '500',
            fontSize: '14px',
            color: activeTab === 'performance' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'performance' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <BarChart2 size={16} /> Department Performance Monitoring
        </button>

        <button
          onClick={() => { setActiveTab('instructors'); setError(''); setNotice(''); }}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'instructors' ? '700' : '500',
            fontSize: '14px',
            color: activeTab === 'instructors' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'instructors' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <Users size={16} /> Lecturer Activity Monitoring
        </button>

        <button
          onClick={() => { setActiveTab('materials'); setError(''); setNotice(''); }}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'materials' ? '700' : '500',
            fontSize: '14px',
            color: activeTab === 'materials' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'materials' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <FileCheck size={16} /> Learning Material Review
          {materials.filter((m) => m.approvalStatus === 'pending').length > 0 && (
            <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', padding: '2px 7px', borderRadius: '10px', fontWeight: 'bold' }}>
              {materials.filter((m) => m.approvalStatus === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('reports'); setError(''); setNotice(''); }}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'reports' ? '700' : '500',
            fontSize: '14px',
            color: activeTab === 'reports' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'reports' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <FileText size={16} /> Academic Reports & Roster
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Department Performance Monitoring (Requirement 2) */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div>
          {/* Cohort Filter Bar */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px 20px', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Filter size={16} color="#0284c7" />
              <strong style={{ fontSize: '13px', color: '#0b3954' }}>Filter Department Academic Performance Cohort:</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Academic Year
                </label>
                <select className="input-field" value={perfYear} onChange={(e) => setPerfYear(e.target.value)}>
                  <option value="ALL">All Academic Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Semester
                </label>
                <select className="input-field" value={perfSem} onChange={(e) => setPerfSem(e.target.value)}>
                  <option value="ALL">All Semesters</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Assigned Section
                </label>
                <select className="input-field" value={perfSection} onChange={(e) => setPerfSection(e.target.value)}>
                  <option value="ALL">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                  <option value="E">Section E</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Course Code Filter
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. COSC1011"
                  value={perfCourseCode}
                  onChange={(e) => setPerfCourseCode(e.target.value)}
                />
              </div>

              <div>
                <button
                  onClick={() => {
                    setPerfYear('ALL');
                    setPerfSem('ALL');
                    setPerfSection('ALL');
                    setPerfCourseCode('');
                  }}
                  className="btn-accent"
                  style={{ width: '100%', height: '38px', fontSize: '12px' }}
                >
                  Reset Cohort Filters
                </button>
              </div>
            </div>
          </div>

          {/* Grade Distribution & Senate Standings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '22px' }}>
            {/* Grade Distribution */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b3954', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="#0284c7" /> Official Grade Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(performance?.gradeDistribution || {}).map(([gr, count]) => (
                  <div key={gr} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '32px', fontWeight: 'bold', fontSize: '13px', color: gr === 'F' ? '#dc2626' : '#0b3954' }}>
                      {gr}
                    </span>
                    <div style={{ flex: 1, height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: gr === 'F' ? '#dc2626' : gr.startsWith('A') ? '#16a34a' : gr.startsWith('B') ? '#0284c7' : '#f59e0b',
                          width: `${Math.min(100, (count / Math.max(1, performance?.totalStudents || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span style={{ width: '40px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Academic Senate Standing Distribution */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0b3954', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#0284c7" /> Academic Senate Standings
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.entries(performance?.academicStandingDistribution || {}).map(([st, count]) => (
                  <div
                    key={st}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{st}</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: st.includes('Distinction') ? '#16a34a' : st === 'Probation' ? '#dc2626' : '#0369a1', marginTop: '2px' }}>
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Course Completion & Pass Rates Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b3954', margin: 0 }}>
                  Course Completion & Capacity Performance ({performance?.courseStats?.length || 0} Courses)
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Live enrollment vs capacity, occupancy rate, and pass rate statistics
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Code</th>
                    <th style={{ padding: '10px 16px' }}>Course Title</th>
                    <th style={{ padding: '10px 16px' }}>Curriculum</th>
                    <th style={{ padding: '10px 16px' }}>Credits</th>
                    <th style={{ padding: '10px 16px' }}>Enrollment / Capacity</th>
                    <th style={{ padding: '10px 16px' }}>Occupancy</th>
                    <th style={{ padding: '10px 16px' }}>Pass Rate</th>
                    <th style={{ padding: '10px 16px' }}>Avg Course GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {!performance?.courseStats || performance.courseStats.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        No course records found matching the applied cohort filters.
                      </td>
                    </tr>
                  ) : (
                    performance.courseStats.map((c) => (
                      <tr key={c.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0284c7' }}>{c.code}</td>
                        <td style={{ padding: '10px 16px', fontWeight: '500' }}>{c.name}</td>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>Year {c.academicYear} Sem {c.semester}</td>
                        <td style={{ padding: '10px 16px' }}>{c.credits} ECTS</td>
                        <td style={{ padding: '10px 16px' }}>
                          <strong>{c.enrolled}</strong> / {c.capacity} students
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '70px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, c.occupancyRate)}%`, height: '100%', backgroundColor: c.occupancyRate > 90 ? '#dc2626' : '#0284c7' }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>{c.occupancyRate}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              backgroundColor: c.passRate >= 85 ? '#dcfce7' : c.passRate >= 70 ? '#fef3c7' : '#fee2e2',
                              color: c.passRate >= 85 ? '#15803d' : c.passRate >= 70 ? '#b45309' : '#b91c1c',
                            }}
                          >
                            {c.passRate}% Pass
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0b3954' }}>
                          {c.averageGPA} / 4.0
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Lecturer Activity Monitoring (Requirement 3) */}
      {/* ========================================================================= */}
      {activeTab === 'instructors' && (
        <div>
          <div className="card" style={{ marginBottom: '20px', padding: '16px 20px', backgroundColor: '#f0fdf4', borderLeft: '4px solid #16a34a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} color="#16a34a" />
              <div>
                <strong style={{ color: '#15803d', fontSize: '14px' }}>
                  Read-Only Academic Quality & Instructor Activity Monitoring
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#166534' }}>
                  Department Heads monitor lecture material uploads, quiz assignments, and student submission grading completion without modifying lecturer accounts.
                </p>
              </div>
            </div>
          </div>

          {instructors.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No faculty lecturers found for {dept.name || 'this department'}.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              {instructors.map((inst) => (
                <div key={inst.instructor.id} className="card" style={{ padding: '20px', borderTop: '4px solid #0284c7' }}>
                  {/* Instructor Identity Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b3954', margin: 0 }}>
                        {inst.instructor.name}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        ID: <strong style={{ color: '#0284c7' }}>{inst.instructor.lecturerId}</strong> • {inst.instructor.email}
                      </div>
                    </div>
                    <span className="badge badge-lecturer" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                      {inst.instructor.status}
                    </span>
                  </div>

                  {/* Teaching Assignments */}
                  <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Approved Teaching Classes ({inst.teachingAssignments?.length || 0})
                    </div>
                    {!inst.teachingAssignments || inst.teachingAssignments.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                        No approved teaching assignments recorded.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {inst.teachingAssignments.map((a, aIdx) => (
                          <div key={aIdx} style={{ fontSize: '12px', color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}>
                            <span><strong>{a.courseCode}</strong> - {a.courseName}</span>
                            <span style={{ color: '#0284c7', fontWeight: '600' }}>Y{a.academicYear} S{a.semester} Sec {a.section}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Materials & Grading Progress Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ backgroundColor: '#f1f5f9', padding: '10px 12px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Lecture Materials</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b3954', marginTop: '2px' }}>
                        {inst.materialsStats?.total || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: '#16a34a' }}>
                        {inst.materialsStats?.approved || 0} Approved • {inst.materialsStats?.pending || 0} Pending
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f1f5f9', padding: '10px 12px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Assignments Created</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b3954', marginTop: '2px' }}>
                        {inst.evaluations?.assignmentsCreated || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Quizzes: {inst.evaluations?.quizzesCreated || 0}
                      </div>
                    </div>
                  </div>

                  {/* Submission Grading Completion Gauge */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b', fontWeight: '500' }}>Student Grading Completion:</span>
                      <strong style={{ color: inst.evaluations?.gradingCompletionRate >= 80 ? '#15803d' : '#b45309' }}>
                        {inst.evaluations?.gradingCompletionRate}% ({inst.evaluations?.submissionsGraded} / {inst.evaluations?.submissionsReceived})
                      </strong>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${inst.evaluations?.gradingCompletionRate || 100}%`,
                          backgroundColor: inst.evaluations?.gradingCompletionRate >= 80 ? '#16a34a' : '#f59e0b',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Learning Material Review Workflow (Requirement 5) */}
      {/* ========================================================================= */}
      {activeTab === 'materials' && (
        <div>
          {/* Workflow Status Banner (Requirement 5) */}
          <div
            className="card"
            style={{
              marginBottom: '20px',
              padding: '16px 20px',
              backgroundColor: isWorkflowRequired ? '#fffbeb' : '#f0f9ff',
              borderLeft: isWorkflowRequired ? '4px solid #f59e0b' : '4px solid #0284c7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isWorkflowRequired ? <AlertTriangle size={22} color="#d97706" /> : <Shield size={22} color="#0284c7" />}
              <div>
                <strong style={{ fontSize: '14px', color: isWorkflowRequired ? '#92400e' : '#0369a1' }}>
                  {isWorkflowRequired
                    ? 'Material Approval Workflow is ENABLED'
                    : 'Material Approval Workflow is in MONITORING MODE'}
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: isWorkflowRequired ? '#b45309' : '#0284c7' }}>
                  {isWorkflowRequired
                    ? 'Faculty uploads are held in "Pending Review" status until approved by the Department Head. Students only access approved materials.'
                    : 'System setting has material approval disabled. Faculty materials are auto-published. Department Head has monitoring oversight.'}
                </p>
              </div>
            </div>
          </div>

          {/* Materials Filter Tabs & Search Bar */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'pending', 'approved', 'flagged'].map((st) => (
                <button
                  key={st}
                  onClick={() => setMatStatus(st)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: matStatus === st ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    backgroundColor: matStatus === st ? '#e0f2fe' : '#ffffff',
                    color: matStatus === st ? '#0284c7' : '#64748b',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {st === 'all' ? 'All Materials' : st}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search materials by title, code..."
                style={{ paddingLeft: '32px' }}
                value={matSearch}
                onChange={(e) => setMatSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Materials Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Title & Subject</th>
                    <th style={{ padding: '10px 16px' }}>Course Code</th>
                    <th style={{ padding: '10px 16px' }}>Target Class</th>
                    <th style={{ padding: '10px 16px' }}>Uploader</th>
                    <th style={{ padding: '10px 16px' }}>Upload Date</th>
                    <th style={{ padding: '10px 16px' }}>Status</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No learning materials found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    materials.map((m) => (
                      <tr key={m._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontWeight: '600', color: '#0b3954' }}>{m.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Topic: {m.subject} • Type: {m.materialType?.toUpperCase()}</div>
                          {m.flagReason && (
                            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '2px', backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                              <strong>Revision Note:</strong> {m.flagReason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0284c7' }}>{m.courseCode}</td>
                        <td style={{ padding: '10px 16px', color: '#475569' }}>
                          Year {m.academicYear} Sem {m.semester} ({m.section || 'ALL'})
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontWeight: '500' }}>{m.uploadedBy?.name || 'Faculty Member'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{m.uploadedBy?.lecturerId || m.uploadedBy?.email}</div>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              backgroundColor:
                                m.approvalStatus === 'approved'
                                  ? '#dcfce7'
                                  : m.approvalStatus === 'pending'
                                  ? '#fef3c7'
                                  : '#fee2e2',
                              color:
                                m.approvalStatus === 'approved'
                                  ? '#15803d'
                                  : m.approvalStatus === 'pending'
                                  ? '#b45309'
                                  : '#b91c1c',
                            }}
                          >
                            {m.approvalStatus}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setPreviewMaterial(m)}
                              className="btn-accent"
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Inspect Content"
                            >
                              <Eye size={13} /> View
                            </button>

                            {isWorkflowRequired && m.approvalStatus !== 'approved' && (
                              <button
                                onClick={() => handleReviewMaterial(m._id, 'approved')}
                                className="btn-primary"
                                style={{ backgroundColor: '#16a34a', padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                disabled={submittingReview}
                                title="Approve for Student Publication"
                              >
                                <Check size={13} /> Approve
                              </button>
                            )}

                            {isWorkflowRequired && m.approvalStatus !== 'flagged' && (
                              <button
                                onClick={() => {
                                  setFlagModalMaterial(m);
                                  setFlagReasonInput('');
                                }}
                                style={{
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                disabled={submittingReview}
                                title="Flag for Content Revision"
                              >
                                <X size={13} /> Flag
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Departmental Academic Reports & PDF Generator (Requirement 4) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div>
          {/* Cohort Filter & Export Header */}
          <div className="card" style={{ marginBottom: '20px', padding: '18px 20px', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b3954', margin: 0 }}>
                  Official Department Academic Reports & Roster
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Filter student performance records and export official quality summaries
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleExportPDF}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
                  disabled={exportingPdf}
                >
                  <Download size={15} />
                  {exportingPdf ? 'Generating PDF...' : 'Export Official PDF Report'}
                </button>

                <button
                  onClick={() => window.print()}
                  className="btn-accent"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
                >
                  <Printer size={15} /> Print Roster
                </button>
              </div>
            </div>

            {/* Filter Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Academic Year
                </label>
                <select className="input-field" value={repYear} onChange={(e) => setRepYear(e.target.value)}>
                  <option value="ALL">All Academic Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Semester
                </label>
                <select className="input-field" value={repSem} onChange={(e) => setRepSem(e.target.value)}>
                  <option value="ALL">All Semesters</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Section
                </label>
                <select className="input-field" value={repSection} onChange={(e) => setRepSection(e.target.value)}>
                  <option value="ALL">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                  <option value="E">Section E</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                  Senate Academic Standing
                </label>
                <select className="input-field" value={repStanding} onChange={(e) => setRepStanding(e.target.value)}>
                  <option value="ALL">All Academic Standings</option>
                  <option value="Very Great Distinction">Very Great Distinction (CGPA &gt;= 3.75)</option>
                  <option value="Great Distinction">Great Distinction (CGPA 3.50 - 3.74)</option>
                  <option value="Distinction">Distinction (CGPA 3.25 - 3.49)</option>
                  <option value="Good Standing">Good Standing (CGPA 2.00 - 3.24)</option>
                  <option value="Warning">Warning (CGPA 1.75 - 1.99)</option>
                  <option value="Probation">Probation (CGPA &lt; 1.75)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Report Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #0284c7', margin: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Filtered Students</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1', marginTop: '2px' }}>
                {reports?.summary?.totalStudents || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #16a34a', margin: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Cohort Average CGPA</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d', marginTop: '2px' }}>
                {reports?.summary?.averageCGPA !== undefined ? reports.summary.averageCGPA.toFixed(2) : '0.00'}
              </div>
            </div>

            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #8b5cf6', margin: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Distinction Students</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6d28d9', marginTop: '2px' }}>
                {(reports?.summary?.standingCounts?.['Very Great Distinction'] || 0) +
                  (reports?.summary?.standingCounts?.['Great Distinction'] || 0) +
                  (reports?.summary?.standingCounts?.['Distinction'] || 0)}
              </div>
            </div>

            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #ef4444', margin: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Academic Probation</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b91c1c', marginTop: '2px' }}>
                {reports?.summary?.standingCounts?.['Probation'] || 0}
              </div>
            </div>
          </div>

          {/* Student Performance Roster Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Student ID</th>
                    <th style={{ padding: '10px 16px' }}>Full Name</th>
                    <th style={{ padding: '10px 16px' }}>Cohort Class</th>
                    <th style={{ padding: '10px 16px' }}>Cumulative CGPA</th>
                    <th style={{ padding: '10px 16px' }}>Total Credits</th>
                    <th style={{ padding: '10px 16px' }}>Official Standing</th>
                  </tr>
                </thead>
                <tbody>
                  {!reports?.studentRoster || reports.studentRoster.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No student performance records found for this department matching criteria.
                      </td>
                    </tr>
                  ) : (
                    reports.studentRoster.map((st) => (
                      <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0284c7' }}>{st.studentId}</td>
                        <td style={{ padding: '10px 16px', fontWeight: '500' }}>
                          <div>{st.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{st.email}</div>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#475569' }}>
                          Year {st.year} • Sem {st.semester} • Sec {st.section}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0b3954' }}>
                          {typeof st.cgpa === 'number' ? st.cgpa.toFixed(2) : st.cgpa}
                        </td>
                        <td style={{ padding: '10px 16px' }}>{st.totalCredits} ECTS</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              backgroundColor: st.academicStanding.includes('Distinction')
                                ? '#dcfce7'
                                : st.academicStanding === 'Probation'
                                ? '#fee2e2'
                                : '#e0f2fe',
                              color: st.academicStanding.includes('Distinction')
                                ? '#15803d'
                                : st.academicStanding === 'Probation'
                                ? '#b91c1c'
                                : '#0369a1',
                            }}
                          >
                            {st.academicStanding}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Flag Material Modal */}
      {flagModalMaterial && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#0b3954', marginBottom: '8px' }}>
              Flag Material for Revision
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
              Specify the content revision instructions or requirements for <strong>{flagModalMaterial.title}</strong>.
            </p>

            <textarea
              className="input-field"
              rows="4"
              placeholder="e.g. Please update Chapter 3 slides with the latest syllabus specifications..."
              value={flagReasonInput}
              onChange={(e) => setFlagReasonInput(e.target.value)}
              style={{ width: '100%', marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setFlagModalMaterial(null)} className="btn-accent" style={{ fontSize: '13px' }}>
                Cancel
              </button>
              <button
                onClick={() => handleReviewMaterial(flagModalMaterial._id, 'flagged', flagReasonInput)}
                className="btn-primary"
                style={{ backgroundColor: '#dc2626', fontSize: '13px' }}
                disabled={submittingReview}
              >
                {submittingReview ? 'Submitting...' : 'Confirm Flag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Material Modal */}
      {previewMaterial && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '24px', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0b3954', margin: 0 }}>
                  {previewMaterial.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {previewMaterial.courseCode} • {previewMaterial.subject} • Target: Year {previewMaterial.academicYear} Sem {previewMaterial.semester}
                </div>
              </div>
              <button onClick={() => setPreviewMaterial(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {previewMaterial.description && (
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#334155', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                <strong>Description:</strong> {previewMaterial.description}
              </div>
            )}

            {previewMaterial.materialType === 'text' && previewMaterial.textContent ? (
              <div style={{ backgroundColor: '#f1f5f9', padding: '14px', borderRadius: '6px', fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace' }}>
                {previewMaterial.textContent}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                <BookOpen size={36} color="#0284c7" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0b3954' }}>
                  {previewMaterial.fileName || 'Lecture Document'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Size: {Math.round((previewMaterial.size || 0) / 1024)} KB
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setPreviewMaterial(null)} className="btn-accent" style={{ fontSize: '13px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
