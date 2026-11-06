import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Megaphone,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  X,
  Filter,
  CheckCircle,
} from 'lucide-react';

export const AnnouncementsView = () => {
  const { user } = useAuth();
  const isLecturerOrAdmin = ['lecturer', 'admin', 'deptHead'].includes(user?.role);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('');

  // Post Modal State
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postCourse, setPostCourse] = useState('COSC2041');
  const [postTitle, setPostTitle] = useState('');
  const [postMessage, setPostMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params = {};
      if (courseFilter) params.courseCode = courseFilter;
      const res = await api.get('/announcements', { params });
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [courseFilter]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postMessage.trim()) return;

    setPosting(true);
    try {
      const res = await api.post('/announcements', {
        courseCode: postCourse,
        title: postTitle.trim(),
        message: postMessage.trim(),
        isUrgent,
      });
      setNotice({ type: 'success', text: res.data.message || 'Announcement posted successfully!' });
      setPostModalOpen(false);
      setPostTitle('');
      setPostMessage('');
      setIsUrgent(false);
      await fetchAnnouncements();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to post announcement.' });
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteAnnouncement = async (id, title) => {
    if (!window.confirm(`Delete announcement "${title}"?`)) return;
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      setNotice({ type: 'success', text: 'Announcement deleted.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to delete announcement.' });
    }
  };

  const urgentAnnouncements = announcements.filter((a) => a.isUrgent);
  const regularAnnouncements = announcements.filter((a) => !a.isUrgent);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={26} color="#0284c7" /> Course Announcements (FR-L05)
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Official academic bulletins, room schedule changes, exam instructions, and departmental notices.
          </p>
        </div>

        {isLecturerOrAdmin && (
          <button
            onClick={() => setPostModalOpen(true)}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {notice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: notice.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: notice.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${notice.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notice.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Filter size={16} color="#64748b" />
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#0b3954' }}>Filter Course:</span>
        <select
          className="input-field"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          style={{ width: 'auto', minWidth: '180px', padding: '6px 10px', fontSize: '13px' }}
        >
          <option value="">All Academic Courses</option>
          <option value="COSC2041">COSC2041 - Data Structures</option>
          <option value="COSC3072">COSC3072 - AI & Machine Learning</option>
          <option value="COSC3081">COSC3081 - Database Systems</option>
          <option value="COSC4112">COSC4112 - Network Security</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading course announcements...</p>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
          No announcements posted for this course selection.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Urgent Announcements Pinned on Top */}
          {urgentAnnouncements.map((item) => (
            <div
              key={item._id}
              className="card"
              style={{
                margin: 0,
                backgroundColor: '#fff1f2',
                border: '2px solid #f43f5e',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className="badge" style={{ backgroundColor: '#e11d48', color: '#ffffff', fontWeight: 'bold' }}>
                    URGENT
                  </span>
                  <span className="badge badge-student">{item.courseCode || 'COSC'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#9f1239', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {new Date(item.createdAt).toLocaleString()}
                  </span>
                  {isLecturerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(item._id, item.title)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48' }}
                      title="Delete announcement"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <h3 style={{ fontSize: '16px', color: '#9f1239', margin: '0 0 6px 0', fontWeight: 'bold' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#881337', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {item.message}
              </p>

              {item.lecturer && (
                <div style={{ fontSize: '11px', color: '#be123c', marginTop: '10px', fontStyle: 'italic' }}>
                  Posted by: {item.lecturer.name || 'Faculty Instructor'} ({item.lecturer.email})
                </div>
              )}
            </div>
          ))}

          {/* Regular Announcements */}
          {regularAnnouncements.map((item) => (
            <div key={item._id} className="card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className="badge badge-student">{item.courseCode || 'COSC'}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {new Date(item.createdAt).toLocaleString()}
                  </span>
                  {isLecturerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(item._id, item.title)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
                      title="Delete announcement"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <h3 style={{ fontSize: '16px', color: '#0b3954', margin: '0 0 6px 0' }}>{item.title}</h3>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {item.message}
              </p>

              {item.lecturer && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px' }}>
                  Posted by: {item.lecturer.name || 'Faculty Instructor'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Post Announcement Modal (FR-L05) */}
      {postModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>
                Broadcast Course Announcement (FR-L05)
              </h2>
              <button
                type="button"
                onClick={() => setPostModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePostAnnouncement}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Target Course *
                </label>
                <select className="input-field" value={postCourse} onChange={(e) => setPostCourse(e.target.value)}>
                  <option value="COSC2041">COSC2041 - Data Structures</option>
                  <option value="COSC3072">COSC3072 - AI & Machine Learning</option>
                  <option value="COSC3081">COSC3081 - Database Systems</option>
                  <option value="COSC4112">COSC4112 - Network Security</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Announcement Title *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Lab Midterm Schedule & Submission Guidelines"
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Message Content *
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={postMessage}
                  onChange={(e) => setPostMessage(e.target.value)}
                  placeholder="Provide complete details, dates, room numbers, or study instructions..."
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="checkbox"
                  id="urgentCheckModal"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="urgentCheckModal" style={{ fontSize: '13px', fontWeight: '600', color: '#b91c1c', cursor: 'pointer' }}>
                  Flag as URGENT (Highlights in red and alerts students)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPostModalOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={posting}
                >
                  {posting ? 'Broadcasting...' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
