const { Course, Enrollment, AcademicRecord, User } = require('../models');
const { logSecurityEvent } = require('../middleware/securityLog.middleware');

/**
 * Helper to validate course prerequisites against student's completed academic records
 */
const validatePrerequisites = async (studentId, course) => {
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return { valid: true, missing: [] };
  }

  // Look up student's academic record
  const record = await AcademicRecord.findOne({ student: studentId }).lean();
  const completedCourseCodes = new Set();

  if (record && record.semesters) {
    record.semesters.forEach((sem) => {
      sem.courses.forEach((c) => {
        // If passing grade (not 'F')
        if (c.grade && c.grade.toUpperCase() !== 'F') {
          completedCourseCodes.add(c.courseCode.toUpperCase());
        }
      });
    });
  }

  // Also check completed enrollments
  const completedEnrollments = await Enrollment.find({
    student: studentId,
    status: 'completed',
  }).populate('course', 'code');

  completedEnrollments.forEach((e) => {
    if (e.course) completedCourseCodes.add(e.course.code.toUpperCase());
  });

  const missing = [];
  for (const prereq of course.prerequisites) {
    if (!completedCourseCodes.has(prereq.toUpperCase())) {
      missing.push(prereq);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
};

/**
 * @desc    FR-S08, FR-R03: Enroll student in a course (with prerequisite & atomic capacity check)
 * @route   POST /api/enrollments
 * @access  Private (Student self-enroll, Registrar, Admin)
 */
const enrollCourse = async (req, res, next) => {
  try {
    const { courseId, semester, academicYear, studentId } = req.body;

    // Target student: either self or specified by Registrar
    const targetStudentId = req.user.role === 'student' ? req.user._id : (studentId || req.user._id);

    if (!courseId || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and semester are required for enrollment.',
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // 1. Check duplicate enrollment for same semester
    const existingEnrollment = await Enrollment.findOne({
      student: targetStudentId,
      course: course._id,
      semester,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: `Student is already enrolled in ${course.code} for ${semester}.`,
      });
    }

    // 2. Validate prerequisites (FR-R03)
    const prereqCheck = await validatePrerequisites(targetStudentId, course);
    if (!prereqCheck.valid) {
      return res.status(400).json({
        success: false,
        message: `Prerequisite validation failed: Student has not completed required course(s): ${prereqCheck.missing.join(
          ', '
        )}.`,
        missingPrerequisites: prereqCheck.missing,
      });
    }

    // 3. Atomic capacity check and update (FR-R03, Section 5)
    // Ensures concurrent enrollments do not exceed capacity
    const updatedCourse = await Course.findOneAndUpdate(
      {
        _id: course._id,
        $expr: { $lt: ['$enrolledCount', '$capacity'] },
      },
      {
        $inc: { enrolledCount: 1 },
      },
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(400).json({
        success: false,
        message: `Enrollment closed: Course ${course.code} has reached its maximum capacity of ${course.capacity} students.`,
      });
    }

    // 4. Create enrollment record
    const enrollment = await Enrollment.create({
      student: targetStudentId,
      course: course._id,
      semester,
      academicYear: academicYear || '2026/2027',
      status: 'enrolled',
      enrolledBy: req.user._id,
    });

    await logSecurityEvent({
      req,
      action: 'COURSE_ENROLLMENT_CREATED',
      user: req.user._id,
      details: {
        studentId: targetStudentId,
        courseId: course._id,
        courseCode: course.code,
        semester,
        enrolledByRole: req.user.role,
      },
    });

    res.status(201).json({
      success: true,
      message: `Successfully enrolled in ${course.code} - ${course.name}.`,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S08: Get enrollments for authenticated student or query by studentId (Registrar)
 * @route   GET /api/enrollments
 * @access  Private
 */
const getEnrollments = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === 'student') {
      query.student = req.user._id;
    } else if (req.query.studentId) {
      query.student = req.query.studentId;
    } else if (req.query.courseId) {
      query.course = req.query.courseId;
    }

    if (req.query.semester) {
      query.semester = req.query.semester;
    }

    const enrollments = await Enrollment.find(query)
      .populate('course')
      .populate('student', 'name email studentId yearOfStudy')
      .sort({ createdAt: -1 })
      .lean();

    const safeData = enrollments.map((e) => {
      if (req.user.role === 'student' && e.gradingStatus !== 'published') {
        const copy = { ...e };
        delete copy.grade;
        delete copy.numericScore;
        delete copy.totalMark;
        delete copy.letterGrade;
        delete copy.gradePoint;
        delete copy.classworkScore;
        delete copy.quizScore;
        delete copy.midtermScore;
        delete copy.finalExamScore;
        copy.gradingStatus = 'pending_evaluation';
        return copy;
      }
      return e;
    });

    res.status(200).json({
      success: true,
      count: safeData.length,
      data: safeData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Drop / withdraw course enrollment (atomic decrement of capacity)
 * @route   DELETE /api/enrollments/:id
 * @access  Private (Student, Registrar, Admin)
 */
const dropCourse = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
    }

    // Check ownership if student
    if (enrollment.student.toString() !== req.user._id.toString() && !['admin', 'registrar'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to drop this enrollment.' });
    }

    // Atomic decrement of course enrolledCount
    await Course.findByIdAndUpdate(enrollment.course, {
      $inc: { enrolledCount: -1 },
    });

    await enrollment.deleteOne();

    await logSecurityEvent({
      req,
      action: 'COURSE_ENROLLMENT_DROPPED',
      user: req.user._id,
      details: {
        studentId: enrollment.student,
        courseId: enrollment.course,
        semester: enrollment.semester,
        droppedByRole: req.user.role,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Course enrollment successfully dropped.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enrollCourse,
  getEnrollments,
  dropCourse,
};
