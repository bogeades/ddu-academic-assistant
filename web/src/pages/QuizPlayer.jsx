import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  UploadCloud,
  FileText,
  Clock,
  Eye,
  Check,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
  Award,
  Plus,
  Trash2,
  X,
  Edit3,
} from 'lucide-react';

export const QuizPlayer = () => {
  const { user, role } = useAuth();
  const isLecturerOrAdmin = role === 'lecturer' || role === 'admin';

  // Mode tab: 'ai-gen' or 'manual-builder'
  const [activeTab, setActiveTab] = useState('ai-gen');

  // Quizzes list state
  const [quizzes, setQuizzes] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Active quiz & answering state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: string }
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // Results Modal State (for lecturers)
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [quizResultsData, setQuizResultsData] = useState([]);
  const [selectedQuizTitle, setSelectedQuizTitle] = useState('');
  const [loadingResults, setLoadingResults] = useState(false);

  // AI Generator form state
  const [genTopic, setGenTopic] = useState('Data Structures & Algorithms');
  const [genCount, setGenCount] = useState(5);
  const [genCourseCode, setGenCourseCode] = useState('COSC2041');
  const [genMaterialText, setGenMaterialText] = useState('');
  const [genFile, setGenFile] = useState(null);
  const [genPublish, setGenPublish] = useState(false);
  const [genDeadline, setGenDeadline] = useState('');
  const [generating, setGenerating] = useState(false);

  // Manual Quiz Builder state (FR-L03)
  const [manualTitle, setManualTitle] = useState('');
  const [manualTopic, setManualTopic] = useState('');
  const [manualCourseCode, setManualCourseCode] = useState('COSC2041');
  const [manualInstructions, setManualInstructions] = useState('');
  const [manualDeadline, setManualDeadline] = useState('');
  const [manualPublish, setManualPublish] = useState(true);
  const [manualQuestions, setManualQuestions] = useState([
    {
      type: 'mcq',
      text: 'What is the worst-case time complexity of QuickSort?',
      options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(1)'],
      correctAnswer: 'O(n^2)',
      maxScore: 2,
    },
    {
      type: 'short',
      text: 'Briefly explain the principle of divide-and-conquer algorithms with one example.',
      modelAnswer: 'Divide problem into subproblems, conquer subproblems recursively, combine solutions (e.g. MergeSort).',
      maxScore: 3,
    },
  ]);
  const [savingManualQuiz, setSavingManualQuiz] = useState(false);

  const fetchQuizzes = async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/ai/quizzes');
      setQuizzes(res.data.data || []);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleStartQuiz = async (quizId) => {
    try {
      const res = await api.get(`/ai/quizzes/${quizId}`);
      const data = res.data.data;
      setActiveQuiz(data);
      setCurrentQuestionIndex(0);
      setAnswers({});

      if (data.result) {
        setQuizResult(data.result);
      } else {
        setQuizResult(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load quiz questions.');
    }
  };

  const handleTogglePublish = async (quizId, currentStatus) => {
    try {
      const res = await api.patch(`/ai/quizzes/${quizId}/publish`, {
        published: !currentStatus,
      });
      setQuizzes((prev) =>
        prev.map((q) => (q._id === quizId ? { ...q, published: res.data.data.published } : q))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle publish status.');
    }
  };

  const handleDeleteQuiz = async (quizId, title) => {
    if (!window.confirm(`Are you sure you want to delete quiz "${title}"?`)) return;
    try {
      await api.delete(`/quizzes/${quizId}`);
      setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete quiz.');
    }
  };

  const handleViewResults = async (quiz) => {
    setSelectedQuizTitle(quiz.title);
    setResultsModalOpen(true);
    setLoadingResults(true);
    try {
      const res = await api.get(`/quizzes/${quiz._id}/results`);
      setQuizResultsData(res.data.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch student results.');
    } finally {
      setLoadingResults(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    if (quizResult) return; // Locked if already submitted
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!genTopic.trim() && !genMaterialText.trim() && !genFile) {
      return alert('Please enter a topic or upload/paste study material.');
    }

    setGenerating(true);
    const formData = new FormData();
    formData.append('topic', genTopic.trim());
    formData.append('count', genCount);
    formData.append('courseCode', genCourseCode);
    if (genMaterialText.trim()) formData.append('material', genMaterialText.trim());
    if (genFile) formData.append('file', genFile);
    if (isLecturerOrAdmin) formData.append('publish', String(genPublish));
    if (genDeadline) formData.append('deadline', genDeadline);

    try {
      const res = await api.post('/ai/quizzes/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newQuiz = res.data.data;
      alert(`Quiz "${newQuiz.title}" successfully generated!`);
      setGenMaterialText('');
      setGenFile(null);
      await fetchQuizzes();
      handleStartQuiz(newQuiz._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate quiz with AI Gateway.');
    } finally {
      setGenerating(false);
    }
  };

  // Helper: AI Pre-fill Questions into Manual Builder
  const handleAIAssistManualBuilder = async () => {
    const topicPrompt = manualTopic.trim() || manualTitle.trim() || 'Data Structures in Computer Science';
    setGenerating(true);
    try {
      const res = await api.post('/ai/quizzes/generate', {
        topic: topicPrompt,
        count: 4,
        courseCode: manualCourseCode,
        publish: false,
      });
      if (res.data.data?.questions) {
        setManualQuestions(res.data.data.questions);
        alert('AI drafted 4 questions! You can now edit and refine them before publishing.');
      }
    } catch (err) {
      alert('Failed to generate draft questions with AI.');
    } finally {
      setGenerating(false);
    }
  };

  // Manual Question Builder handlers
  const handleAddQuestion = (type) => {
    if (type === 'mcq') {
      setManualQuestions((prev) => [
        ...prev,
        {
          type: 'mcq',
          text: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          maxScore: 2,
        },
      ]);
    } else {
      setManualQuestions((prev) => [
        ...prev,
        {
          type: 'short',
          text: '',
          modelAnswer: '',
          maxScore: 3,
        },
      ]);
    }
  };

  const handleUpdateQuestion = (index, field, value) => {
    setManualQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleUpdateMCQOption = (qIdx, optIdx, text) => {
    setManualQuestions((prev) => {
      const updated = [...prev];
      const q = { ...updated[qIdx] };
      const newOptions = [...q.options];
      newOptions[optIdx] = text;
      q.options = newOptions;
      updated[qIdx] = q;
      return updated;
    });
  };

  const handleRemoveQuestion = (index) => {
    if (manualQuestions.length <= 1) {
      return alert('Quiz must contain at least one question.');
    }
    setManualQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveManualQuiz = async (e) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      return alert('Please specify a quiz title.');
    }

    // Validate questions
    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i];
      if (!q.text.trim()) {
        return alert(`Question #${i + 1} is missing the question prompt.`);
      }
      if (q.type === 'mcq') {
        if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
          return alert(`Question #${i + 1} (MCQ) must have a valid correct answer matching one of its options.`);
        }
      }
    }

    setSavingManualQuiz(true);
    try {
      const totalScore = manualQuestions.reduce((acc, q) => acc + (Number(q.maxScore) || 1), 0);
      const res = await api.post('/quizzes', {
        title: manualTitle.trim(),
        topic: manualTopic.trim() || 'General',
        courseCode: manualCourseCode.trim(),
        instructions: manualInstructions.trim(),
        deadline: manualDeadline ? new Date(manualDeadline) : undefined,
        questions: manualQuestions,
        maxScore: totalScore,
        published: manualPublish,
        isAIGenerated: false,
      });

      alert(res.data.message || 'Quiz created successfully!');
      setManualTitle('');
      setManualInstructions('');
      setManualDeadline('');
      await fetchQuizzes();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save quiz.');
    } finally {
      setSavingManualQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;

    const unanswered = activeQuiz.questions.filter((q) => !answers[q._id] || !answers[q._id].trim());
    if (unanswered.length > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unanswered.length} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    const payloadAnswers = activeQuiz.questions.map((q) => ({
      questionId: q._id,
      answer: answers[q._id] || '',
    }));

    setSubmitting(true);
    try {
      const res = await api.post(`/ai/quizzes/${activeQuiz._id}/submit`, {
        answers: payloadAnswers,
      });
      setQuizResult(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render Quiz Question Player
  if (activeQuiz) {
    const currentQ = activeQuiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === activeQuiz.questions.length - 1;
    const progressPercent = Math.round(
      ((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100
    );

    return (
      <div className="page-wrapper" style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <button
              onClick={() => {
                setActiveQuiz(null);
                setQuizResult(null);
                fetchQuizzes();
              }}
              className="btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '8px' }}
            >
              <ArrowLeft size={16} /> Back to Quizzes
            </button>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0b3954', margin: 0 }}>
              {activeQuiz.title}
            </h1>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Topic: {activeQuiz.topic} • Course: {activeQuiz.courseCode} • {activeQuiz.questions.length} Questions
            </div>
          </div>

          {quizResult && (
            <div
              style={{
                backgroundColor: quizResult.percentage >= 70 ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${quizResult.percentage >= 70 ? '#a7f3d0' : '#fde68a'}`,
                padding: '8px 16px',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>
                Score Achieved
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: quizResult.percentage >= 70 ? '#15803d' : '#b45309' }}>
                {quizResult.score} / {quizResult.maxScore} ({quizResult.percentage}%)
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ backgroundColor: '#e2e8f0', borderRadius: '999px', height: '6px', marginBottom: '20px', overflow: 'hidden' }}>
          <div
            style={{
              backgroundColor: '#0284c7',
              height: '100%',
              width: `${progressPercent}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Results Screen */}
        {quizResult ? (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Award size={24} color="#0284c7" />
              <h2 style={{ fontSize: '18px', color: '#0b3954', margin: 0 }}>Evaluation & Feedback (FR-S07)</h2>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b3954', margin: '0 0 6px 0' }}>Overall Assessment</h3>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{quizResult.feedback}</p>
            </div>

            <h3 style={{ fontSize: '15px', color: '#0b3954', marginBottom: '12px' }}>Question Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {quizResult.answers?.map((ans, idx) => {
                const q = activeQuiz.questions.find((item) => item._id === ans.questionId) || {};
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: `1px solid ${ans.correct ? '#bbf7d0' : '#fecaca'}`,
                      backgroundColor: ans.correct ? '#f0fdf4' : '#fef2f2',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#0b3954' }}>
                        Q{idx + 1}: {q.text || 'Question'}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '12px', color: ans.correct ? '#15803d' : '#b91c1c' }}>
                        {ans.score} / {ans.maxScore} pts
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                      <strong>Your Answer:</strong> {ans.answer || '(No answer provided)'}
                    </div>

                    {q.correctAnswer && (
                      <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>
                        <strong>Correct Answer:</strong> {q.correctAnswer}
                      </div>
                    )}

                    {ans.feedback && (
                      <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '6px' }}>
                        Feedback: {ans.feedback}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Question View (One-by-One) */
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0284c7' }}>
                Question {currentQuestionIndex + 1} of {activeQuiz.questions.length} ({currentQ.type.toUpperCase()})
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Max Score: {currentQ.maxScore || 1} pts
              </span>
            </div>

            <h2 style={{ fontSize: '17px', color: '#0b3954', marginBottom: '18px', lineHeight: '1.5' }}>
              {currentQ.text}
            </h2>

            {/* MCQ Options */}
            {currentQ.type === 'mcq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {(currentQ.options || []).map((opt, optIdx) => {
                  const isSelected = answers[currentQ._id] === opt;
                  return (
                    <label
                      key={optIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQ._id}`}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(currentQ._id, opt)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: '#1e293b' }}>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Short Answer Textarea */}
            {currentQ.type === 'short' && (
              <div style={{ marginBottom: '24px' }}>
                <textarea
                  className="input-field"
                  rows={5}
                  value={answers[currentQ._id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ._id, e.target.value)}
                  placeholder="Type your academic explanation or conceptual solution here..."
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-outline"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} /> Previous
              </button>

              {!isLastQuestion ? (
                <button
                  type="button"
                  className="btn-accent"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-accent"
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#16a34a' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Grading Answers...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Submit Quiz</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Quizzes Directory & Creation View
  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b3954', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle color="#0284c7" size={26} /> AI Quizzes & Test Center (FR-S07, FR-L03, FR-AI03, FR-AI04)
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          {isLecturerOrAdmin
            ? 'Design custom quizzes manually or generate balanced problem sets with AI. Track student scores and performance.'
            : 'Take course quizzes, test conceptual knowledge, and receive automated AI rubric evaluations.'}
        </p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Side: Creation Panel (AI or Manual Builder) */}
        <div className="card">
          {/* Tabs header */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('ai-gen')}
              className={activeTab === 'ai-gen' ? 'btn-primary' : 'btn-outline'}
              style={{ minHeight: '34px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={16} /> Generate with AI
            </button>

            {isLecturerOrAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('manual-builder')}
                className={activeTab === 'manual-builder' ? 'btn-primary' : 'btn-outline'}
                style={{ minHeight: '34px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit3 size={16} /> Manual Quiz Builder (FR-L03)
              </button>
            )}
          </div>

          {activeTab === 'ai-gen' ? (
            /* AI Generator Form */
            <form onSubmit={handleGenerateQuiz}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Topic / Concept *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. Graph Algorithms & Dijkstra Shortest Path"
                  required={!genMaterialText && !genFile}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Question Count
                  </label>
                  <select
                    className="input-field"
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value, 10))}
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={8}>8 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Course Code
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={genCourseCode}
                    onChange={(e) => setGenCourseCode(e.target.value)}
                    placeholder="e.g. COSC2041"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Upload Source Material (Optional: PDF, DOCX, TXT)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => setGenFile(e.target.files[0] || null)}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Or Paste Study Material Text
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={genMaterialText}
                  onChange={(e) => setGenMaterialText(e.target.value)}
                  placeholder="Paste lecture notes or chapter excerpt..."
                />
              </div>

              {/* Lecturer Options */}
              {isLecturerOrAdmin && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={genPublish}
                      onChange={(e) => setGenPublish(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Publish immediately to enrolled students</span>
                  </label>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      Submission Deadline (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      className="input-field"
                      value={genDeadline}
                      onChange={(e) => setGenDeadline(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn-accent"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Generating AI Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Generate Practice Quiz</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Manual Quiz Builder Mode (FR-L03) */
            <form onSubmit={handleSaveManualQuiz}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0b3954' }}>
                  Manual Quiz Creator
                </span>
                <button
                  type="button"
                  onClick={handleAIAssistManualBuilder}
                  disabled={generating}
                  className="btn-outline"
                  style={{ minHeight: '28px', fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Sparkles size={12} color="#0284c7" />
                  <span>{generating ? 'Drafting...' : 'Pre-fill with AI'}</span>
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Quiz Title *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Chapter 4: Binary Trees & Heaps Quiz"
                  required
                />
              </div>

              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                    Course Code *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={manualCourseCode}
                    onChange={(e) => setManualCourseCode(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                    Topic
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={manualTopic}
                    onChange={(e) => setManualTopic(e.target.value)}
                    placeholder="e.g. Trees and Heaps"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Instructions
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={manualInstructions}
                  onChange={(e) => setManualInstructions(e.target.value)}
                  placeholder="Instructions for students taking this assessment..."
                />
              </div>

              <div className="grid-2" style={{ marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={manualDeadline}
                    onChange={(e) => setManualDeadline(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={manualPublish}
                      onChange={(e) => setManualPublish(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Publish immediately to students</span>
                  </label>
                </div>
              </div>

              {/* Questions List */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0b3954' }}>
                    Questions ({manualQuestions.length})
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('mcq')}
                      className="btn-outline"
                      style={{ minHeight: '26px', fontSize: '11px', padding: '2px 8px' }}
                    >
                      + Add MCQ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('short')}
                      className="btn-outline"
                      style={{ minHeight: '26px', fontSize: '11px', padding: '2px 8px' }}
                    >
                      + Add Short Answer
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {manualQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7' }}>
                          Question #{idx + 1} ({q.type.toUpperCase()})
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>
                            Score:
                            <input
                              type="number"
                              min="1"
                              value={q.maxScore || 1}
                              onChange={(e) => handleUpdateQuestion(idx, 'maxScore', Number(e.target.value))}
                              style={{ width: '45px', marginLeft: '4px', padding: '2px 4px', fontSize: '11px' }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
                            title="Remove question"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        className="input-field"
                        placeholder="Enter question text..."
                        value={q.text}
                        onChange={(e) => handleUpdateQuestion(idx, 'text', e.target.value)}
                        style={{ marginBottom: '8px', fontSize: '12px' }}
                        required
                      />

                      {/* MCQ Options */}
                      {q.type === 'mcq' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="radio"
                                name={`correct-${idx}`}
                                checked={q.correctAnswer === opt && opt !== ''}
                                onChange={() => handleUpdateQuestion(idx, 'correctAnswer', opt)}
                                title="Mark as correct answer"
                              />
                              <input
                                type="text"
                                className="input-field"
                                placeholder={`Option ${optIdx + 1}`}
                                value={opt}
                                onChange={(e) => handleUpdateMCQOption(idx, optIdx, e.target.value)}
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                                required
                              />
                            </div>
                          ))}
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            * Select the radio button corresponding to the correct answer.
                          </div>
                        </div>
                      )}

                      {/* Short Answer Rubric */}
                      {q.type === 'short' && (
                        <textarea
                          className="input-field"
                          rows={2}
                          placeholder="Model answer or key grading concepts..."
                          value={q.modelAnswer || ''}
                          onChange={(e) => handleUpdateQuestion(idx, 'modelAnswer', e.target.value)}
                          style={{ fontSize: '11px' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={savingManualQuiz}
              >
                {savingManualQuiz ? 'Saving Quiz...' : 'Create & Save Quiz (FR-L03)'}
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Available Quizzes List */}
        <div className="card">
          <h2 style={{ fontSize: '17px', color: '#0b3954', marginBottom: '14px' }}>
            Academic Quizzes ({quizzes.length})
          </h2>

          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <span>Loading quizzes...</span>
            </div>
          ) : quizzes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              <HelpCircle size={40} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No quizzes available. Generate or create one on the left!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {quizzes.map((q) => {
                const isCreator = q.createdBy?._id?.toString() === user?._id?.toString();
                return (
                  <div
                    key={q._id}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#0b3954' }}>
                          {q.title}
                        </span>
                        {q.isAIGenerated ? (
                          <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            AI Generated
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            Manual
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            background: q.published ? '#dcfce7' : '#f1f5f9',
                            color: q.published ? '#15803d' : '#64748b',
                          }}
                        >
                          {q.published ? 'Published' : 'Draft'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Course: {q.courseCode || 'COSC'} • Topic: {q.topic} • {q.questions?.length || 0} Questions
                        {q.deadline && ` • Due: ${new Date(q.deadline).toLocaleDateString()}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Lecturer Actions */}
                      {isLecturerOrAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleViewResults(q)}
                            className="btn-outline"
                            style={{ minHeight: '30px', padding: '2px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="View student results"
                          >
                            <Award size={13} color="#0284c7" />
                            <span>Results</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePublish(q._id, q.published)}
                            className="btn-outline"
                            style={{ minHeight: '30px', padding: '2px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Toggle publish status"
                          >
                            {q.published ? <ToggleRight size={15} color="#16a34a" /> : <ToggleLeft size={15} color="#94a3b8" />}
                            <span>{q.published ? 'Live' : 'Draft'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(q._id, q.title)}
                            className="btn-outline"
                            style={{ minHeight: '30px', padding: '2px 8px', fontSize: '11px', color: '#b91c1c', borderColor: '#fca5a5' }}
                            title="Delete quiz"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleStartQuiz(q._id)}
                        className="btn-accent"
                        style={{ minHeight: '32px', padding: '4px 12px', fontSize: '12px' }}
                      >
                        Take Quiz
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lecturer Results Modal */}
      {resultsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '650px', width: '100%', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: '#0b3954', margin: '0 0 4px 0' }}>
                  Student Quiz Results: {selectedQuizTitle}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Submissions Recorded: {quizResultsData.length}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResultsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingResults ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>Loading student results...</p>
            ) : quizResultsData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                No students have completed this quiz yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {quizResultsData.map((res) => (
                  <div
                    key={res._id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#0b3954' }}>
                        {res.student?.name || 'Anonymous Student'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        ID: {res.student?.studentId || 'N/A'} • Submitted: {new Date(res.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: res.percentage >= 70 ? '#dcfce7' : '#fef3c7',
                          color: res.percentage >= 70 ? '#166534' : '#92400e',
                        }}
                      >
                        {res.score} / {res.maxScore} ({res.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
