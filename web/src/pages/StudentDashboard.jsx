import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckSquare,
  Sparkles,
  ExternalLink,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/students/dashboard');
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="page-wrapper"><p>Loading academic performance dashboard...</p></div>;
  }

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954' }}>
            Welcome back, {data?.student?.name}!
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Student ID: {data?.student?.studentId || 'N/A'} • Year {data?.student?.yearOfStudy} (Computer Science)
          </p>
        </div>
        <Link to="/ai-chat" className="btn-accent">
          <Sparkles size={18} /> Ask AI Academic Tutor
        </Link>
      </div>

      {/* Academic Placement Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>Department</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b3954' }}>
              {data?.student?.department?.name || 'Computer Science'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>Academic Year</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b3954' }}>
              Year {data?.student?.yearOfStudy || 1}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>Semester</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b3954' }}>
              Semester {data?.student?.semester || 1}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>Assigned Section</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7' }}>
              Section {data?.student?.section || 'A'}
            </div>
          </div>
        </div>

        <div>
          <span className="badge badge-student" style={{ fontSize: '12px', padding: '6px 12px' }}>
            Official Placement Verified
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ borderLeft: '4px solid #0284c7', margin: 0 }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Cumulative GPA</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0b3954', margin: '6px 0' }}>
            {data?.academics?.cgpa ? data.academics.cgpa.toFixed(2) : '3.50'}
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>
            {data?.academics?.academicStanding}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #16a34a', margin: 0 }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Enrolled Courses</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0b3954', margin: '6px 0' }}>
            {data?.enrolledCourses?.length || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Active this Semester</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b', margin: 0 }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Pending Tasks</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0b3954', margin: '6px 0' }}>
            {data?.tasksSummary?.pending || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#d97706' }}>
            {data?.tasksSummary?.completed || 0} Tasks Completed
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #8b5cf6', margin: 0 }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Avg Quiz Score</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0b3954', margin: '6px 0' }}>
            {data?.performance?.avgQuizScore}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {data?.performance?.quizzesTaken} Quizzes Taken
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Left: AI Study Recommendations (FR-S08) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={20} color="#0284c7" />
            <h2 style={{ fontSize: '17px', color: '#0b3954', margin: 0 }}>AI Study Recommendations</h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Personalized academic resources tailored to your Computer Science semester progress:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data?.aiRecommendations?.map((rec, index) => (
              <div
                key={index}
                style={{
                  padding: '14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontSize: '14px', color: '#0b3954', margin: '0 0 4px 0' }}>{rec.title}</h4>
                  <span className="badge badge-student">{rec.courseCode}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 8px 0' }}>{rec.reason}</p>
                <a
                  href={rec.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Open Resource</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Assigned Courses & Tasks */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '17px', color: '#0b3954', margin: 0 }}>My Assigned Courses</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Officially assigned to Section {data?.student?.section || 'A'}
                </span>
              </div>
              <Link to="/materials" className="btn-outline" style={{ fontSize: '12px', padding: '4px 8px' }}>
                View Materials
              </Link>
            </div>

            {(data?.assignedCourses || data?.enrolledCourses || []).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>No courses currently assigned for your academic placement.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(data?.assignedCourses || data?.enrolledCourses || []).map((course) => (
                  <div
                    key={course._id || course.id}
                    style={{
                      padding: '14px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ backgroundColor: '#0b3954', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                          {course.code}
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
                          {course.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                        {course.credits || 3} ECTS
                      </span>
                    </div>

                    {/* Course Description */}
                    <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #f1f5f9', margin: '8px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            color: course.isLecturerDescription ? '#15803d' : '#0369a1',
                            backgroundColor: course.isLecturerDescription ? '#dcfce7' : '#e0f2fe',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {course.isLecturerDescription ? 'Lecturer Overview' : 'Curriculum Standard'}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: '18px' }}>
                        {course.description}
                      </p>
                    </div>

                    {/* Lecturer & Materials row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ color: '#475569' }}>
                        Lecturer: <strong style={{ color: '#0b3954' }}>{course.assignedLecturer ? `${course.assignedLecturer.name} (${course.assignedLecturer.lecturerId || 'LEC/CS/101'})` : 'To Be Assigned'}</strong>
                      </div>
                      <Link
                        to="/materials"
                        style={{ color: '#0284c7', fontWeight: '600', textDecoration: 'none' }}
                      >
                        {course.materialsCount || 0} Materials Available ›
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '17px', color: '#0b3954', margin: 0 }}>Upcoming Deadlines & Tasks</h2>
              <Link to="/tasks" style={{ fontSize: '13px', fontWeight: '600' }}>View All</Link>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
              Automated reminders are active for tasks approaching within 24 hours.
            </p>
            <Link to="/tasks" className="btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
              <Clock size={16} /> Open Task Manager
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
