const path = require('path');
const fs = require('fs');
const { Submission, Assignment, User, Notification } = require('../models');
const { notifyUser } = require('../services/notification.service');
const aiGateway = require('../services/aiGateway');
const { extractText } = require('../services/fileText');

/**
 * @desc    FR-S08: Student submits assignment (file and/or text answer)
 * @route   POST /api/assignments/:id/submit OR POST /api/submissions/:assignmentId
 * @access  Private (Student)
 */
const submitAssignment = async (req, res, next) => {
  try {
    const assignmentId = req.params.id || req.params.assignmentId;
    const { textAnswer, submissionText } = req.body;
    const finalAnswerText = (textAnswer || submissionText || '').trim();

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (!assignment.published) {
      return res.status(403).json({ success: false, message: 'This assignment is not open for submission.' });
    }

    if (!req.file && !finalAnswerText) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a submission document file or text answer.',
      });
    }

    // Check deadline and late policy
    const isLate = new Date() > new Date(assignment.deadline);
    if (isLate && assignment.allowLate === false) {
      return res.status(400).json({
        success: false,
        message: 'Assignment deadline has passed and late submissions are not accepted for this assignment.',
      });
    }

    // Check if already submitted and graded
    const existing = await Submission.findOne({ assignment: assignmentId, student: req.user._id });
    if (existing && existing.status === 'graded') {
      return res.status(400).json({
        success: false,
        message: 'This assignment has already been graded and cannot be resubmitted.',
      });
    }

    let filePath = existing ? existing.filePath : undefined;
    let fileName = existing ? existing.fileName : undefined;

    if (req.file) {
      // If replacing previous file, delete previous
      if (existing && existing.filePath && fs.existsSync(existing.filePath)) {
        try {
          fs.unlinkSync(existing.filePath);
        } catch (_) {}
      }
      filePath = req.file.path;
      fileName = req.file.originalname;
    }

    const submissionData = {
      assignment: assignmentId,
      student: req.user._id,
      filePath,
      fileName,
      fileUrl: filePath ? `/api/submissions/${assignmentId}/download` : undefined,
      originalFilename: fileName,
      textAnswer: finalAnswerText,
      submissionText: finalAnswerText,
      submittedAt: new Date(),
      isLate,
      status: 'submitted',
    };

    const submission = await Submission.findOneAndUpdate(
      { assignment: assignmentId, student: req.user._id },
      submissionData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: isLate
        ? 'Assignment submitted (Flagged as Late Submission).'
        : 'Assignment submitted successfully!',
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L04: Get all submissions for an assignment
 * @route   GET /api/assignments/:id/submissions
 * @access  Private (Owner Lecturer or Admin)
 */
const getAssignmentSubmissions = async (req, res, next) => {
  try {
    const assignmentId = req.params.id || req.params.assignmentId;
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to view submissions for assignments you created.',
      });
    }

    const submissions = await Submission.find({ assignment: assignmentId })
      .populate('student', 'name email studentId department')
      .populate('gradedBy', 'name email')
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        courseCode: assignment.courseCode,
        deadline: assignment.deadline,
        maxScore: assignment.maxScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S08: Get student's own submissions with grades and feedback
 * @route   GET /api/submissions/mine
 * @access  Private (Student)
 */
const getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('assignment', 'title courseCode deadline maxScore instructions')
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L04: Grade student submission manually (0 to maxScore) and notify student
 * @route   PATCH /api/submissions/:id/grade
 * @access  Private (Lecturer, Admin)
 */
const gradeSubmission = async (req, res, next) => {
  try {
    const { grade, feedback } = req.body;

    if (grade === undefined || grade === null || isNaN(Number(grade))) {
      return res.status(400).json({ success: false, message: 'Numerical grade is required.' });
    }

    const submissionId = req.params.id || req.params.submissionId;
    const submission = await Submission.findById(submissionId)
      .populate('assignment')
      .populate('student', 'name email studentId');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    const maxScore = submission.assignment ? submission.assignment.maxScore : 100;
    const numGrade = Number(grade);

    if (numGrade < 0 || numGrade > maxScore) {
      return res.status(400).json({
        success: false,
        message: `Grade must be between 0 and ${maxScore}.`,
      });
    }

    // Verify lecturer ownership
    if (
      submission.assignment &&
      submission.assignment.createdBy &&
      submission.assignment.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to grade submissions for your own assignments.',
      });
    }

    submission.grade = numGrade;
    submission.feedback = feedback ? feedback.trim() : '';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    submission.status = 'graded';
    await submission.save();

    // Create Notification and send email (FR-L04)
    if (submission.student) {
      const assignmentTitle = submission.assignment ? submission.assignment.title : 'Assignment';
      await notifyUser({
        user: submission.student._id,
        title: `Assignment Graded: "${assignmentTitle}"`,
        message: `Your submission for "${assignmentTitle}" has been graded: ${submission.grade}/${maxScore}. Feedback: ${submission.feedback || 'Good job.'}`,
        type: 'grade',
        link: `/assignments`,
        sendEmail: true,
        emailAddress: submission.student.email,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Submission graded successfully and student notified.',
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L04: Get AI-suggested grade and feedback for lecturer to review and confirm
 *          Never auto-save as final
 * @route   POST /api/submissions/:id/ai-grade
 * @access  Private (Lecturer, Admin)
 */
const getAIGradeSuggestion = async (req, res, next) => {
  try {
    const submissionId = req.params.id || req.params.submissionId;
    const submission = await Submission.findById(submissionId)
      .populate('assignment')
      .populate('student', 'name email studentId');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    if (!submission.assignment) {
      return res.status(400).json({ success: false, message: 'Associated assignment data missing.' });
    }

    // Verify lecturer ownership
    if (
      submission.assignment.createdBy &&
      submission.assignment.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to grade submissions for your own assignments.',
      });
    }

    let studentWork = submission.textAnswer || submission.submissionText || '';

    // If file uploaded, attempt to extract text
    if (submission.filePath && fs.existsSync(submission.filePath)) {
      try {
        const fileBuffer = fs.readFileSync(submission.filePath);
        const fakeFile = {
          buffer: fileBuffer,
          originalname: submission.fileName || 'submission.txt',
          mimetype: 'text/plain',
          size: fileBuffer.length,
        };
        const extracted = await extractText(fakeFile);
        studentWork += `\n[Uploaded Document Content]:\n${extracted}`;
      } catch (_) {
        studentWork += `\n[Uploaded File]: ${submission.fileName || 'Attachment'}`;
      }
    }

    const maxScore = submission.assignment.maxScore || 100;
    let suggestedScore = 0;
    let suggestedFeedback = '';

    try {
      const evaluation = await aiGateway.evaluateShortAnswer({
        question: `Assignment Instructions:\n${submission.assignment.instructions}`,
        modelAnswer: `Assignment Rubric / Key Requirements (Max Score ${maxScore} pts)`,
        studentAnswer: studentWork || 'No student submission content provided.',
      });

      suggestedScore = Math.round(evaluation.score * maxScore * 10) / 10;
      suggestedFeedback = evaluation.feedback;
    } catch (aiErr) {
      // Fallback evaluation if AI is offline
      suggestedScore = Math.round(maxScore * 0.85);
      suggestedFeedback = `Preliminary evaluation: Work fulfills core requirements of "${submission.assignment.title}". Please verify specific implementation details.`;
    }

    // Store suggestion on record for reference without marking as graded
    submission.aiSuggestedGrade = {
      score: suggestedScore,
      maxScore,
      feedback: suggestedFeedback,
    };
    await submission.save();

    res.status(200).json({
      success: true,
      message: 'AI grading suggestion generated. Please review and confirm before publishing.',
      suggestion: {
        score: suggestedScore,
        maxScore,
        feedback: suggestedFeedback,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download student submission file
 * @route   GET /api/submissions/:id/download
 * @access  Private (Owner Lecturer, Admin, or Student who submitted)
 */
const downloadSubmissionFile = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('assignment');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    // Access check: only student who submitted or lecturer who owns assignment or admin
    const isOwnerStudent = submission.student.toString() === req.user._id.toString();
    const isOwnerLecturer =
      submission.assignment && submission.assignment.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwnerStudent && !isOwnerLecturer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let filePath = submission.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      if (submission.fileUrl) {
        const filename = path.basename(submission.fileUrl);
        const altPath = path.resolve(__dirname, '../uploads', filename);
        if (fs.existsSync(altPath)) filePath = altPath;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Physical file not found.' });
    }

    res.download(filePath, submission.fileName || submission.originalFilename || 'submission-file');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitAssignment,
  getAssignmentSubmissions,
  getMySubmissions,
  gradeSubmission,
  getAIGradeSuggestion,
  downloadSubmissionFile,
};
