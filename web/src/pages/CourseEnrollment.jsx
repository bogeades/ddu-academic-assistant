import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, CheckCircle, AlertTriangle, UserCheck, XCircle } from 'lucide-react';

export const CourseEnrollment = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState('2026-Semester-1');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      // 1. Fetch available courses
      const courseRes = await api.get('/materials'); // Can list courses or materials
      // Direct sample courses or query enrollments
      const enrollRes = await api.get('/enrollments');
      setMyEnrollments(enrollRes.data.data);

      // Standard DDU CS Course Catalog
      setCourses([
        {
          _id: 'c1',
          code: 'COSC2041',
          name: 'Data Structures and Algorithms',
          credits: 4,
          capacity: 50,
          enrolledCount: 22,
          prerequisites: ['COSC1012'],
        },
        {
          _id: 'c2',
          code: 'COSC3072',
          name: 'Artificial Intelligence and Machine Learning',
          credits: 3,
          capacity: 45,
          enrolledCount: 28,
          prerequisites: ['COSC2041'],
        },
        {
          _id: 'c3',
          code: 'COSC3081',
          name: 'Database Systems & Information Management',
          credits: 4,
          capacity: 50,
          enrolledCount: 15,
          prerequisites: ['COSC2041'],
        },
        {
          _id: 'c4',
          code: 'COSC4112',
          name: 'Computer and Network Security',
          credits: 3,
          capacity: 40,
          enrolledCount: 38,
          prerequisites: ['COSC3081'],
        },
      ]);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = async (course) => {
    setMessage('');
    setError('');

    try {
      const res = await api.post('/enrollments', {
        courseId: course._id,
        semester,
      });
      setMessage(res.data.message || `Successfully enrolled in ${course.code}!`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Enrollment rejected.');
    }
  };

  const handleDrop = async (enrollmentId) => {
    if (window.confirm('Are you sure you want to drop this course?')) {
      try {
        await api.delete(`/enrollments/${enrollmentId}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to drop course.');
      }
    }
  };

  const enrolledCourseCodes = new Set(
    myEnrollments.map((e) => (e.course?.code ? e.course.code : ''))
  );

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954' }}>
          Semester Course Enrollment (FR-S08, FR-R03)
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Enroll in accredited Computer Science courses. The portal validates prerequisites and enforces atomic course capacity constraints.
        </p>
      </div>

      {message && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '12px', borderRadius: '6px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid-2">
        {/* Left: Course Catalog */}
        <div>
          <h2 style={{ fontSize: '18px', color: '#0b3954', marginBottom: '14px' }}>Available Department Courses</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {courses.map((course) => {
              const isEnrolled = enrolledCourseCodes.has(course.code);
              const isFull = course.enrolledCount >= course.capacity;

              return (
                <div key={course.code} className="card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span className="badge badge-student" style={{ marginRight: '8px' }}>{course.code}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{course.credits} Credit Hours</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: isFull ? '#dc2626' : '#16a34a' }}>
                      {course.enrolledCount} / {course.capacity} Enrolled
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', color: '#0b3954', margin: '0 0 6px 0' }}>{course.name}</h3>

                  {course.prerequisites?.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                      Prerequisites: <strong>{course.prerequisites.join(', ')}</strong>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                    {isEnrolled ? (
                      <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={16} /> Currently Enrolled
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course)}
                        disabled={isFull}
                        className="btn-accent"
                        style={{ minHeight: '36px', fontSize: '13px' }}
                      >
                        {isFull ? 'Course Full' : 'Register for Course'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: My Enrolled Courses for Term */}
        <div>
          <div className="card">
            <h2 style={{ fontSize: '18px', color: '#0b3954', marginBottom: '14px' }}>
              My Active Semester Enrollments ({semester})
            </h2>

            {myEnrollments.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>No course enrollments found for this term.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myEnrollments.map((enr) => (
                  <div
                    key={enr._id}
                    style={{
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#0b3954' }}>
                        {enr.course?.code || 'COSC'} - {enr.course?.name || 'Computer Science'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Status: <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{enr.status}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDrop(enr._id)}
                      style={{ background: '#fee2e2', border: 'none', color: '#b91c1c', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Drop
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
