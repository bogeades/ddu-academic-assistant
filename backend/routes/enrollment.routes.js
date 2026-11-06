const express = require('express');
const router = express.Router();
const {
  enrollCourse,
  getEnrollments,
  dropCourse,
} = require('../controllers/enrollment.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(protect);

router.post('/', enrollCourse);
router.get('/', getEnrollments);
router.delete('/:id', dropCourse);

module.exports = router;
