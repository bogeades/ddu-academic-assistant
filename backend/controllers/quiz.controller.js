const { Quiz, QuizResult, Course, Enrollment, User, Notification } = require('../models');
const aiGateway = require('../services/aiGateway');

/**
 * @desc    FR-L03: Create a new quiz manually or with AI generated questions
 * @route   POST /api/quizzes
 * @access  Private (Lecturer, Admin)
 */
const createQuiz = async (req, res, next) => {
  try {
    const {
      title,
      instructions,
      courseCode,
      topic,
      deadline,
      durationMinutes,
      questions,
      maxScore,
      isAIGenerated,
      published,
    } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quiz title and at least one question are required.',
      });
    }

    const cleanCourseCode = (courseCode || 'COSC').toUpperCase().trim();
    let course = null;
    try {
      course = await Course.findOne({ code: cleanCourseCode });
    } catch (_) {}

    // Calculate max score
    const calculatedMaxScore = questions.reduce((acc, q) => acc + (Number(q.maxScore) || 1), 0);

    const quiz = await Quiz.create({
      title: title.trim(),
      instructions: instructions ? instructions.trim() : '',
      courseCode: cleanCourseCode,
      course: course ? course._id : undefined,
      topic: topic ? topic.trim() : 'General',
      createdBy: req.user._id,
      deadline: deadline ? new Date(deadline) : undefined,
      durationMinutes: durationMinutes || 30,
      questions,
      maxScore: maxScore || calculatedMaxScore,
      isAIGenerated: Boolean(isAIGenerated),
      published: Boolean(published),
    });

    // Notify students on publish (FR-L03)
    if (quiz.published) {
      await notifyStudentsOnQuizPublish(quiz);
    }

    res.status(201).json({
      success: true,
      message: quiz.published ? 'Quiz created and published to students.' : 'Quiz created as draft.',
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to notify students when a quiz is published
 */
const notifyStudentsOnQuizPublish = async (quiz) => {
  try {
    let studentIds = [];
    if (quiz.course) {
      const enrollments = await Enrollment.find({ course: quiz.course, status: 'enrolled' }).lean();
      studentIds = enrollments.map((e) => e.student);
    }

    if (studentIds.length === 0) {
      const students = await User.find({ role: 'student', status: 'active' }).select('_id').lean();
      studentIds = students.map((s) => s._id);
    }

    if (studentIds.length > 0) {
      const deadlineText = quiz.deadline ? new Date(quiz.deadline).toLocaleDateString() : 'Open';
      const notifications = studentIds.map((sid) => ({
        user: sid,
        type: 'quiz',
        title: `New Quiz: "${quiz.title}"`,
        message: `A new quiz "${quiz.title}" has been published for ${quiz.courseCode}. Deadline: ${deadlineText}.`,
        link: `/quizzes`,
      }));
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.warn('[Quiz Notification Warning]:', err.message);
  }
};

/**
 * @desc    Get all quizzes accessible to user (published for students, own + published for lecturers)
 * @route   GET /api/quizzes
 * @access  Private
 */
const getQuizzes = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      query = {
        $or: [{ published: true }, { createdBy: req.user._id }],
      };
    } else {
      query = {
        $or: [{ createdBy: req.user._id }, { published: true }],
      };
    }

    if (req.query.courseCode) {
      query.courseCode = req.query.courseCode.toUpperCase().trim();
    }

    const quizzes = await Quiz.find(query)
      .populate('course', 'name code')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // Sanitize: hide correct answers from students who haven't taken the quiz
    const userResults =
      req.user.role === 'student'
        ? await QuizResult.find({ student: req.user._id }).lean()
        : [];
    const completedQuizMap = new Map(userResults.map((r) => [r.quiz.toString(), r]));

    const sanitizedQuizzes = quizzes.map((q) => {
      const isCreator = q.createdBy?._id?.toString() === req.user._id.toString();
      const studentResult = completedQuizMap.get(q._id.toString());
      const hideAnswers = req.user.role === 'student' && !isCreator && !studentResult;

      const questions = (q.questions || []).map((question) => {
        if (hideAnswers) {
          const { correctAnswer, explanation, ...safeQ } = question;
          return safeQ;
        }
        return question;
      });

      return {
        ...q,
        questions,
        isCompleted: Boolean(studentResult),
        myResult: studentResult || null,
      };
    });

    res.status(200).json({
      success: true,
      count: sanitizedQuizzes.length,
      data: sanitizedQuizzes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S07: Get quiz details to take the test (hides correct answers for students)
 * @route   GET /api/quizzes/:id
 * @access  Private
 */
const getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('course', 'name code')
      .populate('createdBy', 'name email role')
      .lean();

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const isCreator = quiz.createdBy?._id?.toString() === req.user._id.toString();
    const isStaff = ['lecturer', 'deptHead', 'admin'].includes(req.user.role);

    if (!quiz.published && !isCreator && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'This quiz is not yet published.',
      });
    }

    let previousResult = null;
    if (req.user.role === 'student') {
      previousResult = await QuizResult.findOne({
        quiz: quiz._id,
        student: req.user._id,
      }).lean();
    }

    const hideAnswers = req.user.role === 'student' && !isCreator && !previousResult;

    const sanitizedQuestions = (quiz.questions || []).map((q) => {
      if (hideAnswers) {
        const { correctAnswer, explanation, ...safeQ } = q;
        return safeQ;
      }
      return q;
    });

    res.status(200).json({
      success: true,
      data: {
        ...quiz,
        questions: sanitizedQuestions,
        isCompleted: Boolean(previousResult),
        previousResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L03: Edit quiz details or questions
 * @route   PUT /api/quizzes/:id
 * @access  Private (Owner Lecturer or Admin)
 */
const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to edit quizzes you created.',
      });
    }

    const { title, instructions, courseCode, topic, deadline, durationMinutes, questions, maxScore, published } = req.body;

    if (title) quiz.title = title.trim();
    if (instructions !== undefined) quiz.instructions = instructions.trim();
    if (courseCode) quiz.courseCode = courseCode.toUpperCase().trim();
    if (topic) quiz.topic = topic.trim();
    if (deadline) quiz.deadline = new Date(deadline);
    if (durationMinutes) quiz.durationMinutes = durationMinutes;
    if (questions && Array.isArray(questions)) {
      quiz.questions = questions;
      quiz.maxScore = questions.reduce((acc, q) => acc + (Number(q.maxScore) || 1), 0);
    }
    if (maxScore) quiz.maxScore = maxScore;

    const wasDraft = !quiz.published;
    if (published !== undefined) {
      quiz.published = Boolean(published);
    }

    await quiz.save();

    // If newly published, notify students
    if (wasDraft && quiz.published) {
      await notifyStudentsOnQuizPublish(quiz);
    }

    res.status(200).json({
      success: true,
      message: 'Quiz updated successfully.',
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L03: Delete quiz
 * @route   DELETE /api/quizzes/:id
 * @access  Private (Owner Lecturer or Admin)
 */
const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to delete quizzes you created.',
      });
    }

    await quiz.deleteOne();
    await QuizResult.deleteMany({ quiz: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Quiz and associated results deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L03: Publish or unpublish quiz
 * @route   PATCH /api/quizzes/:id/publish
 * @access  Private (Owner Lecturer or Admin)
 */
const publishQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to publish quizzes you created.',
      });
    }

    const wasPublished = quiz.published;
    if (req.body.published !== undefined) {
      quiz.published = Boolean(req.body.published);
    } else {
      quiz.published = !quiz.published;
    }

    await quiz.save();

    // Notify students on publish (FR-L03)
    if (!wasPublished && quiz.published) {
      await notifyStudentsOnQuizPublish(quiz);
    }

    res.status(200).json({
      success: true,
      message: `Quiz ${quiz.published ? 'published to students' : 'unpublished'}.`,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S07: Submit quiz answers
 * @route   POST /api/quizzes/:id/submit
 * @access  Private (Student)
 */
const submitQuizAnswers = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    if (quiz.deadline && new Date() > new Date(quiz.deadline)) {
      return res.status(400).json({
        success: false,
        message: 'Quiz deadline has passed. Late submissions are not accepted.',
      });
    }

    const { answers = [] } = req.body;
    let totalScore = 0;
    let totalMaxScore = 0;
    let aiEvaluationOffline = false;

    const evaluatedAnswers = [];

    for (const q of quiz.questions) {
      const qMax = q.maxScore || 1;
      totalMaxScore += qMax;

      const submitted = answers.find(
        (a) => a.questionId && a.questionId.toString() === q._id.toString()
      );
      const studentAnswerText = submitted && submitted.answer !== undefined ? String(submitted.answer).trim() : '';

      if (q.type === 'mcq') {
        const isMatch = studentAnswerText.toLowerCase() === (q.correctAnswer || '').toLowerCase();
        const earnedScore = isMatch ? qMax : 0;
        totalScore += earnedScore;

        evaluatedAnswers.push({
          questionId: q._id,
          answer: studentAnswerText,
          score: earnedScore,
          maxScore: qMax,
          correct: isMatch,
          feedback: isMatch ? 'Correct!' : `Incorrect. Correct answer: "${q.correctAnswer}". ${q.explanation || ''}`.trim(),
        });
      } else {
        let score = 0;
        let correct = false;
        let feedback = '';

        try {
          const evalResult = await aiGateway.evaluateShortAnswer({
            question: q.text,
            modelAnswer: q.correctAnswer,
            studentAnswer: studentAnswerText,
          });

          score = Math.round(evalResult.score * qMax * 10) / 10;
          correct = evalResult.score >= 0.7;
          feedback = evalResult.feedback;
          totalScore += score;
        } catch (aiErr) {
          aiEvaluationOffline = true;
          score = 0;
          correct = false;
          feedback = `AI evaluation offline. Reference model answer: "${q.correctAnswer}".`;
        }

        evaluatedAnswers.push({
          questionId: q._id,
          answer: studentAnswerText,
          score,
          maxScore: qMax,
          correct,
          feedback,
        });
      }
    }

    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    let overallFeedback =
      percentage >= 85
        ? 'Excellent work! You demonstrated mastery of this material.'
        : percentage >= 70
        ? 'Good performance. Review the missed concepts to solidify your understanding.'
        : percentage >= 50
        ? 'Passable, but requires targeted review of key course topics.'
        : 'Needs improvement. Please review lecture materials and consult your course instructor.';

    if (aiEvaluationOffline) {
      overallFeedback +=
        ' (Note: AI grading service was unavailable; short-answer questions could not be graded automatically and have been assigned 0 pending instructor review.)';
    }

    const result = await QuizResult.create({
      student: req.user._id,
      quiz: quiz._id,
      answers: evaluatedAnswers,
      score: totalScore,
      maxScore: totalMaxScore,
      percentage,
      feedback: overallFeedback,
    });

    res.status(200).json({
      success: true,
      message: 'Quiz submitted and evaluated successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get results for instructor
 * @route   GET /api/quizzes/:id/results
 * @access  Private (Lecturer, Admin)
 */
const getQuizResultsForInstructor = async (req, res, next) => {
  try {
    const results = await QuizResult.find({ quiz: req.params.id })
      .populate('student', 'name email studentId')
      .sort({ score: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  publishQuiz,
  submitQuizAnswers,
  getQuizResultsForInstructor,
};
