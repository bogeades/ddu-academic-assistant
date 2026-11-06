const { AcademicRecord, User, Course } = require('../models');
const { logSecurityEvent } = require('../middleware/securityLog.middleware');

// Grade Point Mapping according to Dire Dawa University Academic Senate Policy
const GRADE_POINTS = {
  'A+': 4.0,
  A: 4.0,
  'A-': 3.75,
  'B+': 3.5,
  B: 3.0,
  'B-': 2.75,
  'C+': 2.5,
  C: 2.0,
  'C-': 1.75,
  D: 1.0,
  F: 0.0,
};

/**
 * @desc    FR-S08, FR-R04: Get student academic record and CGPA
 * @route   GET /api/records/:studentId?
 * @access  Private (Student self or Staff)
 */
const getAcademicRecord = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.user._id;

    // Student data isolation check
    if (req.user.role === 'student' && studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: You can only view your own academic records.',
      });
    }

    let record = await AcademicRecord.findOne({ student: studentId })
      .populate('student', 'name email studentId department yearOfStudy')
      .populate('updatedBy', 'name role');

    if (!record) {
      // Create empty academic record if none exists yet
      record = await AcademicRecord.create({
        student: studentId,
        semesters: [],
        cgpa: 0.0,
        totalCredits: 0,
      });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-R04: Add or update student semester results with validation
 * @route   POST /api/records/:studentId/semester
 * @access  Private (Registrar, Admin)
 */
const updateSemesterRecord = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { semesterName, academicYear, courses } = req.body;

    if (!semesterName || !courses || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Semester name and courses list with grades are required.',
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student account not found.' });
    }

    // Validate grades & assign grade points
    const formattedCourses = courses.map((c) => {
      const upperGrade = (c.grade || 'F').toUpperCase().trim();
      const points = GRADE_POINTS[upperGrade] !== undefined ? GRADE_POINTS[upperGrade] : 0.0;
      return {
        courseCode: c.courseCode.toUpperCase().trim(),
        courseName: c.courseName.trim(),
        credits: Number(c.credits || 3),
        grade: upperGrade,
        gradePoint: points,
      };
    });

    let record = await AcademicRecord.findOne({ student: studentId });
    if (!record) {
      record = new AcademicRecord({
        student: studentId,
        semesters: [],
      });
    }

    // Check if semester already exists in record
    const existingIndex = record.semesters.findIndex(
      (s) => s.name.toLowerCase() === semesterName.toLowerCase().trim()
    );

    if (existingIndex >= 0) {
      record.semesters[existingIndex].courses = formattedCourses;
      record.semesters[existingIndex].academicYear = academicYear || record.semesters[existingIndex].academicYear;
    } else {
      record.semesters.push({
        name: semesterName.trim(),
        academicYear: academicYear || '2025/2026',
        courses: formattedCourses,
        gpa: 0,
        creditsEarned: 0,
      });
    }

    record.updatedBy = req.user._id;

    // Recalculate Term GPA and Cumulative CGPA
    record.calculateCGPA();
    await record.save();

    await logSecurityEvent({
      req,
      action: 'REGISTRAR_UPDATE_ACADEMIC_RECORD',
      user: req.user._id,
      details: {
        studentId: student._id,
        email: student.email,
        studentIdCode: student.studentId,
        semesterName,
        coursesCount: formattedCourses.length,
        newCGPA: record.cgpa,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Student academic record updated and CGPA recalculated successfully.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAcademicRecord,
  updateSemesterRecord,
};
