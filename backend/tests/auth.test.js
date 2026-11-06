const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authorize, restrictToSelfOrStaff } = require('../middleware/rbac.middleware');
const { validatePasswordPolicy } = require('../middleware/validator.middleware');
const { register, login, verifyEmail } = require('../controllers/auth.controller');
const { User, SystemSetting } = require('../models');

// Mock User and SystemSetting
jest.mock('../models', () => {
  const mockUserInstance = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Yared Getachew',
    email: 'student.cs@ddu.edu.et',
    role: 'student',
    status: 'active',
    emailVerified: false,
    studentId: 'DDU/R/1024/14',
    yearOfStudy: 3,
    save: jest.fn().mockResolvedValue(true),
    matchPassword: jest.fn().mockImplementation(async (pwd) => pwd === 'CorrectPassword123'),
  };

  const MockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const MockSystemSettingModel = {
    getSettings: jest.fn().mockResolvedValue({
      sessionTimeout: 120,
      registrationEnabled: true,
      passwordPolicy: {
        minLength: 8,
        requireNumbers: true,
        requireUppercase: true,
        requireSymbols: false,
      },
    }),
  };

  const MockSecurityLog = {
    create: jest.fn().mockResolvedValue(true),
  };

  return {
    User: MockUserModel,
    SystemSetting: MockSystemSettingModel,
    SecurityLog: MockSecurityLog,
    Department: { findOne: jest.fn() },
    Course: { find: jest.fn() },
    Enrollment: { find: jest.fn() },
    CourseMaterial: { find: jest.fn() },
    Summary: { find: jest.fn() },
    Task: { find: jest.fn() },
    QuestionHistory: { find: jest.fn() },
    Quiz: { find: jest.fn() },
    QuizResult: { find: jest.fn() },
    Assignment: { find: jest.fn() },
    Submission: { find: jest.fn() },
    Announcement: { find: jest.fn() },
    AcademicRecord: { find: jest.fn() },
    Notification: { find: jest.fn() },
    Backup: { find: jest.fn() },
  };
});

describe('Phase 1: Auth & RBAC Core Unit & Integration Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'ddu_secret_key_test';
  });

  describe('FR-S01: Password Policy Enforcement & Validation', () => {
    it('should approve passwords that satisfy length, numbers, and uppercase requirements', async () => {
      const isValid = await validatePasswordPolicy('SecureP@ssw0rd', { req: {} });
      expect(isValid).toBe(true);
    });

    it('should reject passwords shorter than minLength (8 chars)', async () => {
      await expect(validatePasswordPolicy('Pass1', { req: {} })).rejects.toThrow(
        /at least 8 characters/i
      );
    });

    it('should reject passwords without any numeric digits', async () => {
      await expect(validatePasswordPolicy('PasswordOnly', { req: {} })).rejects.toThrow(
        /at least one numerical digit/i
      );
    });

    it('should reject passwords without uppercase letters', async () => {
      await expect(validatePasswordPolicy('password123', { req: {} })).rejects.toThrow(
        /at least one uppercase letter/i
      );
    });
  });

  describe('FR-S01: Student Registration Controller', () => {
    it('should create student account and trigger email verification dispatch', async () => {
      User.findOne.mockResolvedValue(null); // No existing email or studentId
      User.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        name: 'Abebe Chala',
        email: 'abebe@ddu.edu.et',
        role: 'student',
        emailVerified: false,
        studentId: 'DDU/R/1025/14',
        yearOfStudy: 2,
      });

      const req = {
        body: {
          name: 'Abebe Chala',
          email: 'abebe@ddu.edu.et',
          password: 'Password123',
          studentId: 'DDU/R/1025/14',
          yearOfStudy: 2,
        },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      };

      const res = {
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            email: 'abebe@ddu.edu.et',
            role: 'student',
            emailVerified: false,
          }),
        })
      );
    });

    it('should reject registration if email is already taken', async () => {
      User.findOne.mockResolvedValue({ _id: 'existing-id', email: 'taken@ddu.edu.et' });

      const req = {
        body: {
          name: 'Existing User',
          email: 'taken@ddu.edu.et',
          password: 'Password123',
        },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/already registered/i),
        })
      );
    });
  });

  describe('FR-S02, L01, R01, DH01, A01: Login Controller for All Roles', () => {
    it('should authenticate user with valid credentials and return JWT token', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Prof. Tigist Hailu',
        email: 'lecturer.cs@ddu.edu.et',
        role: 'lecturer',
        status: 'active',
        emailVerified: true,
        matchPassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const req = {
        body: {
          email: 'lecturer.cs@ddu.edu.et',
          password: 'CorrectPassword123',
        },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: expect.any(String),
          user: expect.objectContaining({
            email: 'lecturer.cs@ddu.edu.et',
            role: 'lecturer',
          }),
        })
      );
    });

    it('should reject login for inactive accounts', async () => {
      const inactiveUser = {
        _id: '507f1f77bcf86cd799439012',
        email: 'inactive@ddu.edu.et',
        status: 'inactive',
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(inactiveUser),
        }),
      });

      const req = {
        body: {
          email: 'inactive@ddu.edu.et',
          password: 'Password123',
        },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/deactivated/i),
        })
      );
    });
  });

  describe('RBAC Middleware & Student Data Isolation (NFR Security)', () => {
    it('should grant access when user has required role', () => {
      const middleware = authorize('admin', 'deptHead');
      const req = { user: { role: 'admin' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should forbid access when user lacks required role', () => {
      const middleware = authorize('admin');
      const req = { user: { role: 'student' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/not authorized/i),
        })
      );
    });

    it('should allow students to access their own records (restrictToSelfOrStaff)', () => {
      const middleware = restrictToSelfOrStaff('studentId');
      const req = {
        user: { _id: 'student-id-123', role: 'student' },
        params: { studentId: 'student-id-123' },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should block students from accessing another student records (restrictToSelfOrStaff)', () => {
      const middleware = restrictToSelfOrStaff('studentId');
      const req = {
        user: { _id: 'student-id-123', role: 'student' },
        params: { studentId: 'different-student-456' },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Security Violation/i),
        })
      );
    });

    it('should allow staff roles (registrar, lecturer, deptHead, admin) to access student data', () => {
      const middleware = restrictToSelfOrStaff('studentId');
      const req = {
        user: { _id: 'staff-id-999', role: 'registrar' },
        params: { studentId: 'any-student-456' },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
