const aiGateway = require('../services/aiGateway');
const { extractText } = require('../services/fileText');
const { QuestionHistory, Summary, Quiz, QuizResult } = require('../models');

/**
 * FR-S03, FR-AI01, FR-AI05: Ask academic question & get AI response in real time
 * POST /api/ai/ask [student, lecturer]
 */
const askQuestion = async (req, res, next) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Question content cannot be empty.',
    });
  }

  // 1. Always save question to history first (FR-AI05)
  let historyRecord;
  try {
    historyRecord = await QuestionHistory.create({
      user: req.user._id,
      question: question.trim(),
      answer: '',
      status: 'answered',
      cached: false,
      responseMs: 0,
    });
  } catch (dbErr) {
    return next(dbErr);
  }

  try {
    // 2. Call AI Gateway
    const result = await aiGateway.answerQuestion(question.trim());

    // 3. Handle CANNOT_ANSWER
    if (result.answer === 'CANNOT_ANSWER') {
      const friendlyUnanswerable =
        'The assistant could not find a verified academic answer to this query. Please rephrase with specific course terminology or consult your course lecturer.';

      historyRecord.answer = friendlyUnanswerable;
      historyRecord.status = 'unanswerable';
      historyRecord.responseMs = result.responseMs || 0;
      historyRecord.cached = false;
      await historyRecord.save();

      return res.status(200).json({
        success: true,
        data: {
          id: historyRecord._id,
          question: historyRecord.question,
          answer: friendlyUnanswerable,
          status: 'unanswerable',
          cached: false,
          responseMs: result.responseMs || 0,
          timestamp: historyRecord.createdAt,
        },
      });
    }

    // 4. Successful answer
    historyRecord.answer = result.answer;
    historyRecord.status = 'answered';
    historyRecord.cached = Boolean(result.cached);
    historyRecord.responseMs = result.responseMs || 0;
    await historyRecord.save();

    return res.status(200).json({
      success: true,
      data: {
        id: historyRecord._id,
        question: historyRecord.question,
        answer: result.answer,
        status: 'answered',
        cached: Boolean(result.cached),
        responseMs: result.responseMs || 0,
        timestamp: historyRecord.createdAt,
      },
    });
  } catch (aiErr) {
    // 5. External AI failure: preserve record as 'failed' (FR-AI05)
    historyRecord.status = 'failed';
    historyRecord.answer = 'Service unavailable. AI query failed.';
    await historyRecord.save().catch(() => {});

    return res.status(503).json({
      success: false,
      status: 'failed',
      message: 'AI academic assistant service is temporarily unavailable. Please try again shortly or review course lecture slides.',
      error: aiErr.message,
    });
  }
};

/**
 * FR-S03, FR-AI05: Get user's question and answer history (paginated)
 * GET /api/ai/history [student, lecturer]
 */
const getQuestionHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };

    if (req.query.search) {
      query.$or = [
        { question: new RegExp(req.query.search, 'i') },
        { answer: new RegExp(req.query.search, 'i') },
      ];
    }

    const [history, total] = await Promise.all([
      QuestionHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      QuestionHistory.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific history item owned by the user
 * DELETE /api/ai/history/:id [student, lecturer]
 */
const deleteQuestionHistoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await QuestionHistory.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Question history record not found or access denied.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Question history record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * FR-S04, FR-L07, FR-AI02: Upload document or paste text for AI summarization
 * POST /api/ai/summarize [student, lecturer]
 */
const summarizeDocument = async (req, res, next) => {
  try {
    let textToSummarize = '';
    let sourceName = 'Direct Input';
    let title = req.body.title || 'Document Summary';

    if (req.file) {
      sourceName = req.file.originalname;
      title = req.body.title || req.file.originalname;
      textToSummarize = await extractText(req.file);
    } else if (req.body.text && typeof req.body.text === 'string') {
      textToSummarize = req.body.text.trim();
    }

    if (!textToSummarize || textToSummarize.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'No readable text or file content provided (minimum 10 characters required).',
      });
    }

    // Call AI Gateway
    const summaryResult = await aiGateway.summarize(textToSummarize);

    // Save summary record
    const summary = await Summary.create({
      user: req.user._id,
      title,
      sourceName,
      sourceLength: textToSummarize.length,
      summaryText: summaryResult.summaryText,
      keyPoints: summaryResult.keyPoints || [],
    });

    res.status(201).json({
      success: true,
      message: 'Document successfully summarized.',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * FR-S04: List own saved summaries
 * GET /api/ai/summaries [student, lecturer]
 */
const getSavedSummaries = async (req, res, next) => {
  try {
    const summaries = await Summary.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: summaries.length,
      data: summaries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * FR-S04: Download summary as plain text file for offline study
 * GET /api/ai/summaries/:id/download [student, lecturer]
 */
const downloadSummary = async (req, res, next) => {
  try {
    const summary = await Summary.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found or access denied.',
      });
    }

    const cleanTitle = summary.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const content = [
      `========================================================================`,
      `DIRE DAWA UNIVERSITY - INSTITUTE OF TECHNOLOGY`,
      `DEPARTMENT OF COMPUTER SCIENCE`,
      `AI STUDY SUMMARY: ${summary.title.toUpperCase()}`,
      `Date Generated: ${new Date(summary.createdAt).toLocaleString()}`,
      `Source: ${summary.sourceName || 'Direct Input'} (${summary.sourceLength || 0} characters)`,
      `========================================================================\n`,
      summary.summaryText,
      `\n========================================================================`,
      `Dire Dawa University Smart Academic Assistant - Offline Study Material`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanTitle}-Summary.txt"`);
    res.send(content);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete own saved summary
 * DELETE /api/ai/summaries/:id [student, lecturer]
 */
const deleteSummary = async (req, res, next) => {
  try {
    const deleted = await Summary.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found or access denied.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Summary deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * FR-AI03: Generate quiz from topic, text, or uploaded document
 * POST /api/ai/quizzes/generate [student, lecturer]
 */
const generateQuiz = async (req, res, next) => {
  try {
    let { topic, material, count, courseCode, title, publish, deadline } = req.body;

    if (req.file) {
      material = await extractText(req.file);
      if (!topic) {
        topic = req.file.originalname.replace(/\.[^/.]+$/, '');
      }
    }

    if (!topic && !material) {
      return res.status(400).json({
        success: false,
        message: 'Either a topic, study material text, or an uploaded document must be provided.',
      });
    }

    const questionCount = parseInt(count || '5', 10);
    const generatedQuestions = await aiGateway.generateQuiz({
      topic,
      material,
      count: questionCount,
    });

    // Only lecturers can publish a quiz directly upon generation
    const isLecturer = req.user.role === 'lecturer' || req.user.role === 'admin';
    const isPublished = isLecturer ? Boolean(publish) : false;

    const quiz = await Quiz.create({
      title: title || `${topic || 'Computer Science'} Practice Quiz`,
      topic: topic || 'General CS',
      courseCode: courseCode || 'COSC',
      createdBy: req.user._id,
      isAIGenerated: true,
      published: isPublished,
      deadline: deadline ? new Date(deadline) : undefined,
      questions: generatedQuestions,
    });

    res.status(201).json({
      success: true,
      message: 'Quiz generated successfully.',
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List published quizzes plus own quizzes
 * Never expose correct answers to students in the listing
 * GET /api/ai/quizzes [student, lecturer]
 */
const getQuizzes = async (req, res, next) => {
  try {
    let query;

    if (req.user.role === 'student') {
      // Students see quizzes that are published OR created by themselves
      query = {
        $or: [{ published: true }, { createdBy: req.user._id }],
      };
    } else {
      // Lecturers / staff see published quizzes OR quizzes they created
      query = {
        $or: [{ createdBy: req.user._id }, { published: true }],
      };
    }

    const quizzes = await Quiz.find(query)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // Sanitize: hide correct answers from students
    const sanitizedQuizzes = quizzes.map((q) => {
      const isCreator = q.createdBy?._id?.toString() === req.user._id.toString();
      const hideAnswers = req.user.role === 'student' && !isCreator;

      const questions = (q.questions || []).map((question) => {
        if (hideAnswers) {
          const { correctAnswer, explanation, ...rest } = question;
          return rest;
        }
        return question;
      });

      return {
        ...q,
        questions,
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
 * Get a single quiz by ID
 * Hide correct answers from students who haven't taken it yet
 * GET /api/ai/quizzes/:id [student, lecturer]
 */
const getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found.',
      });
    }

    const isCreator = quiz.createdBy?._id?.toString() === req.user._id.toString();
    const isLecturerOrAdmin = ['lecturer', 'deptHead', 'admin'].includes(req.user.role);

    // If quiz is unpublished and user is not creator or staff, deny access
    if (!quiz.published && !isCreator && !isLecturerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'This quiz is not yet published by the instructor.',
      });
    }

    // Check if student has already submitted this quiz
    let studentResult = null;
    if (req.user.role === 'student') {
      studentResult = await QuizResult.findOne({
        student: req.user._id,
        quiz: quiz._id,
      }).lean();
    }

    // Hide answers if user is a student who didn't create the quiz and hasn't submitted yet
    const hideAnswers = req.user.role === 'student' && !isCreator && !studentResult;

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
        hasSubmitted: Boolean(studentResult),
        result: studentResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish or unpublish own quiz
 * PATCH /api/ai/quizzes/:id/publish [lecturer]
 */
const togglePublishQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found.',
      });
    }

    // Only creator or admin can publish
    const isCreator = quiz.createdBy.toString() === req.user._id.toString();
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only publish or unpublish quizzes you created.',
      });
    }

    if (req.body.published !== undefined) {
      quiz.published = Boolean(req.body.published);
    } else {
      quiz.published = !quiz.published;
    }

    await quiz.save();

    res.status(200).json({
      success: true,
      message: `Quiz ${quiz.published ? 'published' : 'unpublished'} successfully.`,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * FR-S07, FR-AI04: Submit answers for a quiz
 * Grade multiple choice locally, grade short answers via AI Gateway
 * Graceful fallback if AI is offline
 * POST /api/ai/quizzes/:id/submit [student]
 */
const submitQuizAnswers = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found.',
      });
    }

    // Check deadline
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
      const studentAnswerText = submitted && submitted.answer ? String(submitted.answer).trim() : '';

      if (q.type === 'mcq') {
        // Grade multiple choice locally
        const isMatch = studentAnswerText.toLowerCase() === (q.correctAnswer || '').toLowerCase();
        const earnedScore = isMatch ? qMax : 0;
        totalScore += earnedScore;

        evaluatedAnswers.push({
          questionId: q._id,
          answer: studentAnswerText,
          score: earnedScore,
          maxScore: qMax,
          correct: isMatch,
          feedback: isMatch
            ? 'Correct!'
            : `Incorrect. The correct answer was: "${q.correctAnswer}". ${q.explanation || ''}`.trim(),
        });
      } else {
        // Short answer question: grade via AI Gateway
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
          // OFFLINE FALLBACK: do not block student; assign 0 to short answer with model answer
          aiEvaluationOffline = true;
          score = 0;
          correct = false;
          feedback = `AI grading service was unavailable. Reference model answer: "${q.correctAnswer}".`;
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
 * FR-S07: Get student's own quiz results
 * GET /api/ai/results [student]
 */
const getStudentQuizResults = async (req, res, next) => {
  try {
    const results = await QuizResult.find({ student: req.user._id })
      .populate('quiz', 'title topic courseCode deadline')
      .sort({ createdAt: -1 })
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

/**
 * FR-A06: Get AI Gateway health status and metrics
 * GET /api/ai/health [admin]
 */
const getAIHealth = async (req, res, next) => {
  try {
    const healthData = aiGateway.health();
    res.status(200).json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  askQuestion,
  getQuestionHistory,
  deleteQuestionHistoryItem,
  summarizeDocument,
  getSavedSummaries,
  downloadSummary,
  deleteSummary,
  generateQuiz,
  getQuizzes,
  getQuizById,
  togglePublishQuiz,
  submitQuizAnswers,
  getStudentQuizResults,
  getAIHealth,
};
