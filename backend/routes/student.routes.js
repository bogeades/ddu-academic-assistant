const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getStudentCourses,
  getStudentProgressForInstructor,
} = require('../controllers/student.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize, restrictToSelfOrStaff } = require('../middleware/rbac.middleware');

router.use(protect);

// Student personal dashboard (FR-S08 - accessible to students and staff/admin testing)
router.get(
  '/dashboard',
  authorize('student', 'admin', 'lecturer', 'deptHead', 'registrar'),
  getStudentDashboard
);

// Student assigned courses (strictly based on department, year, semester, section)
router.get(
  '/courses',
  authorize('student', 'admin', 'lecturer', 'deptHead', 'registrar'),
  getStudentCourses
);

// Lecturer monitor student progress (FR-L06)
router.get(
  '/progress/:studentId',
  authorize('lecturer', 'deptHead', 'registrar', 'admin'),
  getStudentProgressForInstructor
);

module.exports = router;
