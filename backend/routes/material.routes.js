const express = require('express');
const router = express.Router();
const {
  getMaterials,
  getMaterialById,
  uploadMaterial,
  downloadMaterial,
  viewMaterial,
  updateMaterial,
  deleteMaterial,
  summarizeStoredMaterial,
} = require('../controllers/material.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const upload = require('../middleware/upload.middleware');
const { compressImageIfApplicable } = require('../middleware/upload.middleware');

// All material endpoints require authentication
router.use(protect);

// 1. Material library search, filter, and view (FR-S05)
router.get('/', getMaterials);
router.get('/:id', getMaterialById);
router.get('/:id/download', downloadMaterial);
router.get('/:id/view', viewMaterial);

// 2. Upload learning materials (FR-L02, FR-A06)
router.post(
  '/',
  authorize('lecturer', 'admin', 'deptHead'),
  upload.single('file'),
  compressImageIfApplicable,
  uploadMaterial
);

// 3. Edit metadata (FR-L02)
router.put('/:id', authorize('lecturer', 'admin', 'deptHead'), updateMaterial);

// 4. Delete learning materials (FR-L02, FR-A06)
router.delete('/:id', authorize('lecturer', 'admin', 'deptHead'), deleteMaterial);

// 5. AI summarize material (FR-L07)
router.post('/:id/summarize', summarizeStoredMaterial);
router.post('/:id/ai-summarize', summarizeStoredMaterial);

module.exports = router;
