import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  Send,
  Bot,
  User,
  Trash2,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your Dire Dawa University AI Academic Assistant. Ask me any question related to Data Structures, Artificial Intelligence, Database Systems, Network Security, or any computer science course topic.',
      status: 'answered',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchHistory = async (page = 1) => {
    try {
      const res = await api.get('/ai/history', {
        params: { page, limit: 15 },
      });
      const items = res.data.data || [];
      if (page === 1) {
        setHistory(items);
      } else {
        setHistory((prev) => [...prev, ...items]);
      }
      setHistoryPage(page);
      setHasMoreHistory(res.data.pagination && page < res.data.pagination.pages);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    setInput('');

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: userQuestion, timestamp: new Date().toLocaleTimeString() },
    ]);
    setLoading(true);

    try {
      const res = await api.post('/ai/ask', { question: userQuestion });
      const data = res.data.data;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          status: data.status,
          cached: data.cached,
          responseMs: data.responseMs,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      fetchHistory(1);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        'AI academic assistant service is temporarily unavailable. Please try again shortly or review course lecture slides.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: errorMessage,
          isError: true,
          status: 'failed',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadPastQuestion = (item) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: item.question, timestamp: new Date(item.createdAt).toLocaleTimeString() },
      {
        role: 'assistant',
        text: item.answer,
        status: item.status,
        cached: item.cached,
        responseMs: item.responseMs,
        timestamp: new Date(item.createdAt).toLocaleTimeString(),
      },
    ]);
  };

  const handleDeleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/history/${id}`);
      setHistory((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert('Failed to delete history item.');
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="page-wrapper" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0b3954', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles color="#0284c7" size={24} /> AI Academic Assistant (FR-S03, FR-AI01)
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            Official computer science academic tutor for Dire Dawa University students & faculty
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* Main Conversation Panel */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: 0, padding: '16px' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg, index) => {
              const isUnanswerable = msg.status === 'unanswerable';
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isUnanswerable ? '#f59e0b' : msg.isError ? '#ef4444' : '#0284c7',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Bot size={18} />
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor:
                          msg.role === 'user'
                            ? '#0b3954'
                            : isUnanswerable
                            ? '#fffbeb'
                            : msg.isError
                            ? '#fef2f2'
                            : '#f1f5f9',
                        color: msg.role === 'user' ? '#ffffff' : '#0f172a',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        border: isUnanswerable
                          ? '1px solid #fde68a'
                          : msg.isError
                          ? '1px solid #fecaca'
                          : '1px solid #e2e8f0',
                        position: 'relative',
                      }}
                    >
                      {isUnanswerable && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>
                          <AlertTriangle size={16} /> Course Advisory Notice
                        </div>
                      )}

                      {msg.text}

                      {/* Copy Answer Button for Assistant Responses */}
                      {msg.role === 'assistant' && !msg.isError && (
                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleCopy(msg.text, index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: copiedIndex === index ? '#16a34a' : '#64748b',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                            title="Copy answer to clipboard"
                          >
                            {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {msg.timestamp}
                      {msg.cached && ' • Cached'}
                      {msg.responseMs ? ` • ${msg.responseMs}ms` : ''}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Thinking / Loading State */}
            {loading && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: '#0284c7', fontSize: '13px', background: '#f0f9ff', padding: '10px 14px', borderRadius: '10px', width: 'fit-content' }}>
                <Loader2 size={18} className="animate-spin" />
                <span>AI Tutor is formulating an academic answer...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <input
              type="text"
              className="input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask an academic question (e.g., 'Explain B-trees vs AVL trees with time complexity')"
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-accent" disabled={loading || !input.trim()}>
              <Send size={18} />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* History Sidebar */}
        <div className="card" style={{ width: '300px', display: 'flex', flexDirection: 'column', margin: 0, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b3954', margin: 0 }}>
              Question History
            </h3>
            <button
              onClick={() => fetchHistory(1)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
              title="Refresh history"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '20px' }}>
                No prior question history yet.
              </p>
            ) : (
              history.map((h) => (
                <div
                  key={h._id}
                  onClick={() => loadPastQuestion(h)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: '600', color: '#0b3954', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.question}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                      {new Date(h.createdAt).toLocaleDateString()} • {h.status}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteHistoryItem(e, h._id)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                    title="Delete item"
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}

            {hasMoreHistory && (
              <button
                onClick={() => fetchHistory(historyPage + 1)}
                className="btn-outline"
                style={{ width: '100%', fontSize: '12px', padding: '6px' }}
              >
                Load More History
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
