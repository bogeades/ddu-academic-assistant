const express = require('express');
const router = express.Router();
const {
  getAcademicRecord,
  updateSemesterRecord,
} = require('../controllers/record.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(protect);

router.get('/', getAcademicRecord);
router.get('/:studentId', getAcademicRecord);
router.post(
  '/:studentId/semester',
  authorize('registrar', 'admin', 'deptHead'),
  updateSemesterRecord
);

module.exports = router;
