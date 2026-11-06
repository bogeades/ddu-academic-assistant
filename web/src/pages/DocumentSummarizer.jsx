import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  UploadCloud,
  FileText,
  Download,
  Trash2,
  Clock,
  Sparkles,
  Loader2,
  FileCode,
  BookOpen,
} from 'lucide-react';

export const DocumentSummarizer = () => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [savedSummaries, setSavedSummaries] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const fetchSavedSummaries = async () => {
    try {
      const res = await api.get('/ai/summaries');
      setSavedSummaries(res.data.data || []);
    } catch (err) {
      console.error('Failed to load saved summaries:', err);
    }
  };

  useEffect(() => {
    fetchSavedSummaries();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSummarize = async (e) => {
    e.preventDefault();
    if (!file && !text.trim()) {
      return alert('Please select a document file (PDF, DOCX, TXT, MD) or paste lecture text.');
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (text) formData.append('text', text);
    if (title) formData.append('title', title);

    try {
      const res = await api.post('/ai/summarize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data);
      fetchSavedSummaries();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to summarize document.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (summaryId, docTitle) => {
    try {
      const res = await api.get(`/ai/summaries/${summaryId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${docTitle || 'Academic_Summary'}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download summary file.');
    }
  };

  const handleDeleteSummary = async (id) => {
    if (window.confirm('Delete this saved summary?')) {
      try {
        await api.delete(`/ai/summaries/${id}`);
        setSavedSummaries((prev) => prev.filter((s) => s._id !== id));
        if (result && result._id === id) {
          setResult(null);
        }
      } catch (err) {
        alert('Failed to delete summary.');
      }
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen color="#0284c7" size={26} /> Document AI Summarizer (FR-S04, FR-L07, FR-AI02)
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Upload syllabus notes, course handouts, or chapters (PDF, DOCX, TXT, MD) for factual academic summarization and offline study.
        </p>
      </div>

      <div className="grid-2">
        {/* Upload Form */}
        <div className="card">
          <h2 style={{ fontSize: '17px', color: '#0b3954', marginBottom: '16px' }}>
            Submit Material for Summarization
          </h2>

          <form onSubmit={handleSummarize}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Summary Title (Optional)
              </label>
              <input
                type="text"
                className="input-field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 4: Distributed Database Transactions"
              />
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragging ? '2px dashed #0284c7' : '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '24px 16px',
                textAlign: 'center',
                backgroundColor: isDragging ? '#f0f9ff' : '#f8fafc',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'all 0.2s ease',
              }}
              onClick={() => document.getElementById('file-input-summarizer').click()}
            >
              <UploadCloud size={36} color={isDragging ? '#0284c7' : '#94a3b8'} style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0b3954' }}>
                {file ? file.name : 'Click or Drag & Drop Document Here'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Supports PDF, DOCX, TXT, MD (Max 10 MB in-memory)
              </div>
              {file && (
                <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 'bold', marginTop: '6px' }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              )}
              <input
                id="file-input-summarizer"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ textAlign: 'center', margin: '10px 0', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>
              — OR PASTE ACADEMIC TEXT DIRECTLY —
            </div>

            <div style={{ marginBottom: '18px' }}>
              <textarea
                className="input-field"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste lecture excerpts, algorithm proofs, or course notes here..."
              />
            </div>

            <button
              type="submit"
              className="btn-accent"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>AI Analyzing & Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate Academic Summary</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Generated Summary View & Saved Summaries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {result ? (
            <div className="card" style={{ border: '2px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>{result.title}</h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Source: {result.sourceName || result.source || 'Direct Input'} • {result.sourceLength || result.originalTextLength || 0} chars
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(result._id, result.title)}
                  className="btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Download size={16} /> Download .txt
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: '#0b3954', marginBottom: '6px' }}>Summary Output:</h4>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#334155',
                    lineHeight: '1.7',
                    background: '#f8fafc',
                    padding: '14px',
                    borderRadius: '6px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {result.summaryText}
                </div>
              </div>

              {result.keyPoints && result.keyPoints.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', color: '#0b3954', marginBottom: '8px' }}>Key Takeaways & Points:</h4>
                  <ul style={{ paddingLeft: '20px', color: '#334155', fontSize: '13px', lineHeight: '1.8' }}>
                    {result.keyPoints.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h3 style={{ color: '#475569', fontSize: '16px', marginBottom: '6px' }}>No Summary Generated Yet</h3>
              <p style={{ fontSize: '13px' }}>Upload a file or paste text on the left to view the AI summary.</p>
            </div>
          )}

          {/* Saved Summaries for Offline Study */}
          <div className="card">
            <h3 style={{ fontSize: '16px', color: '#0b3954', marginBottom: '14px' }}>
              Saved Summaries for Offline Study (FR-S04)
            </h3>
            {savedSummaries.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>No saved summaries yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {savedSummaries.map((s) => (
                  <div
                    key={s._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#0b3954' }}>{s.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(s.createdAt).toLocaleDateString()} • {s.sourceName || s.source || 'Direct Input'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleDownload(s._id, s.title)}
                        className="btn-outline"
                        style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={14} /> Download .txt
                      </button>
                      <button
                        onClick={() => handleDeleteSummary(s._id)}
                        className="btn-outline"
                        style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px', color: '#ef4444', borderColor: '#fca5a5' }}
                        title="Delete summary"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
