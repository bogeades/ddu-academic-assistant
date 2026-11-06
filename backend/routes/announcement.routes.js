const express = require('express');
const router = express.Router();
const {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
} = require('../controllers/announcement.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(protect);

router.get('/', getAnnouncements);
router.post('/', authorize('lecturer', 'admin', 'deptHead'), createAnnouncement);
router.delete('/:id', authorize('lecturer', 'admin', 'deptHead'), deleteAnnouncement);

module.exports = router;
