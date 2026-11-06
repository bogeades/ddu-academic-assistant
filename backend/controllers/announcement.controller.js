const { Announcement, Course, Enrollment, User, Notification } = require('../models');

/**
 * @desc    FR-L05: Post announcement to course students (courseCode, title, message)
 * @route   POST /api/announcements
 * @access  Private (Lecturer, Admin)
 */
const createAnnouncement = async (req, res, next) => {
  try {
    const { courseCode, courseId, title, message, isUrgent } = req.body;
    const cleanCourseCode = (courseCode || '').toUpperCase().trim();

    if ((!cleanCourseCode && !courseId) || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Course code (or Course ID), title, and message body are required.',
      });
    }

    let course = null;
    if (courseId) {
      course = await Course.findById(courseId);
    } else if (cleanCourseCode) {
      course = await Course.findOne({ code: cleanCourseCode });
    }

    const code = cleanCourseCode || (course ? course.code : 'GENERAL');

    const announcement = await Announcement.create({
      course: course ? course._id : undefined,
      courseCode: code,
      lecturer: req.user._id,
      title: title.trim(),
      message: message.trim(),
      isUrgent: Boolean(isUrgent),
    });

    // Notify students of this course (FR-L05)
    try {
      let studentIds = [];
      if (course) {
        const enrollments = await Enrollment.find({ course: course._id, status: 'enrolled' }).lean();
        studentIds = enrollments.map((e) => e.student);
      }

      if (studentIds.length === 0) {
        const students = await User.find({ role: 'student', status: 'active' }).select('_id').lean();
        studentIds = students.map((s) => s._id);
      }

      if (studentIds.length > 0) {
        const notifications = studentIds.map((sid) => ({
          user: sid,
          type: 'announcement',
          title: `${isUrgent ? 'URGENT: ' : ''}${code} - ${announcement.title}`,
          message: announcement.message,
          link: `/announcements`,
        }));
        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      console.warn('[Announcement Notification Warning]:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Announcement posted and broadcast to students.',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get announcements (all roles, filter by courseCode)
 * @route   GET /api/announcements
 * @access  Private
 */
const getAnnouncements = async (req, res, next) => {
  try {
    const query = {};

    if (req.query.courseCode) {
      query.courseCode = req.query.courseCode.toUpperCase().trim();
    } else if (req.query.courseId) {
      query.course = req.query.courseId;
    }

    const announcements = await Announcement.find(query)
      .populate('course', 'name code')
      .populate('lecturer', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete announcement
 * @route   DELETE /api/announcements/:id
 * @access  Private (Owner Lecturer, Admin)
 */
const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    if (
      announcement.lecturer.toString() !== req.user._id.toString() &&
      !['admin', 'deptHead'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this announcement.',
      });
    }

    await announcement.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
};
