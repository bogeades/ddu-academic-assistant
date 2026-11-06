const { body, validationResult } = require('express-validator');
const { SystemSetting } = require('../models');

/**
 * Middleware to check validation results from express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    const summaryMsg = errorList.map((e) => e.message).join(' | ');

    return res.status(400).json({
      success: false,
      message: summaryMsg || 'Validation failed. Please verify your submitted information.',
      errors: errorList,
    });
  }
  next();
};

/**
 * Validate password against university security policy (FR-A04, NFR Security)
 */
const validatePasswordPolicy = async (value, { req }) => {
  const settings = await SystemSetting.getSettings();
  const policy = settings.passwordPolicy || {
    minLength: 8,
    requireNumbers: true,
    requireUppercase: true,
    requireSymbols: false,
  };

  if (!value || value.length < policy.minLength) {
    throw new Error(`Password must be at least ${policy.minLength} characters in length.`);
  }

  if (policy.requireNumbers && !/\d/.test(value)) {
    throw new Error('Password must contain at least one numerical digit.');
  }

  if (policy.requireUppercase && !/[A-Z]/.test(value)) {
    throw new Error('Password must contain at least one uppercase letter.');
  }

  if (policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    throw new Error('Password must contain at least one special character/symbol.');
  }

  return true;
};

/**
 * Validation rules for student registration (FR-S01)
 */
const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be between 3 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid institutional or personal email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom(validatePasswordPolicy),

  body('studentId')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 4, max: 20 })
    .withMessage('Student ID must be between 4 and 20 characters'),

  body('department')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Invalid department ID reference'),

  body('yearOfStudy')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 7 })
    .withMessage('Year of study must be an integer between 1 and 7'),
];

/**
 * Validation rules for user login (FR-S02, L01, R01, DH01, A01)
 * Supports authentication with Email Address, Lecturer ID, or Student ID
 */
const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address or University ID is required')
    .custom((value) => {
      const clean = String(value).trim();
      const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(clean);
      const isUniversityId = /^[A-Za-z0-9_/-]{3,30}$/.test(clean);
      if (!isEmail && !isUniversityId) {
        throw new Error('Please enter a valid email address or University ID');
      }
      return true;
    }),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for password change
 */
const changePasswordRules = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .custom(validatePasswordPolicy),
];

module.exports = {
  validate,
  validatePasswordPolicy,
  registerRules,
  loginRules,
  changePasswordRules,
};
