const express = require('express');
const router = express.Router();
const {
  getStudentsDirectory,
  assignStudent,
  getLecturersDirectory,
  assignLecturer,
  getLecturerAssignments,
  getDepartmentsForRegistrar,
  getCoursesForRegistrar,
  registerStudentByRegistrar,
  registerLecturerByRegistrar,
  getLecturerRegistrations,
  resubmitLecturerRegistration,
} = require('../controllers/registrar.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All registrar routes guarded for Registrar and Admin
router.use(protect);
router.use(authorize('registrar', 'admin'));

router.get('/students', getStudentsDirectory);
router.post('/assign-student', assignStudent);
router.post('/register-student', registerStudentByRegistrar);
router.post('/register-lecturer', registerLecturerByRegistrar);
router.get('/lecturer-registrations', getLecturerRegistrations);
router.put('/lecturer-registrations/:id/resubmit', resubmitLecturerRegistration);
router.get('/lecturers', getLecturersDirectory);
router.post('/assign-lecturer', assignLecturer);
router.get('/lecturer-assignments', getLecturerAssignments);
router.get('/departments', getDepartmentsForRegistrar);
router.get('/courses', getCoursesForRegistrar);

module.exports = router;
