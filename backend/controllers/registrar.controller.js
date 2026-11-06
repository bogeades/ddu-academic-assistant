const bcrypt = require('bcryptjs');
const { User, Department, Course, LecturerAssignment, LecturerRegistration } = require('../models');
const { logSecurityEvent } = require('../middleware/securityLog.middleware');

/**
 * @desc    Registrar: Search students and check database presence (FR-R01)
 * @route   GET /api/registrar/students
 * @access  Private (Registrar, Admin)
 */
const getStudentsDirectory = async (req, res, next) => {
  try {
    const { search, department, year, section, status } = req.query;
    const query = { role: 'student' };

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { studentId: new RegExp(search, 'i') },
      ];
    }

    if (department) query.department = department;
    if (year) query.yearOfStudy = Number(year);
    if (section) query.section = section.toUpperCase();
    if (status) query.assignmentStatus = status;

    const students = await User.find(query)
      .populate('department', 'name code faculty')
      .populate('assignedDepartment', 'name code faculty')
      .populate('assignedBy', 'name email')
      .populate('assignmentApprovedBy', 'name email')
      .select('+tempPassword +otpCode')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar: Assign student to Department, Year, Semester, and Section (FR-R01)
 * @route   POST /api/registrar/assign-student
 * @access  Private (Registrar, Admin)
 */
const assignStudent = async (req, res, next) => {
  try {
    const { studentId, departmentId, academicYear, semester, section } = req.body;

    if (!studentId || !departmentId || !academicYear || !semester || !section) {
      return res.status(400).json({
        success: false,
        message: 'Student, Department, Academic Year, Semester, and Section are all required.',
      });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.',
      });
    }

    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    const cleanSection = String(section).trim().toUpperCase();
    const cleanYear = Number(academicYear);
    const cleanSem = Number(semester);

    student.assignedDepartment = dept._id;
    student.assignedYear = cleanYear;
    student.assignedSemester = cleanSem;
    student.assignedSection = cleanSection;
    student.assignmentStatus = 'pending_approval';
    student.assignedBy = req.user._id;
    student.assignedAt = new Date();
    await student.save();

    await logSecurityEvent({
      req,
      action: 'REGISTRAR_STUDENT_ASSIGNMENT_SUBMITTED',
      user: req.user._id,
      details: {
        studentId: student._id,
        email: student.email,
        department: dept.code,
        year: cleanYear,
        semester: cleanSem,
        section: cleanSection,
      },
    });

    res.status(200).json({
      success: true,
      message: `Assignment for student ${student.name} (${cleanSection}, Year ${cleanYear}, Sem ${cleanSem}) submitted for Admin approval.`,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar: List all lecturers with Lecturer ID (FR-R02)
 * @route   GET /api/registrar/lecturers
 * @access  Private (Registrar, Admin)
 */
const getLecturersDirectory = async (req, res, next) => {
  try {
    const lecturers = await User.find({ role: 'lecturer' })
      .populate('department', 'name code')
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: lecturers.length,
      data: lecturers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar: Assign Lecturer to Course, Department, Year, Semester, and Section (FR-R02)
 * @route   POST /api/registrar/assign-lecturer
 * @access  Private (Registrar, Admin)
 */
const assignLecturer = async (req, res, next) => {
  try {
    const { lecturerId, courseId, departmentId, academicYear, semester, section, courseDescription } = req.body;

    if (!lecturerId || !courseId || !departmentId || !academicYear || !semester || !section) {
      return res.status(400).json({
        success: false,
        message: 'Lecturer, Course, Department, Academic Year, Semester, and Section are required.',
      });
    }

    const lecturer = await User.findById(lecturerId);
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).json({
        success: false,
        message: 'Lecturer account not found.',
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    const cleanSection = String(section).trim().toUpperCase();
    const cleanYear = Number(academicYear);
    const cleanSem = Number(semester);

    // Create or update assignment
    let assignment = await LecturerAssignment.findOne({
      course: course._id,
      academicYear: cleanYear,
      semester: cleanSem,
      section: cleanSection,
    });

    if (assignment) {
      assignment.lecturer = lecturer._id;
      assignment.department = dept._id;
      assignment.courseDescription = courseDescription || assignment.courseDescription || '';
      assignment.status = 'pending_approval';
      assignment.assignedBy = req.user._id;
      await assignment.save();
    } else {
      assignment = await LecturerAssignment.create({
        lecturer: lecturer._id,
        course: course._id,
        department: dept._id,
        academicYear: cleanYear,
        semester: cleanSem,
        section: cleanSection,
        courseDescription: courseDescription || '',
        status: 'pending_approval',
        assignedBy: req.user._id,
      });
    }

    await logSecurityEvent({
      req,
      action: 'REGISTRAR_LECTURER_ASSIGNMENT_SUBMITTED',
      user: req.user._id,
      details: {
        lecturer: lecturer.email,
        course: course.code,
        section: cleanSection,
      },
    });

    res.status(201).json({
      success: true,
      message: `Assignment for ${lecturer.name} teaching ${course.code} (${cleanSection}) submitted to Admin for approval.`,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar: Get all Lecturer Assignments with filter (FR-R02)
 * @route   GET /api/registrar/lecturer-assignments
 * @access  Private (Registrar, Admin)
 */
const getLecturerAssignments = async (req, res, next) => {
  try {
    const { department, status, course } = req.query;
    const query = {};

    if (department) query.department = department;
    if (status) query.status = status;
    if (course) query.course = course;

    const assignments = await LecturerAssignment.find(query)
      .populate('lecturer', 'name email lecturerId')
      .populate('course', 'code name credits description')
      .populate('department', 'name code faculty')
      .populate('assignedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar: Get all active departments for dropdowns (FR-R01)
 * @route   GET /api/registrar/departments
 * @access  Private (Registrar, Admin)
 */
const getDepartmentsForRegistrar = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 }).lean();
    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar: Get all active courses with department details (FR-R02)
 * @route   GET /api/registrar/courses
 * @access  Private (Registrar, Admin)
 */
const getCoursesForRegistrar = async (req, res, next) => {
  try {
    const { department, year, semester } = req.query;
    const query = { isActive: true };
    if (department) query.department = department;
    if (year) query.yearLevel = Number(year);
    if (semester) query.semester = Number(semester);

    const courses = await Course.find(query)
      .populate('department', 'name code')
      .sort({ department: 1, yearLevel: 1, semester: 1, code: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar: Directly register a new student and submit placement for approval (FR-R01)
 * @route   POST /api/registrar/register-student
 * @access  Private (Registrar, Admin)
 */
const registerStudentByRegistrar = async (req, res, next) => {
  try {
    const { name, email, studentId, departmentId, academicYear, semester, section } = req.body;

    if (!name || !email || !studentId || !departmentId || !academicYear || !semester || !section) {
      return res.status(400).json({
        success: false,
        message: 'Name, Institutional Email, Student ID, Department, Academic Year, Semester, and Section are all required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanStudentId = studentId.trim().toUpperCase();

    // Check duplicate email
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `An account with email ${cleanEmail} already exists (${existingEmail.role}: ${existingEmail.name}).`,
      });
    }

    // Check duplicate studentId
    const existingId = await User.findOne({ studentId: cleanStudentId });
    if (existingId) {
      return res.status(400).json({
        success: false,
        message: `A student with Student ID ${cleanStudentId} already exists (${existingId.name}).`,
      });
    }

    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Selected Department not found.',
      });
    }

    const cleanSection = String(section).trim().toUpperCase();
    const cleanYear = Number(academicYear);
    const cleanSem = Number(semester);

    // Placeholder password hash (Admin approval will generate final secure temporary password + OTP)
    const salt = await bcrypt.genSalt(10);
    const tempInitialHash = await bcrypt.hash(`Ddu@${Math.floor(1000 + Math.random() * 9000)}!`, salt);

    const student = await User.create({
      name: name.trim(),
      email: cleanEmail,
      studentId: cleanStudentId,
      role: 'student',
      status: 'pending', // Awaiting Admin approval
      department: dept._id,
      yearOfStudy: cleanYear,
      semester: cleanSem,
      section: cleanSection,
      assignedDepartment: dept._id,
      assignedYear: cleanYear,
      assignedSemester: cleanSem,
      assignedSection: cleanSection,
      assignmentStatus: 'pending_approval',
      assignedBy: req.user._id,
      assignedAt: new Date(),
      passwordHash: tempInitialHash,
      mustChangePassword: true,
      emailVerified: false,
    });

    await logSecurityEvent({
      req,
      action: 'REGISTRAR_REGISTER_STUDENT',
      user: req.user._id,
      details: {
        studentId: student._id,
        email: cleanEmail,
        studentIdCode: cleanStudentId,
        department: dept.code,
        year: cleanYear,
        semester: cleanSem,
        section: cleanSection,
      },
    });

    res.status(201).json({
      success: true,
      message: `Student ${student.name} (${student.studentId}) successfully registered and submitted for Admin approval!`,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar: Register a new Lecturer (Submitted for Admin Approval)
 * @route   POST /api/registrar/register-lecturer
 * @access  Private (Registrar, Admin)
 */
const registerLecturerByRegistrar = async (req, res, next) => {
  try {
    const {
      lecturerId,
      firstName,
      middleName,
      lastName,
      gender,
      email,
      phoneNumber,
      departmentId,
      academicQualification,
      specialization,
      notes,
    } = req.body;

    // Validate required fields
    if (!lecturerId || !firstName || !lastName || !email || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Lecturer ID, First Name, Last Name, Email Address, and Department are required fields.',
      });
    }

    const cleanLecturerId = String(lecturerId).trim().toUpperCase();
    const cleanEmail = String(email).trim().toLowerCase();

    // Email format validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid institutional email address.',
      });
    }

    // Check duplicate Lecturer ID across existing users and pending registrations
    const existingUserWithId = await User.findOne({ lecturerId: cleanLecturerId });
    if (existingUserWithId) {
      return res.status(400).json({
        success: false,
        message: `A lecturer account with ID "${cleanLecturerId}" already exists in the system (${existingUserWithId.name}).`,
      });
    }

    const existingPendingLecId = await LecturerRegistration.findOne({
      lecturerId: cleanLecturerId,
      status: { $in: ['pending', 'approved'] },
    });
    if (existingPendingLecId) {
      return res.status(400).json({
        success: false,
        message: `A registration request for Lecturer ID "${cleanLecturerId}" is already ${existingPendingLecId.status === 'pending' ? 'pending administrator approval' : 'approved'}.`,
      });
    }

    // Check duplicate email
    const existingUserWithEmail = await User.findOne({ email: cleanEmail });
    if (existingUserWithEmail) {
      return res.status(400).json({
        success: false,
        message: `An account with email "${cleanEmail}" already exists in the university database.`,
      });
    }

    const existingPendingEmail = await LecturerRegistration.findOne({
      email: cleanEmail,
      status: { $in: ['pending', 'approved'] },
    });
    if (existingPendingEmail) {
      return res.status(400).json({
        success: false,
        message: `A registration request for email "${cleanEmail}" is already ${existingPendingEmail.status === 'pending' ? 'pending administrator approval' : 'approved'}.`,
      });
    }

    // Verify Department exists
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'The selected Department was not found.',
      });
    }

    // Generate unique reference ID (e.g. REG-LEC-261105-8942)
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const referenceId = `REG-LEC-${datePart}-${randPart}`;

    const parts = [firstName.trim(), (middleName || '').trim(), lastName.trim()].filter(Boolean);
    const fullName = parts.join(' ');

    const registration = await LecturerRegistration.create({
      referenceId,
      lecturerId: cleanLecturerId,
      firstName: firstName.trim(),
      middleName: (middleName || '').trim(),
      lastName: lastName.trim(),
      fullName,
      gender: gender || 'Male',
      email: cleanEmail,
      phoneNumber: (phoneNumber || '').trim(),
      department: dept._id,
      academicQualification: academicQualification || 'Lecturer',
      specialization: (specialization || '').trim(),
      notes: (notes || '').trim(),
      status: 'pending',
      registeredBy: req.user._id,
      registeredAt: new Date(),
    });

    await logSecurityEvent({
      req,
      action: 'REGISTRAR_REGISTER_LECTURER_REQUEST',
      user: req.user._id,
      details: {
        registrationId: registration._id,
        referenceId,
        lecturerId: cleanLecturerId,
        email: cleanEmail,
        department: dept.code,
      },
    });

    const populated = await LecturerRegistration.findById(registration._id)
      .populate('department', 'name code faculty')
      .populate('registeredBy', 'name email');

    res.status(201).json({
      success: true,
      message: `Lecturer registration request for ${fullName} (${cleanLecturerId}) submitted successfully! Reference ID: ${referenceId}. Awaiting Admin approval.`,
      referenceId,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registrar / Admin: List Lecturer Registration Requests
 * @route   GET /api/registrar/lecturer-registrations
 * @access  Private (Registrar, Admin)
 */
const getLecturerRegistrations = async (req, res, next) => {
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
 * @desc    Registrar: Resubmit / Correct a Rejected Lecturer Registration
 * @route   PUT /api/registrar/lecturer-registrations/:id/resubmit
 * @access  Private (Registrar, Admin)
 */
const resubmitLecturerRegistration = async (req, res, next) => {
  try {
    const registration = await LecturerRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration request not found.' });
    }

    if (registration.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This registration request has already been approved and cannot be resubmitted.',
      });
    }

    const {
      lecturerId,
      firstName,
      middleName,
      lastName,
      gender,
      email,
      phoneNumber,
      departmentId,
      academicQualification,
      specialization,
      notes,
    } = req.body;

    if (lecturerId) {
      const cleanLecId = String(lecturerId).trim().toUpperCase();
      // Check duplicate
      const duplicateId = await LecturerRegistration.findOne({
        _id: { $ne: registration._id },
        lecturerId: cleanLecId,
        status: { $in: ['pending', 'approved'] },
      });
      if (duplicateId) {
        return res.status(400).json({
          success: false,
          message: `Lecturer ID "${cleanLecId}" is already registered.`,
        });
      }
      registration.lecturerId = cleanLecId;
    }

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      const duplicateEmail = await LecturerRegistration.findOne({
        _id: { $ne: registration._id },
        email: cleanEmail,
        status: { $in: ['pending', 'approved'] },
      });
      if (duplicateEmail) {
        return res.status(400).json({
          success: false,
          message: `Email "${cleanEmail}" is already registered.`,
        });
      }
      registration.email = cleanEmail;
    }

    if (firstName) registration.firstName = firstName.trim();
    if (middleName !== undefined) registration.middleName = (middleName || '').trim();
    if (lastName) registration.lastName = lastName.trim();
    if (gender) registration.gender = gender;
    if (phoneNumber !== undefined) registration.phoneNumber = (phoneNumber || '').trim();
    if (departmentId) registration.department = departmentId;
    if (academicQualification) registration.academicQualification = academicQualification;
    if (specialization !== undefined) registration.specialization = (specialization || '').trim();
    if (notes !== undefined) registration.notes = (notes || '').trim();

    // Reset status to pending
    registration.status = 'pending';
    registration.rejectionReason = '';
    registration.registeredBy = req.user._id;
    registration.registeredAt = new Date();
    await registration.save();

    await logSecurityEvent({
      req,
      action: 'REGISTRAR_RESUBMIT_LECTURER_REQUEST',
      user: req.user._id,
      details: {
        registrationId: registration._id,
        referenceId: registration.referenceId,
        lecturerId: registration.lecturerId,
      },
    });

    const populated = await LecturerRegistration.findById(registration._id)
      .populate('department', 'name code faculty')
      .populate('registeredBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Registration request (${registration.referenceId}) resubmitted successfully for Admin approval!`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentsDirectory,
  assignStudent,
  getLecturersDirectory,
  assignLecturer,
  getLecturerAssignments,
  getDepartmentsForRegistrar,
  getCoursesForRegistrar,
  registerStudentByRegistrar,
  registerLecturerByRegistrar,
  getLecturerRegistrations,
  resubmitLecturerRegistration,
};
