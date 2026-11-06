import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  BookOpen,
  Download,
  Upload,
  Trash2,
  FileText,
  Filter,
  Sparkles,
  Edit,
  Loader2,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const MaterialsLibrary = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [subject, setSubject] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [summarizingId, setSummarizingId] = useState(null);

  // Upload & Notes State
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'text'
  const [uploadData, setUploadData] = useState({
    title: '',
    subject: '',
    courseCode: 'COSC101',
    section: 'A',
    description: '',
    textContent: '',
    courseDescriptionOverride: '',
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeReadingNote, setActiveReadingNote] = useState(null);

  const fetchMaterials = async (targetPage = page) => {
    setLoading(true);
    try {
      const params = { page: targetPage, limit: 12 };
      if (search.trim()) params.q = search.trim();
      if (courseCode) params.courseCode = courseCode;
      if (subject.trim()) params.subject = subject.trim();

      const res = await api.get('/materials', { params });
      setMaterials(res.data.data || []);
      if (res.data.pagination) {
        setPage(res.data.pagination.page);
        setTotalPages(res.data.pagination.pages);
        setTotalItems(res.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials(1);
  }, [courseCode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMaterials(1);
  };

  const handleDownload = (materialId) => {
    window.open(`${api.defaults.baseURL}/materials/${materialId}/download`, '_blank');
  };

  const handleDelete = async (materialId) => {
    if (window.confirm('Permanently delete this course material? This action cannot be undone.')) {
      try {
        await api.delete(`/materials/${materialId}`);
        fetchMaterials(page);
      } catch (err) {
        alert(err.response?.data?.message || 'Delete failed.');
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadMode === 'file' && !uploadFile) {
      return alert('Please select an academic document file to upload.');
    }
    if (uploadMode === 'text' && !uploadData.textContent.trim()) {
      return alert('Please type or paste your lecture text notes.');
    }

    setUploading(true);

    try {
      if (uploadMode === 'text') {
        await api.post('/materials', {
          title: uploadData.title,
          subject: uploadData.subject || uploadData.title,
          courseCode: uploadData.courseCode,
          section: uploadData.section || 'A',
          description: uploadData.description,
          materialType: 'text',
          textContent: uploadData.textContent,
          courseDescriptionOverride: uploadData.courseDescriptionOverride,
        });
      } else {
        const formData = new FormData();
        formData.append('title', uploadData.title);
        formData.append('subject', uploadData.subject);
        formData.append('courseCode', uploadData.courseCode);
        formData.append('section', uploadData.section || 'ALL');
        formData.append('description', uploadData.description);
        if (uploadData.courseDescriptionOverride) {
          formData.append('courseDescriptionOverride', uploadData.courseDescriptionOverride);
        }
        formData.append('file', uploadFile);

        await api.post('/materials', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setShowUploadModal(false);
      setUploadData({
        title: '',
        subject: '',
        courseCode: 'COSC101',
        section: 'A',
        description: '',
        textContent: '',
        courseDescriptionOverride: '',
      });
      setUploadFile(null);
      fetchMaterials(1);
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingMaterial) return;

    try {
      await api.put(`/materials/${editingMaterial._id}`, {
        title: editingMaterial.title,
        subject: editingMaterial.subject,
        courseCode: editingMaterial.courseCode,
        description: editingMaterial.description,
      });
      setEditingMaterial(null);
      fetchMaterials(page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update material metadata.');
    }
  };

  // FR-L07: Summarize stored material with AI Gateway
  const handleSummarizeWithAI = async (material) => {
    setSummarizingId(material._id);
    try {
      const res = await api.post(`/materials/${material._id}/summarize`);
      setAiSummary(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate AI summary.');
    } finally {
      setSummarizingId(null);
    }
  };

  const handleDownloadSummaryTxt = (summary) => {
    const content = [
      `========================================================================`,
      `DIRE DAWA UNIVERSITY - AI ACADEMIC SUMMARY: ${summary.title.toUpperCase()}`,
      `Source: ${summary.sourceName || 'Course Material'}`,
      `Date Generated: ${new Date(summary.createdAt).toLocaleDateString()}`,
      `========================================================================\n`,
      summary.summaryText,
      `\n========================================================================`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${summary.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const canUpload = ['lecturer', 'admin', 'deptHead'].includes(user?.role);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={26} color="#0284c7" /> Course Materials Library (FR-S05, FR-L02)
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Official lecture notes, lab manuals, and syllabus materials uploaded by faculty.
          </p>
        </div>

        {canUpload && (
          <button onClick={() => setShowUploadModal(true)} className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={18} /> Upload Learning Material
          </button>
        )}
      </div>

      {/* Search and Filters Bar (NFR: Sub-2 second search) */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search by title, subject, or keywords (e.g. 'Binary Trees')..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
              aria-label="Search learning materials"
            />
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="input-field"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              aria-label="Filter by course code"
            >
              <option value="">All Courses</option>
              <option value="COSC2041">COSC2041 - Data Structures</option>
              <option value="COSC3072">COSC3072 - AI & ML</option>
              <option value="COSC3081">COSC3081 - Database Systems</option>
              <option value="COSC4112">COSC4112 - Network Security</option>
            </select>
          </div>

          <div style={{ width: '160px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Subject / Topic..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Filter by subject"
            />
          </div>

          <button type="submit" className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={16} /> Search
          </button>
        </form>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <span>Loading course materials...</span>
        </div>
      ) : materials.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <BookOpen size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ color: '#475569', fontSize: '16px' }}>No Materials Found</h3>
          <p style={{ fontSize: '13px' }}>Try adjusting your search keywords or course filters.</p>
        </div>
      ) : (
        <div className="grid-2">
          {materials.map((m) => {
            const isOwner = user?.role === 'admin' || m.uploadedBy?._id === user?._id;
            const isSummarizing = summarizingId === m._id;

            return (
              <div key={m._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', margin: 0 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="badge badge-student">{m.courseCode}</span>
                      <span style={{ fontSize: '11px', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {m.section && m.section !== 'ALL' ? `Sec ${m.section}` : 'All Sections'}
                      </span>
                      <span style={{ fontSize: '11px', color: m.materialType === 'text' ? '#15803d' : '#475569', backgroundColor: m.materialType === 'text' ? '#dcfce7' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {m.materialType === 'text' ? 'TEXT NOTES' : 'PDF DOC'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {m.materialType === 'text' ? 'Typed Notes' : `${((m.size || m.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB`}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', color: '#0b3954', margin: '0 0 6px 0' }}>{m.title}</h3>
                  <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                    {m.description || `Learning material for ${m.subject} in ${m.courseCode}.`}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    <span>By: {m.uploadedBy?.name || 'Faculty'}</span>
                    <span>{m.downloadCount || 0} downloads</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(m.materialType === 'text' || m.textContent) && (
                        <button
                          onClick={() => setActiveReadingNote(m)}
                          className="btn-accent"
                          style={{ minHeight: '34px', padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <BookOpen size={14} /> Read Notes
                        </button>
                      )}

                      <button
                        onClick={() => handleDownload(m._id)}
                        className="btn-outline"
                        style={{ minHeight: '34px', padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={14} /> {m.materialType === 'text' ? 'Download .txt' : 'Download'}
                      </button>

                      {/* FR-L07: Summarize with AI Button */}
                      <button
                        onClick={() => handleSummarizeWithAI(m)}
                        disabled={isSummarizing}
                        className="btn-outline"
                        style={{
                          minHeight: '34px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#0284c7',
                          borderColor: '#7dd3fc',
                        }}
                        title="Generate structured AI summary"
                      >
                        {isSummarizing ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Summarizing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            <span>Summarize with AI</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isOwner && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setEditingMaterial(m)}
                          className="btn-outline"
                          style={{ minHeight: '34px', padding: '4px 8px', fontSize: '12px' }}
                          title="Edit metadata"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(m._id)}
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            color: '#b91c1c',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                          title="Delete material"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '24px' }}>
          <button
            onClick={() => fetchMaterials(page - 1)}
            disabled={page <= 1}
            className="btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Page {page} of {totalPages} ({totalItems} total)
          </span>
          <button
            onClick={() => fetchMaterials(page + 1)}
            disabled={page >= totalPages}
            className="btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* AI Summary Modal (FR-L07) */}
      {aiSummary && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="#0284c7" /> {aiSummary.title}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Source: {aiSummary.sourceName} • {aiSummary.sourceLength} characters analyzed
                </div>
              </div>
              <button onClick={() => setAiSummary(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {aiSummary.summaryText}
            </div>

            {aiSummary.keyPoints && aiSummary.keyPoints.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: '#0b3954', marginBottom: '6px' }}>Key Takeaways:</h4>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                  {aiSummary.keyPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setAiSummary(null)} className="btn-outline">
                Close
              </button>
              <button onClick={() => handleDownloadSummaryTxt(aiSummary)} className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} /> Download Summary (.txt)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal (FR-L02, FR-A06) */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '580px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>Add Course Learning Material</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={uploadMode === 'file' ? 'btn-primary' : 'btn-outline'}
                style={{ fontSize: '13px', minHeight: '34px' }}
              >
                Upload Document (PDF/Doc)
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('text')}
                className={uploadMode === 'text' ? 'btn-primary' : 'btn-outline'}
                style={{ fontSize: '13px', minHeight: '34px' }}
              >
                Type or Paste Lecture Notes
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  required
                  placeholder="e.g., Graph Algorithms Lecture Notes"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Course Code</label>
                  <input
                    type="text"
                    className="input-field"
                    value={uploadData.courseCode}
                    onChange={(e) => setUploadData({ ...uploadData, courseCode: e.target.value })}
                    required
                    placeholder="e.g. COSC101"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Subject/Topic</label>
                  <input
                    type="text"
                    className="input-field"
                    value={uploadData.subject}
                    onChange={(e) => setUploadData({ ...uploadData, subject: e.target.value })}
                    placeholder="e.g. Dijkstra Shortest Path"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Target Section</label>
                  <select
                    className="input-field"
                    value={uploadData.section}
                    onChange={(e) => setUploadData({ ...uploadData, section: e.target.value })}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="ALL">All Sections</option>
                  </select>
                </div>
              </div>

              {/* Course Description / Explanation Override */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Lecturer Course Explanation / Syllabus Note (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={uploadData.courseDescriptionOverride}
                  onChange={(e) => setUploadData({ ...uploadData, courseDescriptionOverride: e.target.value })}
                  placeholder="Optional custom description shown to students in this section..."
                />
              </div>

              {uploadMode === 'text' ? (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Lecture Notes Content (Type or Paste Text)
                  </label>
                  <textarea
                    className="input-field"
                    rows={8}
                    value={uploadData.textContent}
                    onChange={(e) => setUploadData({ ...uploadData, textContent: e.target.value })}
                    placeholder="Enter comprehensive lecture text, code snippets, formulas, or explanations..."
                    required
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Document File (PDF, DOC, DOCX, PPT, PPTX, TXT - max 15MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="input-field"
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn-accent" disabled={uploading}>
                  {uploading ? 'Publishing Material...' : 'Publish Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Text Notes Reading Modal */}
      {activeReadingNote && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', padding: '28px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-student" style={{ marginBottom: '4px', display: 'inline-block' }}>
                  {activeReadingNote.courseCode} • Section {activeReadingNote.section || 'All'}
                </span>
                <h2 style={{ fontSize: '18px', color: '#0b3954', margin: '4px 0 0 0' }}>
                  {activeReadingNote.title}
                </h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  By: {activeReadingNote.uploadedBy?.name || 'Faculty Lecturer'}
                </span>
              </div>
              <button onClick={() => setActiveReadingNote(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#1e293b' }}>
              {activeReadingNote.textContent || 'No text content stored for this note.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setActiveReadingNote(null)} className="btn-outline">
                Close
              </button>
              <button onClick={() => handleDownload(activeReadingNote._id)} className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} /> Download .txt File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingMaterial && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>Edit Material Metadata</h2>
              <button onClick={() => setEditingMaterial(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={editingMaterial.title}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Course Code</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingMaterial.courseCode}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, courseCode: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Subject</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingMaterial.subject}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, subject: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={editingMaterial.description || ''}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditingMaterial(null)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn-accent">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
