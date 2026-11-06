const express = require('express');
const router = express.Router();
const {
  getCourseCurriculum,
  getLessonById,
  updateProgress,
  getResumeLearning,
  createLesson,
  updateLesson,
  deleteLesson,
} = require('../controllers/learning.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All learning routes require authentication
router.use(protect);

// Student & Academic Staff routes
router.get('/courses/:courseId/curriculum', getCourseCurriculum);
router.get('/lessons/:id', getLessonById);
router.post('/progress', updateProgress);
router.get('/resume', getResumeLearning);

// Content authoring routes (Lecturer, Admin)
router.post('/lessons', authorize('lecturer', 'admin', 'deptHead'), createLesson);
router.put('/lessons/:id', authorize('lecturer', 'admin', 'deptHead'), updateLesson);
router.delete('/lessons/:id', authorize('lecturer', 'admin', 'deptHead'), deleteLesson);

module.exports = router;
