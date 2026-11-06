const express = require('express');
const router = express.Router();
const {
  getDepartmentInfo,
  getDepartmentPerformance,
  getInstructorActivities,
  getDepartmentMaterials,
  reviewMaterialApproval,
  getDepartmentReports,
  exportDepartmentReportPDF,
} = require('../controllers/department.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(protect);
router.use(authorize('deptHead', 'admin'));

// Department Head Core Endpoints (FR-DH01 to FR-DH05)
router.get('/info', getDepartmentInfo);
router.get('/performance', getDepartmentPerformance);
router.get('/instructors', getInstructorActivities);
router.get('/materials', getDepartmentMaterials);
router.patch('/materials/:id/approval', reviewMaterialApproval);
router.get('/reports/pdf', exportDepartmentReportPDF);
router.get('/reports', getDepartmentReports);

module.exports = router;
