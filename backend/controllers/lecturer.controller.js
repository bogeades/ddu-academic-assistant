const {
  Quiz,
  QuizResult,
  Assignment,
  Submission,
  Course,
  Enrollment,
  User,
  AcademicRecord,
  SystemSetting,
  LecturerAssignment,
} = require('../models');
const { logSecurityEvent } = require('../middleware/securityLog.middleware');

/**
 * Helper to calculate letter grade and grade point from total mark according to official university scale
 */
const calculateGrade = (totalMark, scale) => {
  const num = Math.max(0, Math.min(100, Number(totalMark) || 0));
  // Sort scale descending by minScore
  const sortedScale = [...scale].sort((a, b) => b.minScore - a.minScore);
  for (const tier of sortedScale) {
    if (num >= tier.minScore) {
      return {
        letterGrade: tier.grade,
        gradePoint: tier.gradePoint,
      };
    }
  }
  return { letterGrade: 'F', gradePoint: 0.0 };
};

/**
 * @desc    FR-L01, FR-L06: Get all courses officially assigned to authenticated lecturer and approved by university
 * @route   GET /api/lecturer/assigned-courses
 * @access  Private (Lecturer, Admin)
 */
const getAssignedCourses = async (req, res, next) => {
  try {
    const lecturerId = req.user.role === 'admin' && req.query.lecturerId ? req.query.lecturerId : req.user._id;

    // Strict Assignment Rule: Must be approved by university/admin (Requirement 3)
    const assignments = await LecturerAssignment.find({
      lecturer: lecturerId,
      status: 'approved',
    })
      .populate('course')
      .populate('department', 'name code faculty')
      .lean();

    // Enrich each assignment with live enrolled student counts
    const coursesWithCounts = await Promise.all(
      assignments.map(async (a) => {
        if (!a.course) return null;

        const enrollmentQuery = {
          course: a.course._id,
          status: { $in: ['enrolled', 'completed'] },
        };

        const totalEnrolled = await Enrollment.countDocuments(enrollmentQuery);

        return {
          assignmentId: a._id,
          course: {
            id: a.course._id,
            code: a.course.code,
            name: a.course.name,
            credits: a.course.credits,
            capacity: a.course.capacity,
          },
          department: a.department || { name: 'Computer Science', code: 'COSC' },
          academicYear: a.academicYear,
          semester: a.semester,
          section: a.section,
          courseDescription: a.courseDescription || a.course.description || '',
          enrolledStudentsCount: totalEnrolled,
        };
      })
    );

    const validCourses = coursesWithCounts.filter(Boolean);

    res.status(200).json({
      success: true,
      count: validCourses.length,
      data: validCourses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L04: Get list of students officially enrolled in course assigned to authenticated lecturer
 * @route   GET /api/lecturer/assigned-students
 * @access  Private (Lecturer, Admin)
 */
const getAssignedStudents = async (req, res, next) => {
  try {
    const { courseId, section, academicYear, semester, search } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID parameter is required.',
      });
    }

    // Strict Rule: Lecturer can see ONLY students in courses officially assigned to them and approved (Requirement 3)
    let assignment = null;
    if (req.user.role !== 'admin') {
      assignment = await LecturerAssignment.findOne({
        lecturer: req.user._id,
        course: courseId,
        status: 'approved',
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message:
            'Security Violation: You are not authorized to view students for this course. Access is strictly restricted to your approved course assignments.',
        });
      }
    } else {
      assignment = await LecturerAssignment.findOne({ course: courseId, status: 'approved' });
    }

    const course = await Course.findById(courseId).populate('department', 'name code').lean();
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found in university catalog.' });
    }

    // Find all officially enrolled students
    const enrollmentQuery = {
      course: courseId,
      status: { $in: ['enrolled', 'completed'] },
    };

    const enrollments = await Enrollment.find(enrollmentQuery)
      .populate('student', 'name email studentId department yearOfStudy semester section assignedYear assignedSemester assignedSection')
      .populate('gradedBy', 'name role')
      .populate('publishedBy', 'name role')
      .lean();

    // Fetch university official grading policy configuration
    const settings = await SystemSetting.getSettings();
    const gradingPolicy = settings.gradingPolicy || {
      weights: { classwork: 10, quiz: 10, midterm: 30, finalExam: 50 },
      scale: [
        { grade: 'A+', minScore: 90, gradePoint: 4.0 },
        { grade: 'A', minScore: 85, gradePoint: 4.0 },
        { grade: 'A-', minScore: 80, gradePoint: 3.75 },
        { grade: 'B+', minScore: 75, gradePoint: 3.5 },
        { grade: 'B', minScore: 70, gradePoint: 3.0 },
        { grade: 'B-', minScore: 65, gradePoint: 2.75 },
        { grade: 'C+', minScore: 60, gradePoint: 2.5 },
        { grade: 'C', minScore: 50, gradePoint: 2.0 },
        { grade: 'C-', minScore: 45, gradePoint: 1.75 },
        { grade: 'D', minScore: 40, gradePoint: 1.0 },
        { grade: 'F', minScore: 0, gradePoint: 0.0 },
      ],
      passThreshold: 40,
    };

    // Filter by section, academicYear, semester, and search
    let studentList = enrollments
      .filter((e) => e.student) // must have active student document
      .map((e) => {
        const st = e.student;
        const currentYear = st.assignedYear || st.yearOfStudy || course.yearLevel || course.academicYear || 1;
        const currentSem = st.assignedSemester || st.semester || course.semester || 1;
        const currentSec = st.assignedSection || st.section || 'A';

        return {
          enrollmentId: e._id,
          student: {
            id: st._id,
            name: st.name,
            email: st.email,
            studentId: st.studentId || 'N/A',
            department: course.department?.name || 'Computer Science',
            year: currentYear,
            semester: currentSem,
            section: currentSec,
          },
          enrollmentStatus: e.status,
          semester: e.semester,
          academicYear: e.academicYear,
          grades: {
            classworkScore: e.classworkScore || 0,
            quizScore: e.quizScore || 0,
            midtermScore: e.midtermScore || 0,
            finalExamScore: e.finalExamScore || 0,
            totalMark: e.totalMark || 0,
            letterGrade: e.letterGrade || e.grade || 'F',
            gradePoint: e.gradePoint !== undefined ? e.gradePoint : 0.0,
            gradingStatus: e.gradingStatus || 'draft',
            gradedAt: e.gradedAt,
            gradedBy: e.gradedBy ? e.gradedBy.name : null,
            publishedAt: e.publishedAt,
            publishedBy: e.publishedBy ? e.publishedBy.name : null,
          },
        };
      });

    // Apply assignment section scoping if not 'ALL'
    if (assignment && assignment.section && assignment.section !== 'ALL') {
      studentList = studentList.filter((s) => s.student.section === assignment.section);
    }

    // Apply explicit query filters
    if (section && section !== 'ALL') {
      studentList = studentList.filter((s) => s.student.section === section);
    }
    if (academicYear && academicYear !== 'ALL') {
      studentList = studentList.filter((s) => Number(s.student.year) === Number(academicYear));
    }
    if (semester && semester !== 'ALL') {
      studentList = studentList.filter((s) => Number(s.student.semester) === Number(semester));
    }

    // Apply search filter (name or student ID)
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      studentList = studentList.filter(
        (s) =>
          s.student.name.toLowerCase().includes(q) ||
          s.student.studentId.toLowerCase().includes(q) ||
          s.student.email.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      course: {
        id: course._id,
        code: course.code,
        name: course.name,
        credits: course.credits,
        department: course.department,
      },
      assignment: {
        id: assignment?._id,
        section: assignment?.section || 'ALL',
        academicYear: assignment?.academicYear,
        semester: assignment?.semester,
      },
      gradingPolicy,
      totalEnrolledInCourse: enrollments.length,
      filteredCount: studentList.length,
      data: studentList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L04: Get detailed academic information for a student enrolled in lecturer's approved course
 * @route   GET /api/lecturer/student-academic-info/:studentId
 * @access  Private (Lecturer, Admin)
 */
const getStudentAcademicInfo = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Strict Rule: Lecturer can only view academic information for students enrolled in their approved courses (Req 3)
    if (req.user.role !== 'admin') {
      const approvedAssignments = await LecturerAssignment.find({
        lecturer: req.user._id,
        status: 'approved',
      }).distinct('course');

      const isEnrolledInLecturerCourse = await Enrollment.findOne({
        student: studentId,
        course: { $in: approvedAssignments },
        status: { $in: ['enrolled', 'completed'] },
      });

      if (!isEnrolledInLecturerCourse) {
        return res.status(403).json({
          success: false,
          message:
            'Security Violation: You are only authorized to view academic information for students enrolled in your approved courses.',
        });
      }
    }

    const [student, record, enrollments] = await Promise.all([
      User.findById(studentId).populate('department', 'name code').lean(),
      AcademicRecord.findOne({ student: studentId }).lean(),
      Enrollment.find({ student: studentId, status: { $in: ['enrolled', 'completed'] } })
        .populate('course', 'name code credits')
        .lean(),
    ]);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          studentId: student.studentId || 'N/A',
          department: student.department?.name || 'Computer Science',
          yearOfStudy: student.assignedYear || student.yearOfStudy || 1,
          semester: student.assignedSemester || student.semester || 1,
          section: student.assignedSection || student.section || 'A',
        },
        academicRecord: record
          ? {
              cgpa: record.cgpa,
              totalCredits: record.totalCredits,
              academicStanding: record.academicStanding,
              semesters: record.semesters,
            }
          : null,
        enrolledCourses: enrollments.map((e) => ({
          code: e.course?.code,
          name: e.course?.name,
          credits: e.course?.credits,
          semester: e.semester,
          status: e.status,
          totalMark: e.gradingStatus === 'published' ? e.totalMark : undefined,
          grade: e.gradingStatus === 'published' ? e.letterGrade : 'Pending Publication',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L04: Save assessment marks and calculate grades (draft or publish workflow)
 * @route   POST /api/lecturer/grades
 * @access  Private (Lecturer, Admin)
 */
const saveGrades = async (req, res, next) => {
  try {
    const { courseId, grades, gradingStatus = 'draft' } = req.body;

    if (!courseId || !grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and a list of student marks are required.',
      });
    }

    if (!['draft', 'published'].includes(gradingStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Grading status must be either "draft" or "published".',
      });
    }

    // Strict Authorization: Lecturer must have an approved assignment for this course
    if (req.user.role !== 'admin') {
      const assignment = await LecturerAssignment.findOne({
        lecturer: req.user._id,
        course: courseId,
        status: 'approved',
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'Security Violation: You are not authorized to enter or modify grades for this course.',
        });
      }
    }

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Fetch official university grading policy
    const settings = await SystemSetting.getSettings();
    const policy = settings.gradingPolicy || {
      weights: { classwork: 10, quiz: 10, midterm: 30, finalExam: 50 },
      scale: [
        { grade: 'A+', minScore: 90, gradePoint: 4.0 },
        { grade: 'A', minScore: 85, gradePoint: 4.0 },
        { grade: 'A-', minScore: 80, gradePoint: 3.75 },
        { grade: 'B+', minScore: 75, gradePoint: 3.5 },
        { grade: 'B', minScore: 70, gradePoint: 3.0 },
        { grade: 'B-', minScore: 65, gradePoint: 2.75 },
        { grade: 'C+', minScore: 60, gradePoint: 2.5 },
        { grade: 'C', minScore: 50, gradePoint: 2.0 },
        { grade: 'C-', minScore: 45, gradePoint: 1.75 },
        { grade: 'D', minScore: 40, gradePoint: 1.0 },
        { grade: 'F', minScore: 0, gradePoint: 0.0 },
      ],
      passThreshold: 40,
    };

    const maxClasswork = policy.weights?.classwork || 10;
    const maxQuiz = policy.weights?.quiz || 10;
    const maxMidterm = policy.weights?.midterm || 30;
    const maxFinal = policy.weights?.finalExam || 50;

    // Validate and process each student's marks
    const updatedEnrollments = [];

    for (const item of grades) {
      const { enrollmentId, classworkScore = 0, quizScore = 0, midtermScore = 0, finalExamScore = 0 } = item;

      // Validate scores against configured maximum marks
      const cScore = Number(classworkScore) || 0;
      const qScore = Number(quizScore) || 0;
      const mScore = Number(midtermScore) || 0;
      const fScore = Number(finalExamScore) || 0;

      if (cScore < 0 || cScore > maxClasswork) {
        return res.status(400).json({
          success: false,
          message: `Classwork mark must be between 0 and configured maximum ${maxClasswork}.`,
        });
      }
      if (qScore < 0 || qScore > maxQuiz) {
        return res.status(400).json({
          success: false,
          message: `Quiz mark must be between 0 and configured maximum ${maxQuiz}.`,
        });
      }
      if (mScore < 0 || mScore > maxMidterm) {
        return res.status(400).json({
          success: false,
          message: `Midterm exam mark must be between 0 and configured maximum ${maxMidterm}.`,
        });
      }
      if (fScore < 0 || fScore > maxFinal) {
        return res.status(400).json({
          success: false,
          message: `Final exam mark must be between 0 and configured maximum ${maxFinal}.`,
        });
      }

      const totalMark = parseFloat((cScore + qScore + mScore + fScore).toFixed(1));
      const { letterGrade, gradePoint } = calculateGrade(totalMark, policy.scale);

      const enrollment = await Enrollment.findById(enrollmentId);
      if (!enrollment || enrollment.course.toString() !== courseId.toString()) {
        continue;
      }

      // Record audit history
      enrollment.gradeAuditTrail.push({
        modifiedBy: req.user._id,
        modifiedAt: new Date(),
        previousTotal: enrollment.totalMark || 0,
        newTotal: totalMark,
        previousGrade: enrollment.letterGrade || 'F',
        newGrade: letterGrade,
        action: gradingStatus === 'published' ? 'published' : 'draft_saved',
      });

      enrollment.classworkScore = cScore;
      enrollment.quizScore = qScore;
      enrollment.midtermScore = mScore;
      enrollment.finalExamScore = fScore;
      enrollment.totalMark = totalMark;
      enrollment.letterGrade = letterGrade;
      enrollment.gradePoint = gradePoint;
      enrollment.numericScore = totalMark;
      enrollment.grade = letterGrade;
      enrollment.gradingStatus = gradingStatus;
      enrollment.gradedBy = req.user._id;
      enrollment.gradedAt = new Date();

      if (gradingStatus === 'published') {
        enrollment.publishedBy = req.user._id;
        enrollment.publishedAt = new Date();
        enrollment.status = letterGrade === 'F' ? 'enrolled' : 'completed';

        // Synchronize published grade into student's AcademicRecord
        let record = await AcademicRecord.findOne({ student: enrollment.student });
        if (!record) {
          record = new AcademicRecord({
            student: enrollment.student,
            semesters: [],
          });
        }

        const semName = enrollment.semester || `Year ${course.yearLevel || 1} Semester ${course.semester || 1}`;
        const existingSemIndex = record.semesters.findIndex(
          (s) => s.name.toLowerCase() === semName.toLowerCase().trim()
        );

        const courseGradeObj = {
          course: course._id,
          courseCode: course.code,
          courseName: course.name,
          credits: course.credits || 3,
          grade: letterGrade,
          gradePoint: gradePoint,
        };

        if (existingSemIndex >= 0) {
          const semCourses = record.semesters[existingSemIndex].courses;
          const courseIdx = semCourses.findIndex(
            (c) => c.courseCode.toUpperCase() === course.code.toUpperCase()
          );
          if (courseIdx >= 0) {
            semCourses[courseIdx] = courseGradeObj;
          } else {
            semCourses.push(courseGradeObj);
          }
        } else {
          record.semesters.push({
            name: semName,
            academicYear: enrollment.academicYear || '2026/2027',
            courses: [courseGradeObj],
            gpa: 0,
            creditsEarned: 0,
          });
        }

        record.updatedBy = req.user._id;
        record.calculateCGPA();
        await record.save();
      }

      await enrollment.save();
      updatedEnrollments.push(enrollment);
    }

    await logSecurityEvent({
      req,
      action: gradingStatus === 'published' ? 'LECTURER_PUBLISH_GRADES' : 'LECTURER_SAVE_DRAFT_GRADES',
      user: req.user._id,
      details: {
        courseId,
        courseCode: course.code,
        gradingStatus,
        gradesCount: updatedEnrollments.length,
      },
    });

    res.status(200).json({
      success: true,
      message:
        gradingStatus === 'published'
          ? `Successfully published grades for ${updatedEnrollments.length} students. Results are now visible to students and synced to academic transcripts.`
          : `Draft grades saved successfully for ${updatedEnrollments.length} students. Marks are held in draft and not yet visible to students.`,
      data: updatedEnrollments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L06: Monitor student progress (quiz scores, assignment completion, class averages, at-risk alerts)
 * @route   GET /api/lecturer/progress?courseCode=
 * @access  Private (Lecturer, Admin)
 */
const getLecturerProgress = async (req, res, next) => {
  try {
    const courseCodeParam = req.query.courseCode ? req.query.courseCode.toUpperCase().trim() : null;

    let targetCourseCodes = [];
    if (courseCodeParam) {
      targetCourseCodes = [courseCodeParam];
    } else {
      const [lecturerAssignments, lecturerQuizzes] = await Promise.all([
        Assignment.find({ createdBy: req.user._id }).distinct('courseCode'),
        Quiz.find({ createdBy: req.user._id }).distinct('courseCode'),
      ]);
      const combinedCodes = new Set([...lecturerAssignments, ...lecturerQuizzes].filter(Boolean));
      targetCourseCodes = Array.from(combinedCodes);
      if (targetCourseCodes.length === 0) {
        targetCourseCodes = ['COSC1011', 'COSC2041'];
      }
    }

    const quizQuery = { published: true };
    const assignmentQuery = { published: true };

    if (courseCodeParam) {
      quizQuery.courseCode = courseCodeParam;
      assignmentQuery.courseCode = courseCodeParam;
    } else {
      quizQuery.$or = [{ courseCode: { $in: targetCourseCodes } }, { createdBy: req.user._id }];
      assignmentQuery.$or = [{ courseCode: { $in: targetCourseCodes } }, { createdBy: req.user._id }];
    }

    const [publishedQuizzes, publishedAssignments] = await Promise.all([
      Quiz.find(quizQuery).lean(),
      Assignment.find(assignmentQuery).lean(),
    ]);

    const totalQuizzes = publishedQuizzes.length;
    const totalAssignments = publishedAssignments.length;
    const quizIds = publishedQuizzes.map((q) => q._id);
    const assignmentIds = publishedAssignments.map((a) => a._id);

    const [allQuizResults, allSubmissions] = await Promise.all([
      QuizResult.find({ quiz: { $in: quizIds } })
        .populate('student', 'name email studentId department')
        .lean(),
      Submission.find({ assignment: { $in: assignmentIds } })
        .populate('student', 'name email studentId department')
        .populate('assignment', 'title maxScore courseCode')
        .lean(),
    ]);

    const studentMap = new Map();

    allQuizResults.forEach((r) => {
      if (r.student && r.student._id) {
        studentMap.set(r.student._id.toString(), r.student);
      }
    });

    allSubmissions.forEach((s) => {
      if (s.student && s.student._id) {
        studentMap.set(s.student._id.toString(), s.student);
      }
    });

    if (studentMap.size === 0) {
      const activeStudents = await User.find({ role: 'student', status: 'active' })
        .select('name email studentId department')
        .limit(25)
        .lean();
      activeStudents.forEach((st) => studentMap.set(st._id.toString(), st));
    }

    const studentList = [];
    let totalQuizScoreSum = 0;
    let totalQuizCount = 0;
    let totalAssignmentScoreSum = 0;
    let totalAssignmentCount = 0;

    const distribution = {
      under50: 0,
      between50and69: 0,
      between70and84: 0,
      above85: 0,
    };

    for (const [studentId, studentInfo] of studentMap.entries()) {
      const studentQuizzes = allQuizResults.filter(
        (r) => r.student && r.student._id.toString() === studentId
      );
      const studentSubmissions = allSubmissions.filter(
        (s) => s.student && s.student._id.toString() === studentId
      );

      const quizzesTaken = studentQuizzes.length;
      let quizAvgPercent = 0;
      if (quizzesTaken > 0) {
        const sumQuizPercent = studentQuizzes.reduce((acc, curr) => {
          const totalQ = curr.totalQuestions || 10;
          return acc + (curr.score / totalQ) * 100;
        }, 0);
        quizAvgPercent = Math.round(sumQuizPercent / quizzesTaken);
        totalQuizScoreSum += quizAvgPercent;
        totalQuizCount++;
      }

      const assignmentsSubmitted = studentSubmissions.length;
      let assignmentAvgPercent = 0;
      if (assignmentsSubmitted > 0) {
        const sumAssignPercent = studentSubmissions.reduce((acc, curr) => {
          const max = curr.assignment?.maxScore || 100;
          const grade = curr.grade !== undefined ? curr.grade : 0;
          return acc + (grade / max) * 100;
        }, 0);
        assignmentAvgPercent = Math.round(sumAssignPercent / assignmentsSubmitted);
        totalAssignmentScoreSum += assignmentAvgPercent;
        totalAssignmentCount++;
      }

      const totalItems = totalQuizzes + totalAssignments;
      const completedItems = quizzesTaken + assignmentsSubmitted;
      const completionPercentage =
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      let overallAverage = 0;
      if (quizzesTaken > 0 && assignmentsSubmitted > 0) {
        overallAverage = Math.round((quizAvgPercent + assignmentAvgPercent) / 2);
      } else if (quizzesTaken > 0) {
        overallAverage = quizAvgPercent;
      } else if (assignmentsSubmitted > 0) {
        overallAverage = assignmentAvgPercent;
      }

      if (overallAverage < 50) distribution.under50++;
      else if (overallAverage < 70) distribution.between50and69++;
      else if (overallAverage < 85) distribution.between70and84++;
      else distribution.above85++;

      const isAtRisk = overallAverage < 50 || completionPercentage < 50;

      studentList.push({
        student: studentInfo,
        quizzesTaken,
        totalQuizzes,
        quizAverage: quizAvgPercent,
        assignmentsSubmitted,
        totalAssignments,
        assignmentAverage: assignmentAvgPercent,
        completionPercentage,
        overallAverage,
        isAtRisk,
      });
    }

    studentList.sort((a, b) => (b.isAtRisk ? 1 : 0) - (a.isAtRisk ? 1 : 0) || a.overallAverage - b.overallAverage);

    const classAverageQuiz = totalQuizCount > 0 ? Math.round(totalQuizScoreSum / totalQuizCount) : 0;
    const classAverageAssignment = totalAssignmentCount > 0 ? Math.round(totalAssignmentScoreSum / totalAssignmentCount) : 0;
    const classOverallAverage =
      studentList.length > 0
        ? Math.round(studentList.reduce((acc, s) => acc + s.overallAverage, 0) / studentList.length)
        : 0;

    const atRiskStudents = studentList.filter((s) => s.isAtRisk);
    const completionRate =
      studentList.length > 0
        ? Math.round(studentList.reduce((acc, s) => acc + s.completionPercentage, 0) / studentList.length)
        : 0;

    const payload = {
      courseCode: courseCodeParam || targetCourseCodes.join(', '),
      totalQuizzes,
      totalAssignments,
      totalPublishedQuizzes: totalQuizzes,
      totalPublishedAssignments: totalAssignments,
      totalStudents: studentList.length,
      classQuizAverage: classAverageQuiz,
      classAssignmentAverage: classAverageAssignment,
      classCompletionRate: completionRate,
      atRiskCount: atRiskStudents.length,
      classAverages: {
        quizScore: classAverageQuiz,
        assignmentScore: classAverageAssignment,
        overallScore: classOverallAverage,
        atRiskCount: atRiskStudents.length,
        completionRate,
      },
      distribution,
      scoreDistribution: distribution,
      atRiskStudents,
      students: studentList,
    };

    res.status(200).json({
      success: true,
      data: payload,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedCourses,
  getAssignedStudents,
  getStudentAcademicInfo,
  saveGrades,
  getLecturerProgress,
};
