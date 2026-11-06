const express = require('express');
const router = express.Router();
const {
  submitAssignment,
  getAssignmentSubmissions,
  getMySubmissions,
  gradeSubmission,
  getAIGradeSuggestion,
  downloadSubmissionFile,
} = require('../controllers/submission.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const upload = require('../middleware/upload.middleware');

router.use(protect);

// Student own submissions (FR-S08 partial)
router.get('/mine', authorize('student'), getMySubmissions);

// Submit assignment: support both /api/submissions/:assignmentId and /api/assignments/:id/submit
router.post(
  '/:assignmentId',
  authorize('student'),
  upload.single('file'),
  submitAssignment
);

// Lecturer submissions view by assignment (FR-L04)
router.get(
  '/assignment/:assignmentId',
  authorize('lecturer', 'admin', 'deptHead'),
  getAssignmentSubmissions
);

// Grading endpoints (FR-L04)
router.patch(
  '/:id/grade',
  authorize('lecturer', 'admin', 'deptHead'),
  gradeSubmission
);
router.post(
  '/:id/ai-grade',
  authorize('lecturer', 'admin', 'deptHead'),
  getAIGradeSuggestion
);

// Download submitted file
router.get('/:id/download', downloadSubmissionFile);

module.exports = router;
