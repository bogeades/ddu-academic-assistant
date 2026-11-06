const express = require('express');
const router = express.Router();
const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
  downloadAssignmentAttachment,
} = require('../controllers/assignment.controller');
const { getAssignmentSubmissions, submitAssignment } = require('../controllers/submission.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const upload = require('../middleware/upload.middleware');

router.use(protect);

router.get('/', getAssignments);
router.post(
  '/',
  authorize('lecturer', 'admin', 'deptHead'),
  upload.single('attachment'),
  createAssignment
);
router.get('/:id', getAssignmentById);
router.get('/:id/download', downloadAssignmentAttachment);
router.put(
  '/:id',
  authorize('lecturer', 'admin', 'deptHead'),
  upload.single('attachment'),
  updateAssignment
);
router.delete('/:id', authorize('lecturer', 'admin', 'deptHead'), deleteAssignment);
router.patch('/:id/publish', authorize('lecturer', 'admin', 'deptHead'), publishAssignment);

// Student submits assignment (FR-S08 partial)
router.post(
  '/:id/submit',
  authorize('student'),
  upload.single('file'),
  submitAssignment
);

// Submissions for assignment (FR-L04)
router.get(
  '/:id/submissions',
  authorize('lecturer', 'admin', 'deptHead'),
  getAssignmentSubmissions
);

module.exports = router;
