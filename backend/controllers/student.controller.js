const {
  User,
  AcademicRecord,
  Enrollment,
  Course,
  CourseMaterial,
  Task,
  QuizResult,
  Submission,
  Assignment,
  Quiz,
} = require('../models');
const LecturerAssignment = require('../models/LecturerAssignment');
const aiGateway = require('../services/aiGateway.service');

/**
 * Helper to fetch assigned courses with lecturer description & materials count
 */
const getAssignedCoursesForStudent = async (student) => {
  const deptId = student.department?._id || student.department;
  const year = student.yearOfStudy || 1;
  const sem = student.semester || 1;
  const section = student.section || 'A';

  const courseQuery = {
    $or: [{ academicYear: year }, { yearLevel: year }],
    semester: sem,
    isActive: true,
  };
  if (deptId) {
    courseQuery.department = deptId;
  }

  const courses = await Course.find(courseQuery).populate('department', 'name code').lean();

  const enrichedCourses = await Promise.all(
    courses.map(async (course) => {
      // Find lecturer assignment for this course & section
      const assignment = await LecturerAssignment.findOne({
        course: course._id,
        status: 'approved',
        section: { $in: [section, 'ALL'] },
      })
        .populate('lecturer', 'name email lecturerId')
        .lean();

      // Find materials for this course & section
      const materialsCount = await CourseMaterial.countDocuments({
        course: course._id,
        approvalStatus: 'approved',
        $or: [
          { section: section },
          { section: 'ALL' },
          { section: { $exists: false } },
          { section: null },
        ],
      });

      return {
        _id: course._id,
        id: course._id,
        name: course.name,
        code: course.code,
        credits: course.credits || 3,
        academicYear: course.academicYear,
        semester: course.semester,
        department: course.department,
        // Lecturer-customized description takes precedence, fallback to default course description
        description:
          assignment?.courseDescription?.trim() ||
          course.description ||
          'Standard curriculum module for undergraduate studies.',
        isLecturerDescription: !!assignment?.courseDescription?.trim(),
        assignedLecturer: assignment?.lecturer
          ? {
              id: assignment.lecturer._id,
              name: assignment.lecturer.name,
              email: assignment.lecturer.email,
              lecturerId: assignment.lecturer.lecturerId || 'N/A',
            }
          : null,
        materialsCount,
      };
    })
  );

  return enrichedCourses;
};

/**
 * @desc    FR-S08: Student personal performance dashboard
 * @route   GET /api/students/dashboard
 * @access  Private (Student)
 */
const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const [
      student,
      academicRecord,
      enrollments,
      tasks,
      quizResults,
      submissions,
    ] = await Promise.all([
      User.findById(studentId).populate('department', 'name code').lean(),
      AcademicRecord.findOne({ student: studentId }).lean(),
      Enrollment.find({ student: studentId, status: 'enrolled' })
        .populate('course', 'name code credits')
        .lean(),
      Task.find({ user: studentId }).lean(),
      QuizResult.find({ student: studentId }).populate('quiz', 'title').lean(),
      Submission.find({ student: studentId }).populate('assignment', 'title maxScore').lean(),
    ]);

    // Calculate metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;

    const totalQuizzes = quizResults.length;
    const avgQuizPercentage =
      totalQuizzes > 0
        ? parseFloat((quizResults.reduce((acc, q) => acc + q.percentage, 0) / totalQuizzes).toFixed(1))
        : 0;

    const gradedSubmissions = submissions.filter((s) => s.status === 'graded');
    const avgAssignmentScore =
      gradedSubmissions.length > 0
        ? parseFloat(
            (
              gradedSubmissions.reduce(
                (acc, s) => acc + (s.grade / (s.assignment.maxScore || 100)) * 100,
                0
              ) / gradedSubmissions.length
            ).toFixed(1)
          )
        : 0;

    // Get assigned courses strictly based on student's department, year, semester, section
    const assignedCourses = await getAssignedCoursesForStudent(student || req.user);

    // AI Study Recommendations (FR-S08)
    const enrolledCourses = assignedCourses.length > 0 ? assignedCourses : enrollments.map((e) => e.course).filter(Boolean);
    const aiRecommendations = await aiGateway.getStudyRecommendations(
      req.user,
      enrolledCourses
    );

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          studentId: req.user.studentId,
          department: student?.department || req.user.department,
          yearOfStudy: student?.yearOfStudy || req.user.yearOfStudy || 1,
          semester: student?.semester || 1,
          section: student?.section || 'A',
          assignmentStatus: student?.assignmentStatus || 'none',
        },
        academics: {
          cgpa: academicRecord ? academicRecord.cgpa : 3.5,
          academicStanding: academicRecord ? academicRecord.academicStanding : 'Good Standing',
          totalCredits: academicRecord ? academicRecord.totalCredits : 42,
          currentSemesters: academicRecord ? academicRecord.semesters : [],
        },
        enrolledCourses,
        assignedCourses,
        tasksSummary: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
        },
        performance: {
          quizzesTaken: totalQuizzes,
          avgQuizScore: avgQuizPercentage,
          assignmentsSubmitted: submissions.length,
          avgAssignmentScore,
        },
        recentQuizResults: quizResults.slice(0, 5),
        aiRecommendations,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get courses assigned to student's department, year, semester, section
 * @route   GET /api/students/courses
 * @access  Private (Student)
 */
const getStudentCourses = async (req, res, next) => {
  try {
    const student = await User.findById(req.user._id).populate('department', 'name code').lean();
    const assignedCourses = await getAssignedCoursesForStudent(student || req.user);
    res.status(200).json({
      success: true,
      count: assignedCourses.length,
      data: assignedCourses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L06: Lecturer monitor student progress in their courses
 * @route   GET /api/students/progress/:studentId
 * @access  Private (Lecturer, DeptHead, Registrar, Admin)
 */
const getStudentProgressForInstructor = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.studentId).populate('department', 'name code');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const [enrollments, quizResults, submissions, academicRecord] = await Promise.all([
      Enrollment.find({ student: student._id }).populate('course', 'name code').lean(),
      QuizResult.find({ student: student._id }).populate('quiz', 'title').lean(),
      Submission.find({ student: student._id }).populate('assignment', 'title maxScore').lean(),
      AcademicRecord.findOne({ student: student._id }).lean(),
    ]);

    res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        department: student.department,
        yearOfStudy: student.yearOfStudy,
        semester: student.semester,
        section: student.section,
      },
      cgpa: academicRecord ? academicRecord.cgpa : 'N/A',
      enrollments,
      quizResults,
      submissions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentDashboard,
  getStudentCourses,
  getStudentProgressForInstructor,
};
