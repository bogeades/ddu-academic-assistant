const {
  Lesson,
  LearningProgress,
  Course,
  CourseMaterial,
  Enrollment,
  LecturerAssignment,
  User,
} = require('../models');

/**
 * Helper to verify student enrollment or academic cohort eligibility for a course
 */
const verifyStudentCourseAccess = async (studentId, courseId) => {
  const student = await User.findById(studentId);
  if (!student) return false;

  // Check official Enrollment
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });
  if (enrollment) return true;

  // Cohort matching for course
  const course = await Course.findById(courseId);
  if (!course) return false;

  if (course.department && student.department && course.department.toString() === student.department.toString()) {
    if (course.yearLevel === student.yearOfStudy && course.semester === student.semester) {
      return true;
    }
  }

  return false;
};

/**
 * Helper to verify lecturer course assignment
 */
const verifyLecturerCourseAccess = async (lecturerId, courseId, role) => {
  if (role === 'admin') return true;
  const assignment = await LecturerAssignment.findOne({
    lecturer: lecturerId,
    course: courseId,
    status: 'approved',
  });
  return !!assignment;
};

/**
 * @desc    Get course curriculum (chapters, ordered lessons, attached PDFs, student progress)
 * @route   GET /api/learning/courses/:courseId/curriculum
 * @access  Private (Enrolled students, assigned lecturers, admin)
 */
const getCourseCurriculum = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate('department', 'name code');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Access control check
    if (req.user.role === 'student') {
      const isAllowed = await verifyStudentCourseAccess(req.user._id, courseId);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You are not authorized to view the curriculum for this course.',
        });
      }
    } else if (req.user.role === 'lecturer') {
      const isAllowed = await verifyLecturerCourseAccess(req.user._id, courseId, req.user.role);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You are not assigned to this course.',
        });
      }
    }

    // Query lessons
    const lessonQuery = { course: courseId };
    if (req.user.role === 'student') {
      lessonQuery.isPublished = true;
    }

    const lessons = await Lesson.find(lessonQuery)
      .populate('attachedMaterial', 'title fileName materialType fileUrl')
      .sort({ chapterOrder: 1, order: 1 })
      .lean();

    // Group into chapters
    const chaptersMap = {};
    lessons.forEach((l) => {
      const chapterKey = l.chapterTitle || 'Chapter 1: Foundations';
      if (!chaptersMap[chapterKey]) {
        chaptersMap[chapterKey] = {
          title: chapterKey,
          order: l.chapterOrder || 1,
          lessons: [],
        };
      }
      chaptersMap[chapterKey].lessons.push(l);
    });

    const chapters = Object.values(chaptersMap).sort((a, b) => a.order - b.order);

    // Also fetch any standalone PDFs or materials uploaded for this course
    const materials = await CourseMaterial.find({
      course: courseId,
      approvalStatus: 'approved',
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch student's learning progress
    let progress = null;
    if (req.user.role === 'student') {
      progress = await LearningProgress.findOne({
        student: req.user._id,
        course: courseId,
      }).lean();
    }

    res.status(200).json({
      success: true,
      course,
      chapters,
      materials,
      progress,
      totalLessons: lessons.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single lesson by ID with Next/Previous navigation pointers
 * @route   GET /api/learning/lessons/:id
 * @access  Private (Authorized student, lecturer, admin)
 */
const getLessonById = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('course', 'name code credits department yearLevel semester')
      .populate('attachedMaterial', 'title fileName materialType fileUrl size')
      .populate('author', 'name email lecturerId');

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    // Access control check
    if (req.user.role === 'student') {
      if (!lesson.isPublished) {
        return res.status(403).json({
          success: false,
          message: 'This lesson is currently a draft and unpublished.',
        });
      }
      const isAllowed = await verifyStudentCourseAccess(req.user._id, lesson.course._id);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You are not authorized to view content in this course.',
        });
      }
    }

    // Compute Next and Previous lesson pointers within this course
    const navQuery = { course: lesson.course._id };
    if (req.user.role === 'student') {
      navQuery.isPublished = true;
    }

    const allCourseLessons = await Lesson.find(navQuery)
      .sort({ chapterOrder: 1, order: 1 })
      .select('_id title chapterTitle chapterOrder order')
      .lean();

    const currentIndex = allCourseLessons.findIndex(
      (l) => l._id.toString() === lesson._id.toString()
    );

    const previousLesson = currentIndex > 0 ? allCourseLessons[currentIndex - 1] : null;
    const nextLesson =
      currentIndex >= 0 && currentIndex < allCourseLessons.length - 1
        ? allCourseLessons[currentIndex + 1]
        : null;

    const position = {
      current: currentIndex + 1,
      total: allCourseLessons.length,
    };

    // Update student's reading progress
    let progress = null;
    if (req.user.role === 'student') {
      progress = await LearningProgress.findOneAndUpdate(
        { student: req.user._id, course: lesson.course._id },
        {
          $set: {
            currentLesson: lesson._id,
            lastAccessedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    }

    res.status(200).json({
      success: true,
      data: lesson,
      previousLesson,
      nextLesson,
      position,
      progress,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save/update reading progress (current lesson, last PDF page, completion)
 * @route   POST /api/learning/progress
 * @access  Private (Student)
 */
const updateProgress = async (req, res, next) => {
  try {
    const { courseId, lessonId, lastPdfMaterialId, lastPdfPage, markCompleted } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required.' });
    }

    // Verify course access
    const isAllowed = await verifyStudentCourseAccess(req.user._id, courseId);
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You cannot record progress for an unassigned course.',
      });
    }

    const updateDoc = {
      lastAccessedAt: new Date(),
    };

    if (lessonId) updateDoc.currentLesson = lessonId;
    if (lastPdfMaterialId) updateDoc.lastPdfMaterial = lastPdfMaterialId;
    if (lastPdfPage && Number(lastPdfPage) > 0) updateDoc.lastPdfPage = Number(lastPdfPage);

    const updateQuery = {
      $set: updateDoc,
    };

    if (markCompleted && lessonId) {
      updateQuery.$addToSet = { completedLessons: lessonId };
    }

    const progress = await LearningProgress.findOneAndUpdate(
      { student: req.user._id, course: courseId },
      updateQuery,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Reading progress recorded successfully.',
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's recent learning progress for "Continue Learning" dashboard widget
 * @route   GET /api/learning/resume
 * @access  Private (Student)
 */
const getResumeLearning = async (req, res, next) => {
  try {
    const progressRecords = await LearningProgress.find({ student: req.user._id })
      .populate('course', 'name code credits department yearLevel semester')
      .populate('currentLesson', 'title chapterTitle order')
      .populate('lastPdfMaterial', 'title fileName materialType')
      .sort({ lastAccessedAt: -1 })
      .limit(6)
      .lean();

    res.status(200).json({
      success: true,
      count: progressRecords.length,
      data: progressRecords,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a structured lesson (Lecturer, Admin)
 * @route   POST /api/learning/lessons
 * @access  Private (Lecturer, Admin)
 */
const createLesson = async (req, res, next) => {
  try {
    const {
      courseId,
      chapterTitle,
      chapterOrder,
      title,
      order,
      summary,
      content,
      codeSnippet,
      attachedMaterialId,
      practiceQuizId,
      isPublished,
    } = req.body;

    if (!courseId || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'courseId, title, and content are required.',
      });
    }

    // Verify lecturer assignment
    if (req.user.role === 'lecturer') {
      const isAssigned = await verifyLecturerCourseAccess(req.user._id, courseId, req.user.role);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to create lessons for this course.',
        });
      }
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const lesson = await Lesson.create({
      course: courseId,
      courseCode: course.code,
      department: course.department,
      academicYear: course.yearLevel,
      semester: course.semester,
      chapterTitle: chapterTitle ? chapterTitle.trim() : 'Chapter 1: Foundations',
      chapterOrder: chapterOrder ? Number(chapterOrder) : 1,
      title: title.trim(),
      order: order ? Number(order) : 1,
      summary: summary ? summary.trim() : '',
      content,
      codeSnippet: codeSnippet || { code: '', language: 'python', output: '' },
      attachedMaterial: attachedMaterialId || undefined,
      practiceQuiz: practiceQuizId || undefined,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      author: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully.',
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a structured lesson (Lecturer, Admin)
 * @route   PUT /api/learning/lessons/:id
 * @access  Private (Lecturer, Admin)
 */
const updateLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    if (req.user.role === 'lecturer') {
      const isAssigned = await verifyLecturerCourseAccess(req.user._id, lesson.course, req.user.role);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to modify lessons for this course.',
        });
      }
    }

    const fields = [
      'chapterTitle',
      'chapterOrder',
      'title',
      'order',
      'summary',
      'content',
      'codeSnippet',
      'attachedMaterial',
      'practiceQuiz',
      'isPublished',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        lesson[f] = req.body[f];
      }
    });

    await lesson.save();

    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully.',
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a lesson (Lecturer, Admin)
 * @route   DELETE /api/learning/lessons/:id
 * @access  Private (Lecturer, Admin)
 */
const deleteLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    if (req.user.role === 'lecturer') {
      const isAssigned = await verifyLecturerCourseAccess(req.user._id, lesson.course, req.user.role);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to delete lessons for this course.',
        });
      }
    }

    await Lesson.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourseCurriculum,
  getLessonById,
  updateProgress,
  getResumeLearning,
  createLesson,
  updateLesson,
  deleteLesson,
};
