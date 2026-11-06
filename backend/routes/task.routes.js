const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  completeTask,
  updateTask,
  deleteTask,
} = require('../controllers/task.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All task routes require authentication (FR-S06: Student task manager)
router.use(protect);
router.use(authorize('student', 'admin', 'lecturer', 'deptHead', 'registrar'));

router.get('/', getTasks);
router.post('/', createTask);
router.patch('/:id/complete', completeTask);
router.patch('/:id', updateTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
