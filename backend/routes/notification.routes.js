const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
