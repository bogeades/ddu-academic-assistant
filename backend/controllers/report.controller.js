const {
  User,
  Course,
  Enrollment,
  AcademicRecord,
  Department,
} = require('../models');
const {
  generateTranscriptPDF,
  generateCourseEnrollmentPDF,
} = require('../services/pdf.service');

/**
 * @desc    FR-R05: Generate official student transcript PDF
 * @route   GET /api/reports/transcript/:studentId
 * @access  Private (Registrar, DeptHead, Admin, Student self)
 */
const exportTranscriptPDF = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Student data isolation check
    if (req.user.role === 'student' && studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Students may only export their own official transcript.',
      });
    }

    const [student, academicRecord] = await Promise.all([
      User.findById(studentId).populate('department'),
      AcademicRecord.findOne({ student: studentId }),
    ]);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Transcript_${(student.studentId || student.name).replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
    );

    generateTranscriptPDF(student, academicRecord, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-R05: Generate course enrollment list PDF
 * @route   GET /api/reports/enrollment-list/:courseId
 * @access  Private (Registrar, Lecturer, DeptHead, Admin)
 */
const exportCourseEnrollmentListPDF = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const [course, enrollments] = await Promise.all([
      Course.findById(courseId).populate('department'),
      Enrollment.find({ course: courseId, status: 'enrolled' })
        .populate('student', 'name email studentId')
        .sort({ 'student.name': 1 }),
    ]);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Enrollment_List_${course.code}.pdf"`
    );

    generateCourseEnrollmentPDF(course, enrollments, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-R06, FR-R02: View complete list of registered students with search & filters
 * @route   GET /api/reports/students
 * @access  Private (Registrar, DeptHead, Admin, Lecturer)
 */
const getStudentsDirectory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const query = { role: 'student' };

    if (req.query.department) {
      query.department = req.query.department;
    }

    if (req.query.yearOfStudy) {
      query.yearOfStudy = Number(req.query.yearOfStudy);
    }

    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
        { studentId: new RegExp(req.query.search, 'i') },
      ];
    }

    const [students, total] = await Promise.all([
      User.find(query)
        .populate('department', 'name code')
        .select('-passwordHash')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: students.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportTranscriptPDF,
  exportCourseEnrollmentListPDF,
  getStudentsDirectory,
};
