const {
  User,
  SystemSetting,
  SecurityLog,
  Backup,
  Department,
  Course,
  LecturerAssignment,
  LecturerRegistration,
  Enrollment,
} = require('../models');
const bcrypt = require('bcryptjs');
const { runBackupJob, restoreBackup } = require('../services/backup.service');
const aiGateway = require('../services/aiGateway.service');
const { logSecurityEvent } = require('../middleware/securityLog.middleware');
const {
  sendApprovalOtpEmail,
  sendStudentApprovedWithCredentials,
  sendLecturerAssignmentNotification,
  sendLecturerInvitationEmail,
  testSmtpConnection,
} = require('../services/email.service');

/**
 * @desc    FR-A02: Get all users with search, role filters, and pagination
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.role) query.role = req.query.role;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
        { studentId: new RegExp(req.query.search, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('department', 'name code')
        .select('+tempPassword +otpCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-A02: Activate or deactivate a user account
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private (Admin)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // 'active' | 'inactive' | 'pending'

    if (!['active', 'inactive', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "active", "inactive", or "pending".' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Prevent deactivating own admin account
    if (user._id.toString() === req.user._id.toString() && status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Admin cannot deactivate their own active account.',
      });
    }

    let generatedOtp = null;
    let generatedTempPassword = null;
    if (status === 'active' && user.status === 'pending') {
      generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      generatedTempPassword = `Ddu@${Math.floor(1000 + Math.random() * 9000)}!`;

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(generatedTempPassword, salt);
      user.mustChangePassword = true;
      user.tempPassword = generatedTempPassword;
      user.otpCode = generatedOtp;
      user.otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      user.approvedBy = req.user._id;
      user.approvedAt = new Date();
      user.emailVerified = false; // Must verify OTP on first login
      try {
        await sendApprovalOtpEmail(user.email, user.name, generatedOtp, generatedTempPassword);
      } catch (e) {
        console.error('[Email dispatch error on status activation]:', e.message);
      }
    }

    user.status = status;
    await user.save();

    await logSecurityEvent({
      req,
      action: `USER_STATUS_${status.toUpperCase()}`,
      status: 'warning',
      details: { targetUserId: user._id, newStatus: status, otpSent: Boolean(generatedOtp), defaultPasswordGenerated: Boolean(generatedTempPassword) },
    });

    res.status(200).json({
      success: true,
      message: generatedOtp
        ? `User approved. Default temporary password and 6-digit verification OTP sent to ${user.email}.`
        : `User account is now ${status}.`,
      otpCode: generatedOtp,
      tempPassword: generatedTempPassword,
      defaultPassword: generatedTempPassword,
      data: { id: user._id, email: user.email, status: user.status },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve newly registered user and send OTP + default password to their email
 * @route   POST /api/admin/users/:id/approve
 * @access  Private (Admin)
 */
const approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tempPassword = `Ddu@${Math.floor(1000 + Math.random() * 9000)}!`;

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(tempPassword, salt);
    user.mustChangePassword = true;
    user.tempPassword = tempPassword;
    user.status = 'active';
    user.emailVerified = false;
    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    await user.save();

    let emailResult = null;
    try {
      emailResult = await sendApprovalOtpEmail(user.email, user.name, otpCode, tempPassword);
    } catch (e) {
      console.error('[Email dispatch error on user approval]:', e.message);
      emailResult = { success: false, error: e.message };
    }

    await logSecurityEvent({
      req,
      action: 'ADMIN_USER_APPROVED_OTP_SENT',
      status: 'success',
      details: {
        targetUserId: user._id,
        email: user.email,
        otpSent: true,
        defaultPasswordGenerated: true,
        emailDelivered: Boolean(emailResult?.isReal && emailResult?.success),
      },
    });

    res.status(200).json({
      success: true,
      message: `User ${user.email} approved! One-time OTP and default password have been dispatched.`,
      emailDelivered: Boolean(emailResult?.isReal && emailResult?.success),
      emailError: emailResult?.error,
      otpCode,
      tempPassword,
      defaultPassword: tempPassword,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        status: user.status,
        role: user.role,
        tempPassword,
        otpCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Generate and dispatch fresh default password and one-time OTP for any user
 * @route   POST /api/admin/users/:id/reset-credentials
 * @access  Private (Admin)
 */
const resetUserCredentials = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tempPassword = `Ddu@${Math.floor(1000 + Math.random() * 9000)}!`;

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(tempPassword, salt);
    user.mustChangePassword = true;
    user.tempPassword = tempPassword;
    user.status = 'active';
    user.emailVerified = false;
    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    await user.save();

    try {
      await sendApprovalOtpEmail(user.email, user.name, otpCode, tempPassword);
    } catch (e) {
      console.error('[Email dispatch error on credential reset]:', e.message);
    }

    await logSecurityEvent({
      req,
      action: 'ADMIN_USER_CREDENTIALS_RESET',
      status: 'warning',
      details: { targetUserId: user._id, email: user.email, otpSent: true, defaultPasswordGenerated: true },
    });

    res.status(200).json({
      success: true,
      message: `Fresh default password and one-time OTP dispatched to ${user.email}.`,
      otpCode,
      tempPassword,
      defaultPassword: tempPassword,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-A03: Assign role to user
 * @route   PATCH /api/admin/users/:id/role
 * @access  Private (Admin)
 */
const assignUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['student', 'lecturer', 'registrar', 'deptHead', 'admin'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`,
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await logSecurityEvent({
      req,
      action: 'ROLE_ASSIGNMENT_CHANGED',
      status: 'warning',
      details: { targetUserId: user._id, from: previousRole, to: role },
    });

    res.status(200).json({
      success: true,
      message: `User role updated to "${role}".`,
      data: { id: user._id, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-A02: Delete a user account
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Admin cannot delete own account.' });
    }

    await user.deleteOne();

    await logSecurityEvent({
      req,
      action: 'USER_DELETED_PERMANENTLY',
      status: 'warning',
      details: { deletedEmail: user.email, deletedId: user._id },
    });

    res.status(200).json({
      success: true,
      message: 'User account deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-A04: Get and update global system settings
 * @route   GET /api/admin/settings | PUT /api/admin/settings
 * @access  Private (Admin)
 */
const getSystemSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.getSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

const updateSystemSettings = async (req, res, next) => {
  try {
    const {
      sessionTimeout,
      passwordPolicy,
      registrationEnabled,
      materialApprovalRequired,
      maintenanceMode,
      scheduledDowntimeNotice,
      aiDailyQuotaPerUser,
      emailSettings,
    } = req.body;

    let settings = await SystemSetting.getSettings();

    if (sessionTimeout !== undefined) settings.sessionTimeout = sessionTimeout;
    if (passwordPolicy !== undefined) settings.passwordPolicy = passwordPolicy;
    if (registrationEnabled !== undefined) settings.registrationEnabled = registrationEnabled;
    if (materialApprovalRequired !== undefined)
      settings.materialApprovalRequired = materialApprovalRequired;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (scheduledDowntimeNotice !== undefined)
      settings.scheduledDowntimeNotice = scheduledDowntimeNotice;
    if (aiDailyQuotaPerUser !== undefined)
      settings.aiDailyQuotaPerUser = aiDailyQuotaPerUser;
    if (emailSettings !== undefined) {
      settings.emailSettings = {
        ...settings.emailSettings,
        ...emailSettings,
      };
    }

    await settings.save();

    await logSecurityEvent({
      req,
      action: 'SYSTEM_SETTINGS_UPDATED',
      details: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully.',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-A05: Trigger manual database backup
 * @route   POST /api/admin/backups/manual
 * @access  Private (Admin)
 */
const triggerManualBackup = async (req, res, next) => {
  try {
    const backupRecord = await runBackupJob('manual', req.user._id);
    res.status(201).json({
      success: true,
      message: 'Manual backup completed successfully.',
      data: backupRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-A05: Get list of all backups
 * @route   GET /api/admin/backups
 * @access  Private (Admin)
 */
const getBackups = async (req, res, next) => {
  try {
    const backups = await Backup.find({})
      .populate('initiatedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: backups.length,
      data: backups,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-A05: Restore database from backup
 * @route   POST /api/admin/backups/:id/restore
 * @access  Private (Admin)
 */
const restoreFromBackup = async (req, res, next) => {
  try {
    const result = await restoreBackup(req.params.id);

    await logSecurityEvent({
      req,
      action: 'DATABASE_RESTORE_EXECUTED',
      status: 'warning',
      details: { backupId: req.params.id },
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-A06: Monitor security logs
 * @route   GET /api/admin/logs
 * @access  Private (Admin)
 */
const getSecurityLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.action) query.action = req.query.action;

    let [logs, total] = await Promise.all([
      SecurityLog.find(query)
        .populate('user', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SecurityLog.countDocuments(query),
    ]);

    // If no security logs exist yet, seed a baseline audit record
    if (total === 0 && !req.query.status && !req.query.action) {
      try {
        const initialLog = await SecurityLog.create({
          user: req.user?._id || null,
          action: 'SECURITY_AUDIT_SYSTEM_ACTIVE',
          ip: req.ip || (req.headers && req.headers['x-forwarded-for']) || req.socket?.remoteAddress || '127.0.0.1',
          userAgent: (req.headers && req.headers['user-agent']) || 'Admin Dashboard',
          status: 'success',
          details: { message: 'Dire Dawa University security audit trail actively logging events.' },
          timestamp: new Date(),
        });
        const populatedInitial = await SecurityLog.findById(initialLog._id)
          .populate('user', 'name email role')
          .lean();
        logs = [populatedInitial || initialLog];
        total = 1;
      } catch (seedErr) {
        console.error('[SecurityLog Baseline Error]:', seedErr.message);
      }
    }

    res.status(200).json({
      success: true,
      count: logs.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-A06: AI Service Health Status
 * @route   GET /api/admin/ai-health
 * @access  Private (Admin)
 */
const getAIHealthStatus = async (req, res, next) => {
  try {
    const health = await aiGateway.checkHealth();
    res.status(200).json({ success: true, data: health });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Test SMTP email delivery configuration
 * @route   POST /api/admin/settings/test-email
 * @access  Private (Admin)
 */
const testEmailConfig = async (req, res, next) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = req.body;
    await testSmtpConnection({ smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass });
    res.status(200).json({
      success: true,
      message: 'SMTP connection established successfully! Real emails can now be dispatched.',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `SMTP Connection failed: ${error.message}`,
    });
  }
};

/**
 * @desc    Admin: Approve Student Assignment & Auto-Dispatch Credentials (FR-A02, FR-R01)
 * @route   POST /api/admin/student-assignments/:id/approve
 * @access  Private (Admin)
 */
const approveStudentAssignment = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id).populate('assignedDepartment', 'name code');
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (!student.assignedDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Student has not been assigned a department by the Registrar yet.',
      });
    }

    // 1. Generate 6-digit OTP code & 24h expiry
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 2. Generate secure temporary default password
    const tempPassword = `Ddu@${Math.floor(1000 + Math.random() * 9000)}!`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // 3. Update student state
    student.department = student.assignedDepartment._id;
    student.yearOfStudy = student.assignedYear || 1;
    student.semester = student.assignedSemester || 1;
    student.section = student.assignedSection || 'A';
    student.assignmentStatus = 'approved';
    student.assignmentApprovedBy = req.user._id;
    student.assignmentApprovedAt = new Date();

    student.passwordHash = passwordHash;
    student.mustChangePassword = true;
    student.tempPassword = tempPassword;
    student.otpCode = otpCode;
    student.otpExpires = otpExpires;
    student.status = 'active';
    student.emailVerified = false; // Must verify OTP on first login

    await student.save();

    // 4. Auto-enroll student into active department courses matching year and semester
    const courses = await Course.find({
      department: student.department,
      $or: [{ yearLevel: student.yearOfStudy }, { academicYear: student.yearOfStudy }],
      semester: student.semester,
      isActive: true,
    });

    for (const c of courses) {
      const existing = await Enrollment.findOne({
        student: student._id,
        course: c._id,
        semester: `Year ${student.yearOfStudy} Sem ${student.semester}`,
      });
      if (!existing) {
        await Enrollment.create({
          student: student._id,
          course: c._id,
          semester: `Year ${student.yearOfStudy} Sem ${student.semester}`,
          status: 'enrolled',
          enrolledBy: req.user._id,
        });
      }
    }

    // 5. Dispatch email notification with credentials and OTP
    const emailResult = await sendStudentApprovedWithCredentials(
      student.email,
      student.name,
      tempPassword,
      otpCode,
      {
        departmentName: student.assignedDepartment.name,
        academicYear: student.yearOfStudy,
        semester: student.semester,
        section: student.section,
      }
    );

    await logSecurityEvent({
      req,
      action: 'ADMIN_STUDENT_ASSIGNMENT_APPROVED',
      user: req.user._id,
      details: {
        studentId: student._id,
        email: student.email,
        department: student.assignedDepartment.code,
        year: student.yearOfStudy,
        semester: student.semester,
        section: student.section,
        emailDelivered: Boolean(emailResult?.isReal && emailResult?.success),
      },
    });

    res.status(200).json({
      success: true,
      message: `Student assignment approved! Temporary password and OTP verification code have been dispatched to ${student.email}.`,
      emailDelivered: Boolean(emailResult?.isReal && emailResult?.success),
      emailError: emailResult?.error,
      otpCode,
      tempPassword,
      defaultPassword: tempPassword,
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        department: student.assignedDepartment.name,
        year: student.yearOfStudy,
        semester: student.semester,
        section: student.section,
        tempPassword,
        otpCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Reject Student Assignment
 * @route   POST /api/admin/student-assignments/:id/reject
 * @access  Private (Admin)
 */
const rejectStudentAssignment = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    student.assignmentStatus = 'rejected';
    await student.save();

    res.status(200).json({
      success: true,
      message: `Student assignment for ${student.email} has been rejected.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Approve Lecturer Assignment & Notify (FR-A02, FR-R02)
 * @route   POST /api/admin/lecturer-assignments/:id/approve
 * @access  Private (Admin)
 */
const approveLecturerAssignment = async (req, res, next) => {
  try {
    const assignment = await LecturerAssignment.findById(req.params.id)
      .populate('lecturer', 'name email lecturerId')
      .populate('course', 'code name description')
      .populate('department', 'name code');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment record not found.' });
    }

    assignment.status = 'approved';
    assignment.approvedBy = req.user._id;
    assignment.approvedAt = new Date();
    await assignment.save();

    // Dispatch email notification to lecturer
    await sendLecturerAssignmentNotification(
      assignment.lecturer.email,
      assignment.lecturer.name,
      {
        lecturerId: assignment.lecturer.lecturerId,
        courseCode: assignment.course.code,
        courseName: assignment.course.name,
        departmentName: assignment.department.name,
        academicYear: assignment.academicYear,
        semester: assignment.semester,
        section: assignment.section,
      }
    );

    await logSecurityEvent({
      req,
      action: 'ADMIN_LECTURER_ASSIGNMENT_APPROVED',
      user: req.user._id,
      details: {
        assignmentId: assignment._id,
        lecturer: assignment.lecturer.email,
        course: assignment.course.code,
        section: assignment.section,
      },
    });

    res.status(200).json({
      success: true,
      message: `Lecturer assignment approved! Instructor ${assignment.lecturer.name} notified via email.`,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Reject Lecturer Assignment
 * @route   POST /api/admin/lecturer-assignments/:id/reject
 * @access  Private (Admin)
 */
const rejectLecturerAssignment = async (req, res, next) => {
  try {
    const assignment = await LecturerAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    assignment.status = 'rejected';
    assignment.rejectionReason = req.body.reason || 'Declined by Administrator.';
    await assignment.save();

    res.status(200).json({
      success: true,
      message: 'Lecturer assignment has been rejected.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Get all departments (FR-A04, FR-DH01)
 * @route   GET /api/admin/departments
 * @access  Private (Admin, Registrar)
 */
const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().sort({ name: 1 }).lean();
    res.status(200).json({ success: true, count: departments.length, data: departments });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Add new dynamic department (FR-A04)
 * @route   POST /api/admin/departments
 * @access  Private (Admin)
 */
const createDepartment = async (req, res, next) => {
  try {
    const { name, code, faculty, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Department name and code are required.' });
    }

    const existing = await Department.findOne({
      $or: [{ code: code.trim().toUpperCase() }, { name: name.trim() }],
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A department with this name or code already exists.' });
    }

    const dept = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      faculty: faculty?.trim() || 'Institute of Technology',
      description: description?.trim() || '',
      isActive: true,
    });

    res.status(201).json({ success: true, message: `Department ${dept.name} created successfully.`, data: dept });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Update department details or active status
 * @route   PUT /api/admin/departments/:id
 * @access  Private (Admin)
 */
const updateDepartment = async (req, res, next) => {
  try {
    const { name, code, faculty, description, isActive } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    if (name) dept.name = name.trim();
    if (code) dept.code = code.trim().toUpperCase();
    if (faculty) dept.faculty = faculty.trim();
    if (description !== undefined) dept.description = description.trim();
    if (isActive !== undefined) dept.isActive = isActive;

    await dept.save();
    res.status(200).json({ success: true, message: `Department ${dept.name} updated.`, data: dept });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Get all courses with department and lecturer details
 * @route   GET /api/admin/courses
 * @access  Private (Admin, Registrar)
 */
const getAllCourses = async (req, res, next) => {
  try {
    const { department, year, semester } = req.query;
    const query = {};

    if (department) query.department = department;
    if (year) query.yearLevel = Number(year);
    if (semester) query.semester = Number(semester);

    const courses = await Course.find(query)
      .populate('department', 'name code')
      .sort({ department: 1, yearLevel: 1, semester: 1, code: 1 })
      .lean();

    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Add a new course with default description
 * @route   POST /api/admin/courses
 * @access  Private (Admin)
 */
const createCourse = async (req, res, next) => {
  try {
    const { code, name, description, credits, department, yearLevel, semester } = req.body;

    if (!code || !name || !department) {
      return res.status(400).json({ success: false, message: 'Course code, name, and department are required.' });
    }

    const existing = await Course.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Course code ${code} is already registered.` });
    }

    const course = await Course.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || '',
      credits: Number(credits) || 3,
      department,
      yearLevel: Number(yearLevel) || 1,
      semester: Number(semester) || 1,
      isActive: true,
    });

    res.status(201).json({ success: true, message: `Course ${course.code} created successfully.`, data: course });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Update course details and default description
 * @route   PUT /api/admin/courses/:id
 * @access  Private (Admin)
 */
const updateCourse = async (req, res, next) => {
  try {
    const { name, description, credits, department, yearLevel, semester, isActive } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (name) course.name = name.trim();
    if (description !== undefined) course.description = description.trim();
    if (credits !== undefined) course.credits = Number(credits);
    if (department) course.department = department;
    if (yearLevel !== undefined) course.yearLevel = Number(yearLevel);
    if (semester !== undefined) course.semester = Number(semester);
    if (isActive !== undefined) course.isActive = isActive;

    await course.save();
    res.status(200).json({ success: true, message: `Course ${course.code} updated.`, data: course });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: List Lecturer Registration Requests with Search & Filters
 * @route   GET /api/admin/lecturer-registrations
 * @access  Private (Admin)
 */
const getAdminLecturerRegistrations = async (req, res, next) => {
  try {
    const { status, search, department } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (department && department !== 'all') {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { referenceId: new RegExp(search, 'i') },
        { lecturerId: new RegExp(search, 'i') },
        { fullName: new RegExp(search, 'i') },
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const requests = await LecturerRegistration.find(query)
      .populate('department', 'name code faculty')
      .populate('registeredBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('createdUser', 'name email status lecturerId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Approve Lecturer Registration, Create Account & Send Invitation Email
 * @route   POST /api/admin/lecturer-registrations/:id/approve
 * @access  Private (Admin)
 */
const approveLecturerRegistration = async (req, res, next) => {
  try {
    const registration = await LecturerRegistration.findById(req.params.id)
      .populate('department', 'name code faculty');

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Lecturer registration request not found.' });
    }

    if (registration.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This lecturer registration request has already been approved.',
      });
    }

    // 1. Generate 6-digit OTP code & 24h expiry
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 2. Generate secure temporary default password
    const tempPassword = `Ddu@Temp${Math.floor(1000 + Math.random() * 9000)}!`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // 3. Find existing or create new User
    let user = await User.findOne({
      $or: [{ email: registration.email }, { lecturerId: registration.lecturerId }],
    });

    if (!user) {
      user = new User({
        email: registration.email,
        name: registration.fullName,
        role: 'lecturer',
      });
    }

    user.name = registration.fullName;
    user.email = registration.email;
    user.role = 'lecturer';
    user.lecturerId = registration.lecturerId;
    user.department = registration.department._id;
    user.gender = registration.gender;
    user.phoneNumber = registration.phoneNumber;
    user.academicQualification = registration.academicQualification;
    user.registrationRef = registration.referenceId;
    user.passwordHash = passwordHash;
    user.mustChangePassword = true;
    user.tempPassword = tempPassword;
    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    user.status = 'active'; // Can authenticate with temporary credentials to access activation wizard
    user.emailVerified = false; // Remains false until OTP is verified
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();

    await user.save();

    // 4. Update LecturerRegistration record
    registration.status = 'approved';
    registration.reviewedBy = req.user._id;
    registration.reviewedAt = new Date();
    registration.createdUser = user._id;
    registration.invitationEmailSent = true;
    registration.invitationEmailSentAt = new Date();
    registration.rejectionReason = '';
    await registration.save();

    // 5. Dispatch email invitation
    let emailResult = null;
    try {
      emailResult = await sendLecturerInvitationEmail(
        registration.email,
        registration.fullName,
        tempPassword,
        otpCode,
        {
          lecturerId: registration.lecturerId,
          departmentName: registration.department?.name,
        }
      );
    } catch (e) {
      console.error('[Email dispatch error on lecturer approval]:', e.message);
      emailResult = { success: false, error: e.message };
    }

    // 6. Security Log
    await logSecurityEvent({
      req,
      action: 'ADMIN_LECTURER_REGISTRATION_APPROVED',
      user: req.user._id,
      details: {
        registrationId: registration._id,
        referenceId: registration.referenceId,
        lecturerId: registration.lecturerId,
        email: registration.email,
        department: registration.department?.code,
        emailDelivered: Boolean(emailResult?.isReal && emailResult?.success),
      },
    });

    res.status(200).json({
      success: true,
      message: `Lecturer registration for ${registration.fullName} (${registration.lecturerId}) approved! Official invitation email and OTP dispatched to ${registration.email}.`,
      emailDelivered: Boolean(emailResult?.isReal && emailResult?.success),
      emailError: emailResult?.error,
      otpCode,
      tempPassword,
      defaultPassword: tempPassword,
      data: {
        id: registration._id,
        referenceId: registration.referenceId,
        lecturerId: registration.lecturerId,
        name: registration.fullName,
        email: registration.email,
        department: registration.department?.name,
        status: registration.status,
        tempPassword,
        otpCode,
        user: {
          id: user._id,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Reject Lecturer Registration Request
 * @route   POST /api/admin/lecturer-registrations/:id/reject
 * @access  Private (Admin)
 */
const rejectLecturerRegistration = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a clear reason for rejecting this registration request.',
      });
    }

    const registration = await LecturerRegistration.findById(req.params.id)
      .populate('department', 'name code');

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration request not found.' });
    }

    if (registration.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This registration has already been approved and cannot be rejected.',
      });
    }

    registration.status = 'rejected';
    registration.rejectionReason = rejectionReason.trim();
    registration.reviewedBy = req.user._id;
    registration.reviewedAt = new Date();
    await registration.save();

    await logSecurityEvent({
      req,
      action: 'ADMIN_LECTURER_REGISTRATION_REJECTED',
      user: req.user._id,
      details: {
        registrationId: registration._id,
        referenceId: registration.referenceId,
        lecturerId: registration.lecturerId,
        email: registration.email,
        rejectionReason: registration.rejectionReason,
      },
    });

    res.status(200).json({
      success: true,
      message: `Registration request (${registration.referenceId}) for ${registration.fullName} has been rejected.`,
      data: registration,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Resend Lecturer Invitation Credentials & OTP
 * @route   POST /api/admin/lecturer-registrations/:id/resend-invite
 * @access  Private (Admin)
 */
const resendLecturerInvitation = async (req, res, next) => {
  try {
    const registration = await LecturerRegistration.findById(req.params.id)
      .populate('department', 'name code faculty');

    if (!registration || registration.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Lecturer registration must be approved before resending an invitation.',
      });
    }

    const user = await User.findOne({
      $or: [{ _id: registration.createdUser }, { email: registration.email }, { lecturerId: registration.lecturerId }],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated lecturer user account not found.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tempPassword = `Ddu@Temp${Math.floor(1000 + Math.random() * 9000)}!`;
    const salt = await bcrypt.genSalt(10);

    user.passwordHash = await bcrypt.hash(tempPassword, salt);
    user.mustChangePassword = true;
    user.tempPassword = tempPassword;
    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    user.status = 'active';
    user.emailVerified = false;
    await user.save();

    let emailResult = null;
    try {
      emailResult = await sendLecturerInvitationEmail(
        user.email,
        user.name,
        tempPassword,
        otpCode,
        {
          lecturerId: user.lecturerId,
          departmentName: registration.department?.name,
        }
      );
    } catch (e) {
      emailResult = { success: false, error: e.message };
    }

    res.status(200).json({
      success: true,
      message: `Fresh invitation credentials and OTP dispatched to ${user.email}.`,
      emailDelivered: Boolean(emailResult?.isReal && emailResult?.success),
      tempPassword,
      otpCode,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
