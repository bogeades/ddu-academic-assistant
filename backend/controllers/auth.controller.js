const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, SystemSetting, LecturerRegistration } = require('../models');
const { sendVerificationEmail, sendApprovalOtpEmail } = require('../services/email.service');
const { logSecurityEvent } = require('../middleware/securityLog.middleware');

/**
 * Generate signed JWT token
 * Uses sessionTimeout from SystemSetting if available
 */
const generateToken = async (user) => {
  const settings = await SystemSetting.getSettings();
  const sessionTimeoutMin = settings.sessionTimeout || 120;
  
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'ddu_super_secret_jwt_key_2026_academic_assistant_cs_iot',
    {
      expiresIn: `${sessionTimeoutMin}m`,
    }
  );
};

/**
 * @desc    FR-S01: Register a new student account
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, studentId, department, yearOfStudy } = req.body;

    // Check registration control in system settings (FR-A04)
    const settings = await SystemSetting.getSettings();
    if (!settings.registrationEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Student self-registration is currently disabled by university administration.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await logSecurityEvent({
        req,
        action: 'REGISTRATION_ATTEMPT_DUPLICATE_EMAIL',
        status: 'failure',
        details: { email },
      });
      return res.status(400).json({
        success: false,
        message: 'An account with this email address is already registered.',
      });
    }

    // Check studentId uniqueness if provided
    if (studentId) {
      const existingId = await User.findOne({ studentId });
      if (existingId) {
        return res.status(400).json({
          success: false,
          message: 'A student with this Student ID is already registered.',
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10));
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate email verification token (FR-S01)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'student',
      status: 'pending',
      emailVerified: false,
      studentId: studentId || undefined,
      department: department || undefined,
      yearOfStudy: yearOfStudy || 1,
      verificationToken,
      verificationExpires,
    });

    // Log registration security event
    await logSecurityEvent({
      req,
      action: 'USER_REGISTER_SUCCESS_PENDING_APPROVAL',
      user: user._id,
      status: 'success',
      details: { email: user.email, role: 'student', studentId: user.studentId },
    });

    res.status(201).json({
      success: true,
      message: 'Student registration submitted successfully! Your account is pending administrator approval. Once approved by the university admin, your verification OTP will be sent to your email.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        studentId: user.studentId,
        yearOfStudy: user.yearOfStudy,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S01: Verify student email address via verification token
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token.',
      });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    await logSecurityEvent({
      req,
      action: 'EMAIL_VERIFIED_SUCCESS',
      user: user._id,
      status: 'success',
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You may now log in to the portal.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify 6-digit OTP sent to user after admin approval
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, otpCode } = req.body;
    const cleanOtp = String(otp || otpCode || '').trim();

    if (!email || !cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Email address and 6-digit OTP code are required.',
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail })
      .select('+otpCode +otpExpires')
      .populate('department', 'name code');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is still pending administrator approval. Please wait for approval before verifying.',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.',
      });
    }

    if (!user.otpCode || user.otpCode !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please check the code sent to your registered email.',
      });
    }

    if (user.otpExpires && new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({
        success: false,
        message: 'This OTP code has expired. Please request a new verification code from the administrator.',
      });
    }

    // Verify and activate account
    user.emailVerified = true;
    user.status = 'active';
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.lastLogin = new Date();
    await user.save();

    const token = await generateToken(user);

    await logSecurityEvent({
      req,
      action: 'OTP_VERIFICATION_SUCCESS',
      user: user._id,
      status: 'success',
      details: { email: user.email, role: user.role },
    });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully! Welcome to Dire Dawa University Smart Academic Portal.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
        yearOfStudy: user.yearOfStudy,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend OTP to approved user
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+otpCode +otpExpires');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is still pending administrator approval. An administrator must approve your account first.',
      });
    }

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otpCode;
    user.otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const emailResult = await sendApprovalOtpEmail(user.email, user.name, otpCode);

    return res.status(200).json({
      success: true,
      message: emailResult?.isReal && emailResult?.success
        ? `A fresh 6-digit OTP code has been delivered to ${user.email}.`
        : `A fresh OTP code has been generated for ${user.email}.`,
      devOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S02, FR-L01, FR-R01, FR-DH01, FR-A01: Secure Login for all actors
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanIdentifier = String(email || '').trim();

    // Support login using Email Address, Lecturer ID, or Student ID
    const query = cleanIdentifier.includes('@')
      ? { email: cleanIdentifier.toLowerCase() }
      : {
          $or: [
            { email: cleanIdentifier.toLowerCase() },
            { lecturerId: cleanIdentifier.toUpperCase() },
            { studentId: cleanIdentifier.toUpperCase() },
          ],
        };

    // Retrieve user including passwordHash
    const user = await User.findOne(query)
      .select('+passwordHash')
      .populate('department', 'name code');

    if (!user) {
      await logSecurityEvent({
        req,
        action: 'LOGIN_FAILURE_NOT_FOUND',
        status: 'failure',
        details: { identifier: cleanIdentifier },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    // Check account status
    if (user.status === 'pending') {
      await logSecurityEvent({
        req,
        action: 'LOGIN_BLOCKED_PENDING_APPROVAL',
        user: user._id,
        status: 'warning',
        details: { email },
      });
      return res.status(403).json({
        success: false,
        status: 'pending',
        message: 'Your account is pending administrator approval. Please wait for the university administrator to approve your account before signing in.',
      });
    }

    if (user.status === 'inactive') {
      await logSecurityEvent({
        req,
        action: 'LOGIN_BLOCKED_INACTIVE',
        user: user._id,
        status: 'warning',
        details: { email },
      });
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.',
      });
    }

    // Compare password
    let isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const userWithTemp = await User.findById(user._id).select('+tempPassword');
      if (userWithTemp?.tempPassword && userWithTemp.tempPassword === password) {
        isMatch = true;
      } else {
        await logSecurityEvent({
          req,
          action: 'LOGIN_FAILURE_INCORRECT_PASSWORD',
          user: user._id,
          status: 'failure',
          details: { email },
        });
        return res.status(401).json({
          success: false,
          message: user.mustChangePassword
            ? 'Incorrect password. Please enter the temporary default password sent upon admin approval.'
            : 'Invalid email address or password.',
        });
      }
    }

    // Check if user has an unverified OTP requirement
    const userWithOtp = await User.findById(user._id).select('+otpCode +otpExpires +tempPassword');

    // First-time setup: prompt for OTP verification and permanent password creation
    if (user.mustChangePassword) {
      return res.status(200).json({
        success: false,
        requirePasswordSetup: true,
        requireOtp: true,
        email: user.email,
        tempPassword: password,
        message: 'First-time login: Please enter your one-time verification OTP and create your permanent personal password.',
        devOtp: process.env.NODE_ENV === 'development' ? userWithOtp?.otpCode : undefined,
      });
    }

    if (!user.emailVerified && userWithOtp?.otpCode) {
      const submittedOtp = req.body.otp ? String(req.body.otp).trim() : '';

      if (!submittedOtp) {
        return res.status(200).json({
          success: false,
          requireOtp: true,
          email: user.email,
          message: 'Your account has been approved by the administrator! Please enter the 6-digit verification OTP sent to your email to sign in.',
          devOtp: userWithOtp.otpCode,
        });
      }

      if (submittedOtp !== userWithOtp.otpCode || new Date() > new Date(userWithOtp.otpExpires)) {
        return res.status(400).json({
          success: false,
          requireOtp: true,
          message: 'Invalid or expired verification OTP. Please check your email or contact the administrator.',
        });
      }

      // OTP verified successfully
      user.emailVerified = true;
      user.otpCode = undefined;
      user.otpExpires = undefined;
    }

    // Generate token
    const token = await generateToken(user);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    await logSecurityEvent({
      req,
      action: 'LOGIN_SUCCESS',
      user: user._id,
      status: 'success',
      details: { role: user.role, email: user.email },
    });

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        studentId: user.studentId,
        lecturerId: user.lecturerId,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
        semester: user.semester,
        section: user.section,
        assignmentStatus: user.assignmentStatus,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S02, L01, R01, DH01, A01: Secure Logout
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logSecurityEvent({
        req,
        action: 'LOGOUT_SUCCESS',
        user: req.user._id,
        status: 'success',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('department', 'name code');
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        studentId: user.studentId,
        lecturerId: user.lecturerId,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
        semester: user.semester,
        section: user.section,
        assignmentStatus: user.assignmentStatus,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change user password
 * @route   POST /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password provided is incorrect.',
      });
    }

    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10));
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logSecurityEvent({
      req,
      action: 'PASSWORD_CHANGE_SUCCESS',
      user: user._id,
      status: 'success',
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    First-time student setup: verify OTP + temporary password and create permanent personal password
 * @route   POST /api/auth/first-time-setup
 * @access  Public
 */
const firstTimeSetup = async (req, res, next) => {
  try {
    const { email, tempPassword, otp, otpCode, newPassword } = req.body;
    const cleanOtp = (otp || otpCode || '').trim();

    if (!email || !cleanOtp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Academic email, 6-digit OTP verification code, and new permanent password are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Your new permanent password must be at least 8 characters in length.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail })
      .select('+passwordHash +otpCode +otpExpires +tempPassword')
      .populate('department', 'name code');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Verify OTP (the primary one-time security factor)
    if (!user.otpCode || user.otpCode !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification OTP code. Please enter the 6-digit code sent upon account approval.',
      });
    }

    if (user.otpExpires && new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({
        success: false,
        message: 'The verification OTP code has expired. Please contact administration.',
      });
    }

    // If temporary password is provided, verify it
    if (tempPassword) {
      const isMatch = (await user.matchPassword(tempPassword)) || (user.tempPassword && user.tempPassword === tempPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'The temporary default password entered is incorrect.',
        });
      }
    }

    // Set permanent password and activate
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10));
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    user.tempPassword = undefined;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.emailVerified = true;
    user.status = 'active';
    user.lastLogin = new Date();
    await user.save();

    const token = await generateToken(user);

    await logSecurityEvent({
      req,
      action: 'FIRST_TIME_PASSWORD_SETUP_SUCCESS',
      user: user._id,
      status: 'success',
      details: { email: user.email, role: user.role },
    });

    res.status(200).json({
      success: true,
      message: 'Account setup complete! Your personal password has been saved. Welcome to Dire Dawa University.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        studentId: user.studentId,
        lecturerId: user.lecturerId,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
        semester: user.semester,
        section: user.section,
        assignmentStatus: user.assignmentStatus,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lecturer: Verify OTP & Temporary Password during First-Time Account Activation
 * @route   POST /api/auth/lecturer-verify-otp
 * @access  Public
 */
const lecturerVerifyOTP = async (req, res, next) => {
  try {
    const { identifier, tempPassword, otp } = req.body;
    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Lecturer ID / Email address and 6-digit OTP code are required.',
      });
    }

    const cleanId = String(identifier).trim();
    const cleanOtp = String(otp).trim();

    const query = cleanId.includes('@')
      ? { email: cleanId.toLowerCase(), role: 'lecturer' }
      : {
          $or: [
            { email: cleanId.toLowerCase() },
            { lecturerId: cleanId.toUpperCase() },
          ],
          role: 'lecturer',
        };

    const user = await User.findOne(query)
      .select('+passwordHash +tempPassword +otpCode +otpExpires')
      .populate('department', 'name code faculty');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No lecturer account found matching the provided identifier.',
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your lecturer registration has not yet been approved by the University Administrator.',
      });
    }

    if (!user.mustChangePassword && user.emailVerified) {
      return res.status(400).json({
        success: false,
        alreadyActivated: true,
        message: 'This lecturer account has already been activated. Please sign in directly with your personal password.',
      });
    }

    // Verify OTP
    if (!user.otpCode || user.otpCode !== cleanOtp) {
      await logSecurityEvent({
        req,
        action: 'LECTURER_ACTIVATION_INVALID_OTP',
        user: user._id,
        status: 'failure',
        details: { email: user.email, lecturerId: user.lecturerId },
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid verification OTP code. Please check the code sent in your approval email.',
      });
    }

    // Check OTP expiry
    if (user.otpExpires && new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({
        success: false,
        message: 'The verification OTP code has expired. Please contact the administrator for a fresh invitation.',
      });
    }

    // Verify temporary password if provided
    if (tempPassword) {
      const isMatch = (await user.matchPassword(tempPassword)) || (user.tempPassword && user.tempPassword === tempPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'The temporary default password entered is incorrect.',
        });
      }
    }

    res.status(200).json({
      success: true,
      verified: true,
      message: 'Credentials verified successfully! Please proceed to create your personal password.',
      lecturer: {
        id: user._id,
        name: user.name,
        email: user.email,
        lecturerId: user.lecturerId,
        department: user.department?.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lecturer: Create Permanent Personal Password & Complete Account Activation
 * @route   POST /api/auth/lecturer-activate-account
 * @access  Public
 */
const lecturerActivateAccount = async (req, res, next) => {
  try {
    const { identifier, tempPassword, otp, newPassword, confirmPassword } = req.body;
    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Lecturer ID / Email, 6-digit OTP code, and new personal password are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Your personal password must be at least 8 characters in length.',
      });
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter and at least one number.',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.',
      });
    }

    const cleanId = String(identifier).trim();
    const cleanOtp = String(otp).trim();

    const query = cleanId.includes('@')
      ? { email: cleanId.toLowerCase(), role: 'lecturer' }
      : {
          $or: [
            { email: cleanId.toLowerCase() },
            { lecturerId: cleanId.toUpperCase() },
          ],
          role: 'lecturer',
        };

    const user = await User.findOne(query)
      .select('+passwordHash +tempPassword +otpCode +otpExpires')
      .populate('department', 'name code');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Lecturer account not found.' });
    }

    // Verify OTP again
    if (!user.otpCode || user.otpCode !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used verification OTP code.',
      });
    }

    if (user.otpExpires && new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({
        success: false,
        message: 'The verification OTP code has expired.',
      });
    }

    if (tempPassword) {
      const isMatch = (await user.matchPassword(tempPassword)) || (user.tempPassword && user.tempPassword === tempPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'The temporary default password entered is incorrect.',
        });
      }
    }

    // Securely hash and set new permanent password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10));
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    user.tempPassword = undefined;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.emailVerified = true;
    user.status = 'active';
    user.lastLogin = new Date();
    await user.save();

    // Mark LecturerRegistration activationStatus as activated
    await LecturerRegistration.findOneAndUpdate(
      { $or: [{ email: user.email }, { lecturerId: user.lecturerId }] },
      { activationStatus: 'activated', activatedAt: new Date() }
    );

    const token = await generateToken(user);

    await logSecurityEvent({
      req,
      action: 'LECTURER_ACCOUNT_ACTIVATION_SUCCESS',
      user: user._id,
      status: 'success',
      details: { email: user.email, lecturerId: user.lecturerId },
    });

    res.status(200).json({
      success: true,
      message: `Account activated successfully! Welcome to Dire Dawa University, ${user.name}.`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lecturerId: user.lecturerId,
        department: user.department,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
