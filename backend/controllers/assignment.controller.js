const path = require('path');
const fs = require('fs');
const { Assignment, Course, Enrollment, Submission, User, Notification } = require('../models');

/**
 * @desc    FR-L03: Create a new assignment (title, instructions, courseCode, deadline, maxScore, attachment, published)
 * @route   POST /api/assignments
 * @access  Private (Lecturer, Admin)
 */
const createAssignment = async (req, res, next) => {
  try {
    const { title, instructions, courseCode, deadline, maxScore, allowLate, published } = req.body;

    if (!title || !instructions || !courseCode || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Title, instructions, course code, and deadline are required fields.',
      });
    }

    const cleanCourseCode = courseCode.toUpperCase().trim();
    let course = null;
    try {
      course = await Course.findOne({ code: cleanCourseCode });
    } catch (_) {}

    let attachmentPath = undefined;
    let attachmentOriginalName = undefined;

    if (req.file) {
      attachmentPath = req.file.path;
      attachmentOriginalName = req.file.originalname;
    }

    const isPublished = published === true || published === 'true';

    const assignment = await Assignment.create({
      title: title.trim(),
      instructions: instructions.trim(),
      courseCode: cleanCourseCode,
      course: course ? course._id : undefined,
      createdBy: req.user._id,
      deadline: new Date(deadline),
      maxScore: Number(maxScore) || 100,
      attachmentPath,
      attachmentOriginalName,
      allowLate: allowLate !== undefined ? Boolean(allowLate === true || allowLate === 'true') : true,
      published: isPublished,
    });

    // Notify students on publish (FR-L03)
    if (assignment.published) {
      await notifyStudentsOnAssignmentPublish(assignment);
    }

    res.status(201).json({
      success: true,
      message: assignment.published
        ? 'Assignment created and published to students.'
        : 'Assignment saved as draft.',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to notify students when an assignment is published
 */
const notifyStudentsOnAssignmentPublish = async (assignment) => {
  try {
    let studentIds = [];
    if (assignment.course) {
      const enrollments = await Enrollment.find({ course: assignment.course, status: 'enrolled' }).lean();
      studentIds = enrollments.map((e) => e.student);
    }

    if (studentIds.length === 0) {
      const students = await User.find({ role: 'student', status: 'active' }).select('_id').lean();
      studentIds = students.map((s) => s._id);
    }

    if (studentIds.length > 0) {
      const deadlineText = new Date(assignment.deadline).toLocaleDateString();
      const notifications = studentIds.map((sid) => ({
        user: sid,
        type: 'assignment',
        title: `New Assignment: "${assignment.title}"`,
        message: `A new assignment "${assignment.title}" has been published for ${assignment.courseCode}. Deadline: ${deadlineText}.`,
        link: `/assignments/${assignment._id}`,
      }));
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.warn('[Assignment Notification Warning]:', err.message);
  }
};

/**
 * @desc    Get assignments (students see published ones, lecturers see their own)
 * @route   GET /api/assignments
 * @access  Private
 */
const getAssignments = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === 'student') {
      query.published = true;
    } else if (req.user.role === 'lecturer') {
      query.createdBy = req.user._id;
    }

    if (req.query.courseCode) {
      query.courseCode = req.query.courseCode.toUpperCase().trim();
    }

    const assignments = await Assignment.find(query)
      .populate('course', 'name code')
      .populate('createdBy', 'name email role')
      .sort({ deadline: 1 })
      .lean();

    // Attach student submission status if student
    if (req.user.role === 'student') {
      const submissions = await Submission.find({ student: req.user._id }).lean();
      const submissionMap = new Map(submissions.map((s) => [s.assignment.toString(), s]));

      assignments.forEach((a) => {
        const sub = submissionMap.get(a._id.toString());
        a.mySubmission = sub || null;
        a.isSubmitted = Boolean(sub);
      });
    }

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
 * @desc    Get assignment by ID
 * @route   GET /api/assignments/:id
 * @access  Private
 */
const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'name code')
      .populate('createdBy', 'name email role')
      .lean();

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (req.user.role === 'student' && !assignment.published) {
      return res.status(403).json({
        success: false,
        message: 'This assignment is not yet published.',
      });
    }

    if (req.user.role === 'student') {
      const mySubmission = await Submission.findOne({
        assignment: assignment._id,
        student: req.user._id,
      }).lean();
      assignment.mySubmission = mySubmission || null;
      assignment.isSubmitted = Boolean(mySubmission);
    }

    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L03: Update assignment details
 * @route   PUT /api/assignments/:id
 * @access  Private (Owner Lecturer or Admin)
 */
const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only edit assignments created by your account.',
      });
    }

    const { title, instructions, courseCode, deadline, maxScore, allowLate, published } = req.body;

    if (title) assignment.title = title.trim();
    if (instructions) assignment.instructions = instructions.trim();
    if (courseCode) assignment.courseCode = courseCode.toUpperCase().trim();
    if (deadline) assignment.deadline = new Date(deadline);
    if (maxScore) assignment.maxScore = Number(maxScore);
    if (allowLate !== undefined) assignment.allowLate = Boolean(allowLate === true || allowLate === 'true');

    if (req.file) {
      assignment.attachmentPath = req.file.path;
      assignment.attachmentOriginalName = req.file.originalname;
    }

    const wasDraft = !assignment.published;
    if (published !== undefined) {
      assignment.published = Boolean(published === true || published === 'true');
    }

    await assignment.save();

    if (wasDraft && assignment.published) {
      await notifyStudentsOnAssignmentPublish(assignment);
    }

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully.',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L03: Delete assignment and submissions
 * @route   DELETE /api/assignments/:id
 * @access  Private (Owner Lecturer or Admin)
 */
const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete assignments created by your account.',
      });
    }

    if (assignment.attachmentPath && fs.existsSync(assignment.attachmentPath)) {
      try {
        fs.unlinkSync(assignment.attachmentPath);
      } catch (_) {}
    }

    await assignment.deleteOne();
    await Submission.deleteMany({ assignment: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Assignment and related submissions deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-L03: Publish or unpublish assignment (notifies students on publish)
 * @route   PATCH /api/assignments/:id/publish
 * @access  Private (Owner Lecturer or Admin)
 */
const publishAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only publish assignments created by your account.',
      });
    }

    const wasDraft = !assignment.published;
    if (req.body.published !== undefined) {
      assignment.published = Boolean(req.body.published === true || req.body.published === 'true');
    } else {
      assignment.published = !assignment.published;
    }

    await assignment.save();

    if (wasDraft && assignment.published) {
      await notifyStudentsOnAssignmentPublish(assignment);
    }

    res.status(200).json({
      success: true,
      message: `Assignment ${assignment.published ? 'published to students' : 'unpublished'}.`,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download assignment attachment file
 * @route   GET /api/assignments/:id/download
 * @access  Private
 */
const downloadAssignmentAttachment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (req.user.role === 'student' && !assignment.published) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!assignment.attachmentPath || !fs.existsSync(assignment.attachmentPath)) {
      return res.status(404).json({ success: false, message: 'No attachment found for this assignment.' });
    }

    res.download(assignment.attachmentPath, assignment.attachmentOriginalName || 'assignment-attachment');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
  downloadAssignmentAttachment,
};
