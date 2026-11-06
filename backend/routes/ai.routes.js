const express = require('express');
const router = express.Router();
const {
  askQuestion,
  getQuestionHistory,
  deleteQuestionHistoryItem,
  summarizeDocument,
  getSavedSummaries,
  downloadSummary,
  deleteSummary,
  generateQuiz,
  getQuizzes,
  getQuizById,
  togglePublishQuiz,
  submitQuizAnswers,
  getStudentQuizResults,
  getAIHealth,
} = require('../controllers/ai.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { aiLimiter } = require('../middleware/rateLimiter.middleware');
const { uploadDocument } = require('../services/fileText');

// All AI endpoints require authentication
router.use(protect);

// 1. Q&A and History (FR-S03, FR-AI01, FR-AI05)
router.post('/ask', authorize('student', 'lecturer'), aiLimiter, askQuestion);
router.get('/history', authorize('student', 'lecturer'), getQuestionHistory);
router.delete('/history/:id', authorize('student', 'lecturer'), deleteQuestionHistoryItem);

// 2. Document Summarization (FR-S04, FR-L07, FR-AI02)
router.post(
  '/summarize',
  authorize('student', 'lecturer'),
  aiLimiter,
  uploadDocument.single('file'),
  summarizeDocument
);
router.get('/summaries', authorize('student', 'lecturer'), getSavedSummaries);
router.get('/summaries/:id/download', authorize('student', 'lecturer'), downloadSummary);
router.delete('/summaries/:id', authorize('student', 'lecturer'), deleteSummary);

// 3. Quizzes & Practice (FR-S07, FR-AI03, FR-AI04)
router.post(
  '/quizzes/generate',
  authorize('student', 'lecturer'),
  aiLimiter,
  uploadDocument.single('file'),
  generateQuiz
);
router.get('/quizzes', authorize('student', 'lecturer'), getQuizzes);
router.get('/quizzes/:id', authorize('student', 'lecturer'), getQuizById);
router.patch('/quizzes/:id/publish', authorize('lecturer', 'admin'), togglePublishQuiz);
router.post('/quizzes/:id/submit', authorize('student'), aiLimiter, submitQuizAnswers);
router.get('/results', authorize('student'), getStudentQuizResults);

// 4. AI Gateway Health & Status (FR-A06)
router.get('/health', authorize('admin'), getAIHealth);

module.exports = router;
