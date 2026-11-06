const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  verifyOTP,
  resendOTP,
  login,
  logout,
  getMe,
  changePassword,
  firstTimeSetup,
  lecturerVerifyOTP,
  lecturerActivateAccount,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const {
  validate,
  registerRules,
  loginRules,
  changePasswordRules,
} = require('../middleware/validator.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

// Public authentication routes with brute-force protection
router.post('/register', authLimiter, registerRules, validate, register);
router.post('/verify-email', verifyEmail);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', authLimiter, resendOTP);
router.post('/login', authLimiter, loginRules, validate, login);
router.post('/first-time-setup', authLimiter, firstTimeSetup);
router.post('/lecturer-verify-otp', authLimiter, lecturerVerifyOTP);
router.post('/lecturer-activate-account', authLimiter, lecturerActivateAccount);

// Protected authentication routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePasswordRules, validate, changePassword);

module.exports = router;
