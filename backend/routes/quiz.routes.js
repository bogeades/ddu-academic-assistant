const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  publishQuiz,
  submitQuizAnswers,
  getQuizResultsForInstructor,
} = require('../controllers/quiz.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(protect);

router.get('/', getQuizzes);
router.post('/', authorize('lecturer', 'admin', 'deptHead'), createQuiz);
router.get('/:id', getQuizById);
router.put('/:id', authorize('lecturer', 'admin', 'deptHead'), updateQuiz);
router.delete('/:id', authorize('lecturer', 'admin', 'deptHead'), deleteQuiz);
router.patch('/:id/publish', authorize('lecturer', 'admin', 'deptHead'), publishQuiz);
router.post('/:id/submit', authorize('student'), submitQuizAnswers);
router.get('/:id/results', authorize('lecturer', 'admin', 'deptHead'), getQuizResultsForInstructor);

module.exports = router;
