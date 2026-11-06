import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  Eye,
  FileText,
  Check,
  X,
  Search,
  Filter,
} from 'lucide-react';

export const AssignmentsView = () => {
  const { user } = useAuth();
  const isLecturerOrAdmin = ['lecturer', 'admin', 'deptHead'].includes(user?.role);

  // Assignments & Filter State
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');

  // Student Submission Modal State
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Lecturer: Create Assignment Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('COSC2041');
  const [newInstructions, setNewInstructions] = useState('');
  const [newMaxScore, setNewMaxScore] = useState(20);
  const [newDeadline, setNewDeadline] = useState('');
  const [newAllowLate, setNewAllowLate] = useState(true);
  const [newPublished, setNewPublished] = useState(true);
  const [newAttachment, setNewAttachment] = useState(null);
  const [creating, setCreating] = useState(false);

  // Lecturer: Review & Grading State (FR-L04)
  const [activeAssignmentForReview, setActiveAssignmentForReview] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestionPreview, setAiSuggestionPreview] = useState(null);
  const [savingGrade, setSavingGrade] = useState(false);

  // Notification Message
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCourseFilter) params.courseCode = selectedCourseFilter;
      const res = await api.get('/assignments', { params });
      setAssignments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedCourseFilter]);

  const handleOpenSubmit = (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionText(assignment.mySubmission?.textAnswer || assignment.mySubmission?.submissionText || '');
    setSubmissionFile(null);
    setSubmitModalOpen(true);
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!submissionFile && !submissionText.trim()) {
      return alert('Please upload a file or write your submission text.');
    }

    setSubmitting(true);
    const formData = new FormData();
    if (submissionFile) formData.append('file', submissionFile);
    if (submissionText.trim()) formData.append('textAnswer', submissionText.trim());

    try {
      const res = await api.post(`/submissions/${selectedAssignment._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatusMessage({ type: 'success', text: res.data.message || 'Assignment submitted successfully!' });
      setSubmitModalOpen(false);
      setSelectedAssignment(null);
      await fetchAssignments();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInstructions.trim() || !newDeadline) {
      return alert('Please fill in all required fields (title, instructions, and deadline).');
    }

    setCreating(true);
    const formData = new FormData();
    formData.append('title', newTitle.trim());
    formData.append('courseCode', newCourseCode.trim());
    formData.append('instructions', newInstructions.trim());
    formData.append('maxScore', newMaxScore);
    formData.append('deadline', newDeadline);
    formData.append('allowLate', String(newAllowLate));
    formData.append('published', String(newPublished));
    if (newAttachment) {
      formData.append('file', newAttachment);
    }

    try {
      const res = await api.post('/assignments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatusMessage({ type: 'success', text: res.data.message || 'Assignment created successfully!' });
      setCreateModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewInstructions('');
      setNewDeadline('');
      setNewAttachment(null);
      await fetchAssignments();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create assignment.' });
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (assignmentId, currentStatus) => {
    try {
      const res = await api.patch(`/assignments/${assignmentId}/publish`, {
        published: !currentStatus,
      });
      setStatusMessage({ type: 'success', text: res.data.message });
      setAssignments((prev) =>
        prev.map((a) => (a._id === assignmentId ? { ...a, published: res.data.data.published } : a))
      );
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update publish state.' });
    }
  };

  const handleDeleteAssignment = async (assignmentId, title) => {
    if (!window.confirm(`Are you sure you want to delete assignment "${title}"? This will also remove student submissions.`)) {
      return;
    }
    try {
      await api.delete(`/assignments/${assignmentId}`);
      setStatusMessage({ type: 'success', text: `Assignment "${title}" removed successfully.` });
      setAssignments((prev) => prev.filter((a) => a._id !== assignmentId));
      if (activeAssignmentForReview?._id === assignmentId) {
        setActiveAssignmentForReview(null);
        setSubmissionsList([]);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete assignment.' });
    }
  };

  // Lecturer: Load submissions for assignment
  const handleLoadSubmissions = async (assignment) => {
    setActiveAssignmentForReview(assignment);
    setLoadingSubmissions(true);
    setGradingSubmission(null);
    setAiSuggestionPreview(null);
    try {
      const res = await api.get(`/submissions/assignment/${assignment._id}`);
      setSubmissionsList(res.data.data || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load submissions.' });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Lecturer: Request AI Grading Suggestion (FR-L04)
  const handleRequestAISuggestion = async (submissionId) => {
    setAiSuggesting(true);
    setAiSuggestionPreview(null);
    try {
      const res = await api.post(`/submissions/${submissionId}/ai-grade`);
      const { score, feedback, studentWorkPreview } = res.data.suggestion;
      setAiSuggestionPreview({ score, feedback, studentWorkPreview });
      setGradeScore(score.toString());
      setGradeFeedback(feedback);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to obtain AI grading suggestion.');
    } finally {
      setAiSuggesting(false);
    }
  };

  // Lecturer: Finalize Grade
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    const numGrade = Number(gradeScore);
    const maxScore = activeAssignmentForReview?.maxScore || 100;
    if (isNaN(numGrade) || numGrade < 0 || numGrade > maxScore) {
      return alert(`Score must be a number between 0 and ${maxScore}.`);
    }

    setSavingGrade(true);
    try {
      const res = await api.patch(`/submissions/${gradingSubmission._id}/grade`, {
        grade: numGrade,
        feedback: gradeFeedback.trim(),
      });
      setStatusMessage({ type: 'success', text: res.data.message || 'Grade saved and student notified!' });
      setGradingSubmission(null);
      setAiSuggestionPreview(null);
      // Refresh submissions
      if (activeAssignmentForReview) {
        handleLoadSubmissions(activeAssignmentForReview);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save grade.');
    } finally {
      setSavingGrade(false);
    }
  };

  const handleDownloadAttachment = async (assignmentId, originalName) => {
    try {
      const res = await api.get(`/assignments/${assignmentId}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || `assignment-${assignmentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download assignment attachment.');
    }
  };

  const handleDownloadSubmission = async (submissionId, originalName) => {
    try {
      const res = await api.get(`/submissions/${submissionId}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || `submission-${submissionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download student file.');
    }
  };

  // Filter assignments by search query
  const filteredAssignments = assignments.filter((a) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      !searchQuery ||
      a.title?.toLowerCase().includes(q) ||
      a.instructions?.toLowerCase().includes(q) ||
      a.courseCode?.toLowerCase().includes(q);
    return matchQuery;
  });

  return (
    <div className="page-wrapper">
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954', margin: '0 0 6px 0' }}>
            Course Assignments & Evaluations (FR-S08, FR-L03, FR-L04)
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            {isLecturerOrAdmin
              ? 'Publish course coursework, review student submissions, and leverage AI Gateway grading suggestions.'
              : 'Submit coursework, review faculty evaluations, and download course problem sets.'}
          </p>
        </div>

        {isLecturerOrAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '6px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search assignments by title or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#64748b" />
          <select
            className="input-field"
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '160px', padding: '6px 10px', fontSize: '13px' }}
          >
            <option value="">All Courses</option>
            <option value="COSC2041">COSC2041 - Data Structures</option>
            <option value="COSC3072">COSC3072 - AI & Machine Learning</option>
            <option value="COSC3081">COSC3081 - Database Systems</option>
            <option value="COSC4112">COSC4112 - Network Security</option>
          </select>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Column: Assignments List */}
        <div>
          <h2 style={{ fontSize: '18px', color: '#0b3954', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={20} color="#0284c7" />
            <span>Assignments ({filteredAssignments.length})</span>
          </h2>

          {loading ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading assignments...</p>
          ) : filteredAssignments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px' }}>
              No assignments found matching your filter criteria.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredAssignments.map((a) => {
                const isOverdue = new Date() > new Date(a.deadline);
                const isSelectedForReview = activeAssignmentForReview?._id === a._id;

                return (
                  <div
                    key={a._id}
                    className="card"
                    style={{
                      margin: 0,
                      border: isSelectedForReview ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      backgroundColor: isSelectedForReview ? '#f0f9ff' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="badge badge-student">{a.courseCode}</span>
                        {isLecturerOrAdmin && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: a.published ? '#dcfce7' : '#fef3c7',
                              color: a.published ? '#166534' : '#92400e',
                            }}
                          >
                            {a.published ? 'Published' : 'Draft'}
                          </span>
                        )}
                        <span
                          className="badge"
                          style={{
                            backgroundColor: a.allowLate ? '#e0f2fe' : '#f1f5f9',
                            color: a.allowLate ? '#0369a1' : '#475569',
                          }}
                        >
                          {a.allowLate ? 'Late Submissions Allowed' : 'Strict Deadline'}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: isOverdue ? '#b91c1c' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Clock size={13} /> Due: {new Date(a.deadline).toLocaleString()}
                        {isOverdue && ' (Overdue)'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '16px', color: '#0b3954', margin: '0 0 6px 0' }}>{a.title}</h3>
                    <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px 0', whiteSpace: 'pre-wrap' }}>
                      {a.instructions}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#0284c7', fontWeight: 'bold', marginBottom: '12px' }}>
                      <span>Maximum Score: {a.maxScore} pts</span>
                      {a.attachmentOriginalName && (
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(a._id, a.attachmentOriginalName)}
                          className="btn-outline"
                          style={{ minHeight: '26px', fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Download size={12} /> {a.attachmentOriginalName}
                        </button>
                      )}
                    </div>

                    {/* Student Status & Submission Action (FR-S08) */}
                    {user?.role === 'student' ? (
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          {a.isSubmitted ? (
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', color: a.mySubmission.grade !== undefined ? '#16a34a' : '#0284c7' }}>
                                {a.mySubmission.grade !== undefined
                                  ? `Score: ${a.mySubmission.grade} / ${a.maxScore} pts`
                                  : 'Submitted (Pending Faculty Evaluation)'}
                              </div>
                              {a.mySubmission.isLate && (
                                <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 'bold' }}>
                                  (Submitted Late)
                                </span>
                              )}
                              {a.mySubmission.feedback && (
                                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', fontStyle: 'italic' }}>
                                  Feedback: "{a.mySubmission.feedback}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '13px', color: isOverdue && !a.allowLate ? '#b91c1c' : '#d97706', fontWeight: 'bold' }}>
                              {isOverdue && !a.allowLate ? 'Deadline Closed (No Late Submissions)' : 'Not Submitted Yet'}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenSubmit(a)}
                          disabled={a.mySubmission?.status === 'graded' || (isOverdue && !a.allowLate && !a.isSubmitted)}
                          className="btn-outline"
                          style={{ minHeight: '34px', fontSize: '12px' }}
                        >
                          {a.isSubmitted ? 'Resubmit Work' : 'Submit Work'}
                        </button>
                      </div>
                    ) : (
                      /* Lecturer Action Bar (FR-L03, FR-L04) */
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleLoadSubmissions(a)}
                            className="btn-accent"
                            style={{ minHeight: '32px', fontSize: '12px' }}
                          >
                            <Eye size={14} /> View Submissions
                          </button>
                          <button
                            onClick={() => handleTogglePublish(a._id, a.published)}
                            className="btn-outline"
                            style={{ minHeight: '32px', fontSize: '12px' }}
                          >
                            {a.published ? 'Unpublish' : 'Publish'}
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteAssignment(a._id, a.title)}
                          className="btn-outline"
                          style={{ minHeight: '32px', fontSize: '12px', color: '#b91c1c', borderColor: '#fca5a5' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Lecturer Submissions & AI-Assisted Grading Panel (FR-L04) */}
        <div>
          {isLecturerOrAdmin ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>
                  Submission Review & AI Grading (FR-L04)
                </h2>
                {activeAssignmentForReview && (
                  <span className="badge badge-student">{activeAssignmentForReview.courseCode}</span>
                )}
              </div>

              {!activeAssignmentForReview ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 10px', fontSize: '13px' }}>
                  Select "View Submissions" on any assignment to inspect student responses and generate AI-assisted grade suggestions.
                </div>
              ) : (
                <div>
                  <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' }}>
                    <div style={{ fontWeight: 'bold', color: '#0b3954', fontSize: '14px' }}>
                      {activeAssignmentForReview.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Max Score: {activeAssignmentForReview.maxScore} pts • Submissions: {submissionsList.length}
                    </div>
                  </div>

                  {loadingSubmissions ? (
                    <p style={{ fontSize: '13px', color: '#64748b' }}>Loading submissions...</p>
                  ) : submissionsList.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                      No student submissions received for this assignment yet.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {submissionsList.map((sub) => (
                        <div
                          key={sub._id}
                          style={{
                            padding: '12px',
                            borderRadius: '6px',
                            border: gradingSubmission?._id === sub._id ? '2px solid #0284c7' : '1px solid #e2e8f0',
                            backgroundColor: gradingSubmission?._id === sub._id ? '#f0f9ff' : '#f8fafc',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '14px', color: '#0b3954' }}>
                                {sub.student?.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                ID: {sub.student?.studentId || 'N/A'} • Dept: {sub.student?.department || 'CS'}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: sub.status === 'graded' ? '#dcfce7' : '#fef3c7',
                                  color: sub.status === 'graded' ? '#166534' : '#92400e',
                                }}
                              >
                                {sub.status === 'graded' ? `Graded: ${sub.grade}/${activeAssignmentForReview.maxScore}` : 'Submitted'}
                              </span>
                              {sub.isLate && (
                                <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 'bold' }}>
                                  Late Submission
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Submission Content Preview */}
                          {sub.textAnswer && (
                            <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '4px', fontSize: '12px', color: '#334155', border: '1px solid #e2e8f0', marginBottom: '8px', maxHeight: '80px', overflowY: 'auto' }}>
                              <span style={{ fontWeight: 'bold', color: '#64748b' }}>Text Submission: </span>
                              {sub.textAnswer}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            {sub.fileName ? (
                              <button
                                type="button"
                                onClick={() => handleDownloadSubmission(sub._id, sub.fileName)}
                                className="btn-outline"
                                style={{ minHeight: '26px', fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Download size={12} /> {sub.fileName}
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>No file attached</span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setGradingSubmission(sub);
                                setGradeScore(sub.grade !== undefined ? sub.grade.toString() : '');
                                setGradeFeedback(sub.feedback || '');
                                setAiSuggestionPreview(null);
                              }}
                              className="btn-primary"
                              style={{ minHeight: '28px', fontSize: '12px', padding: '4px 10px' }}
                            >
                              Grade / AI Evaluate
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active Grading & AI Assistance Drawer */}
                  {gradingSubmission && (
                    <div style={{ marginTop: '20px', borderTop: '2px solid #0284c7', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '15px', color: '#0b3954', margin: 0 }}>
                          Grading: {gradingSubmission.student?.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setGradingSubmission(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* AI Suggestion Trigger (FR-L04) */}
                      <div style={{ marginBottom: '12px' }}>
                        <button
                          type="button"
                          onClick={() => handleRequestAISuggestion(gradingSubmission._id)}
                          disabled={aiSuggesting}
                          className="btn-accent"
                          style={{ fontSize: '12px', minHeight: '34px', width: '100%', justifyContent: 'center' }}
                        >
                          <Sparkles size={14} />
                          <span>{aiSuggesting ? 'AI Evaluating Submission...' : 'Generate AI Grade Suggestion (FR-L04)'}</span>
                        </button>
                      </div>

                      {aiSuggestionPreview && (
                        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={14} /> AI Suggested Score: {aiSuggestionPreview.score} / {activeAssignmentForReview.maxScore} pts
                          </div>
                          <div style={{ color: '#15803d' }}>{aiSuggestionPreview.feedback}</div>
                          <div style={{ fontSize: '11px', color: '#65a30d', marginTop: '4px' }}>
                            (Values have been filled below. You may edit before saving.)
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleSaveGrade}>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                            Score (0 - {activeAssignmentForReview.maxScore})
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={activeAssignmentForReview.maxScore}
                            step="0.5"
                            className="input-field"
                            value={gradeScore}
                            onChange={(e) => setGradeScore(e.target.value)}
                            required
                            placeholder={`e.g. ${activeAssignmentForReview.maxScore * 0.9}`}
                          />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                            Instructor Feedback
                          </label>
                          <textarea
                            className="input-field"
                            rows={3}
                            value={gradeFeedback}
                            onChange={(e) => setGradeFeedback(e.target.value)}
                            placeholder="Detailed constructive academic remarks..."
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="submit"
                            disabled={savingGrade}
                            className="btn-primary"
                            style={{ flex: 1, justifyContent: 'center' }}
                          >
                            {savingGrade ? 'Saving...' : 'Confirm Grade & Notify Student'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setGradingSubmission(null)}
                            className="btn-outline"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Student Right Panel: Overview & Instructions */
            <div className="card">
              <h2 style={{ fontSize: '18px', color: '#0b3954', marginBottom: '12px' }}>
                Academic Coursework Guidelines
              </h2>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0 }}>
                  <strong>Dire Dawa University Coursework Policy:</strong>
                </p>
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  <li>Submit assignments in PDF, DOCX, or direct code format before the deadline.</li>
                  <li>Late submissions are permitted only if explicitly enabled by the instructor.</li>
                  <li>You may re-submit your work until your instructor finalizes your grade.</li>
                  <li>Upon grading, your score and detailed evaluation comments will appear here and in your notifications.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Submission Modal */}
      {submitModalOpen && selectedAssignment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>
                Submit Work: {selectedAssignment.title}
              </h2>
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Course: <strong>{selectedAssignment.courseCode}</strong> • Max Score: {selectedAssignment.maxScore} pts
            </p>

            {new Date() > new Date(selectedAssignment.deadline) && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '6px', color: '#991b1b', fontSize: '12px', marginBottom: '14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>Notice: The assignment deadline has passed. This submission will be recorded as late.</span>
              </div>
            )}

            <form onSubmit={handleStudentSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Upload Document / Source Code (PDF, DOCX, TXT)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.zip"
                  onChange={(e) => setSubmissionFile(e.target.files[0])}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Or Written Solution / Code Text
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Paste algorithm explanation, mathematical steps, or source code..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lecturer Create Assignment Modal (FR-L03) */}
      {createModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '580px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>
                Create Course Assignment (FR-L03)
              </h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Assignment Title *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lab 2: Binary Search Tree Implementation"
                  required
                />
              </div>

              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Course Code *
                  </label>
                  <select
                    className="input-field"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                  >
                    <option value="COSC2041">COSC2041 - Data Structures</option>
                    <option value="COSC3072">COSC3072 - AI & Machine Learning</option>
                    <option value="COSC3081">COSC3081 - Database Systems</option>
                    <option value="COSC4112">COSC4112 - Network Security</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Maximum Score (pts) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={newMaxScore}
                    onChange={(e) => setNewMaxScore(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Submission Deadline *
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Instructions & Specifications *
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="Describe problem statement, input/output requirements, submission rules..."
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Attach Problem Sheet / Starter Files (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setNewAttachment(e.target.files[0])}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newAllowLate}
                    onChange={(e) => setNewAllowLate(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Allow late submissions</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newPublished}
                    onChange={(e) => setNewPublished(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Publish immediately to students</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Saving...' : 'Save & Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
