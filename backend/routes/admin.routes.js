const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserStatus,
  approveUser,
  resetUserCredentials,
  assignUserRole,
  deleteUser,
  getSystemSettings,
  updateSystemSettings,
  testEmailConfig,
  triggerManualBackup,
  getBackups,
  restoreFromBackup,
  getSecurityLogs,
  getAIHealthStatus,
  approveStudentAssignment,
  rejectStudentAssignment,
  approveLecturerAssignment,
  rejectLecturerAssignment,
  getAdminLecturerRegistrations,
  approveLecturerRegistration,
  rejectLecturerRegistration,
  resendLecturerInvitation,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  getAllCourses,
  createCourse,
  updateCourse,
} = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// Protect all admin routes with authentication
router.use(protect);

// Read-only access to departments and courses for academic staff (admin, registrar, deptHead, lecturer)
router.get('/departments', authorize('admin', 'registrar', 'deptHead', 'lecturer'), getAllDepartments);
router.get('/courses', authorize('admin', 'registrar', 'deptHead', 'lecturer'), getAllCourses);

// All other admin management endpoints require admin role
router.use(authorize('admin'));

// User Management (FR-A02, FR-A03)
router.get('/users', getAllUsers);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/reset-credentials', resetUserCredentials);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', assignUserRole);
router.delete('/users/:id', deleteUser);

// Student & Lecturer Assignment Approvals (FR-R01, FR-R02, FR-A02)
router.post('/student-assignments/:id/approve', approveStudentAssignment);
router.post('/student-assignments/:id/reject', rejectStudentAssignment);
router.post('/lecturer-assignments/:id/approve', approveLecturerAssignment);
router.post('/lecturer-assignments/:id/reject', rejectLecturerAssignment);

// Lecturer Registration Requests Approvals & Management
router.get('/lecturer-registrations', getAdminLecturerRegistrations);
router.post('/lecturer-registrations/:id/approve', approveLecturerRegistration);
router.post('/lecturer-registrations/:id/reject', rejectLecturerRegistration);
router.post('/lecturer-registrations/:id/resend-invite', resendLecturerInvitation);

// Dynamic Departments Management (FR-A04)
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);

// Course Management (FR-A04)
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);

// Global System Settings (FR-A04)
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.post('/settings/test-email', testEmailConfig);

// Backups & Recovery (FR-A05)
router.post('/backups/manual', triggerManualBackup);
router.get('/backups', getBackups);
router.post('/backups/:id/restore', restoreFromBackup);

// Monitoring & Security Logs (FR-A06)
router.get('/logs', getSecurityLogs);
router.get('/ai-health', getAIHealthStatus);

module.exports = router;
