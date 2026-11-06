const express = require('express');
const router = express.Router();
const {
  exportTranscriptPDF,
  exportCourseEnrollmentListPDF,
  getStudentsDirectory,
} = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(protect);

// Student transcript PDF (FR-R05)
router.get('/transcript/:studentId', exportTranscriptPDF);

// Course enrollment list PDF (FR-R05)
router.get(
  '/enrollment-list/:courseId',
  authorize('registrar', 'lecturer', 'deptHead', 'admin'),
  exportCourseEnrollmentListPDF
);

// Student directory list & search (FR-R06, FR-R02)
router.get(
  '/students',
  authorize('registrar', 'deptHead', 'lecturer', 'admin'),
  getStudentsDirectory
);

module.exports = router;
