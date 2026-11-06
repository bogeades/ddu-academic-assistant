const express = require('express');
const router = express.Router();
const {
  getAssignedCourses,
  getAssignedStudents,
  getStudentAcademicInfo,
  saveGrades,
  getLecturerProgress,
} = require('../controllers/lecturer.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(protect);

// Lecturer Course & Student Management (Req 2, 3)
router.get('/assigned-courses', authorize('lecturer', 'admin'), getAssignedCourses);
router.get('/assigned-students', authorize('lecturer', 'admin'), getAssignedStudents);
router.get('/student-academic-info/:studentId', authorize('lecturer', 'admin'), getStudentAcademicInfo);

// Grading System Integration (Req 4)
router.post('/grades', authorize('lecturer', 'admin'), saveGrades);

// Student Progress Monitoring (FR-L06)
router.get('/progress', authorize('lecturer', 'admin', 'deptHead'), getLecturerProgress);

module.exports = router;
