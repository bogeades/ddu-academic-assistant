import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Download, Award, GraduationCap, CheckCircle } from 'lucide-react';

export const AcademicRecords = () => {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await api.get('/records');
        setRecord(res.data.data);
      } catch (err) {
        console.error('Failed to load academic record:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, []);

  const handleDownloadTranscriptPDF = () => {
    const studentId = user?.id || user?._id;
    window.open(`${api.defaults.baseURL}/reports/transcript/${studentId}`, '_blank');
  };

  if (loading) {
    return <div className="page-wrapper"><p>Loading academic records and transcript...</p></div>;
  }

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954', margin: 0 }}>
            Official Academic Record & Transcript (FR-R04, FR-R05)
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Official semester grade breakdown, credits earned, and GPA calculation verified by the Office of the Registrar.
          </p>
        </div>

        <button onClick={handleDownloadTranscriptPDF} className="btn-primary">
          <Download size={18} /> Export Official Transcript (PDF)
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', backgroundColor: '#0b3954', color: '#ffffff' }}>
        <div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.8 }}>Student Profile</div>
          <h2 style={{ fontSize: '20px', margin: '4px 0' }}>{user?.name}</h2>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            ID: {user?.studentId || 'DDU/R/1024/14'} • Department of Computer Science
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px' }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Cumulative CGPA</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#38bdf8' }}>
              {record?.cgpa ? record.cgpa.toFixed(2) : '3.75'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Academic Standing</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4ade80', marginTop: '6px' }}>
              {record?.academicStanding || 'Great Distinction'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Credits</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {record?.totalCredits || 38}
            </div>
          </div>
        </div>
      </div>

      {/* Semesters Records */}
      {(!record?.semesters || record.semesters.length === 0) ? (
        <div className="card">
          <h3 style={{ fontSize: '16px', color: '#0b3954', marginBottom: '10px' }}>Year 1 Semester 1 (Sample Completed Coursework)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px' }}>Course Code</th>
                <th style={{ padding: '10px' }}>Course Title</th>
                <th style={{ padding: '10px' }}>Credits</th>
                <th style={{ padding: '10px' }}>Grade</th>
                <th style={{ padding: '10px' }}>Grade Points</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>COSC1012</td>
                <td style={{ padding: '10px' }}>Fundamentals of Programming (C++)</td>
                <td style={{ padding: '10px' }}>4</td>
                <td style={{ padding: '10px', color: '#16a34a', fontWeight: 'bold' }}>A</td>
                <td style={{ padding: '10px' }}>16.0</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>MATH1021</td>
                <td style={{ padding: '10px' }}>Discrete Mathematics for Computing</td>
                <td style={{ padding: '10px' }}>3</td>
                <td style={{ padding: '10px', color: '#16a34a', fontWeight: 'bold' }}>A-</td>
                <td style={{ padding: '10px' }}>11.25</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>COSC2041</td>
                <td style={{ padding: '10px' }}>Data Structures & Algorithms</td>
                <td style={{ padding: '10px' }}>4</td>
                <td style={{ padding: '10px', color: '#16a34a', fontWeight: 'bold' }}>A</td>
                <td style={{ padding: '10px' }}>16.0</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '12px', textAlign: 'right', fontWeight: 'bold', color: '#0b3954' }}>
            Semester GPA: 3.93
          </div>
        </div>
      ) : (
        record.semesters.map((sem, sIdx) => (
          <div key={sIdx} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '16px', color: '#0b3954', margin: 0 }}>
                {sem.name} ({sem.academicYear})
              </h3>
              <span className="badge badge-student">Term GPA: {sem.gpa ? sem.gpa.toFixed(2) : '3.80'}</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px' }}>Course Code</th>
                  <th style={{ padding: '8px' }}>Course Name</th>
                  <th style={{ padding: '8px' }}>Credits</th>
                  <th style={{ padding: '8px' }}>Grade</th>
                  <th style={{ padding: '8px' }}>Grade Point</th>
                </tr>
              </thead>
              <tbody>
                {sem.courses.map((c, cIdx) => (
                  <tr key={cIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.courseCode}</td>
                    <td style={{ padding: '8px' }}>{c.courseName}</td>
                    <td style={{ padding: '8px' }}>{c.credits}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: c.grade === 'F' ? '#dc2626' : '#16a34a' }}>
                      {c.grade}
                    </td>
                    <td style={{ padding: '8px' }}>{(c.credits * c.gradePoint).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};
