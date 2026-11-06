const cron = require('node-cron');
const { Task, Assignment, Submission, Quiz, QuizResult, User, Notification, Enrollment } = require('../models');
const { notifyUser } = require('../services/notification.service');

/**
 * Core check function that runs hourly:
 * 1. Tasks due within 24 hours
 * 2. Assignments due within 24 hours for students who have not submitted
 * 3. Quizzes due within 24 hours for students who have not taken them
 */
const runDeadlineRemindersJob = async () => {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 1. Task Deadline Reminders (FR-S06)
  try {
    const urgentTasks = await Task.find({
      completed: false,
      reminderSent: false,
      deadline: { $gte: now, $lte: in24Hours },
    }).populate('user', 'email name');

    for (const task of urgentTasks) {
      if (task.user) {
        const hoursLeft = Math.max(1, Math.round((task.deadline - now) / (1000 * 60 * 60)));
        await notifyUser({
          user: task.user._id,
          title: `Task Deadline: "${task.title}"`,
          message: `Your task "${task.title}" is due in approximately ${hoursLeft} hour(s).`,
          type: 'deadline',
          link: '/tasks',
          sendEmail: true,
          emailAddress: task.user.email,
        });

        task.reminderSent = true;
        await task.save();
      }
    }
  } catch (err) {
    console.error('[Cron Task Reminder Error]:', err.message);
  }

  // 2. Assignment Deadline Reminders for Students who have not submitted
  try {
    const upcomingAssignments = await Assignment.find({
      published: true,
      deadline: { $gte: now, $lte: in24Hours },
    }).lean();

    for (const assignment of upcomingAssignments) {
      // Find students who should submit this
      let studentIds = [];
      if (assignment.course) {
        const enrollments = await Enrollment.find({ course: assignment.course, status: 'enrolled' }).lean();
        studentIds = enrollments.map((e) => e.student);
      }
      if (studentIds.length === 0) {
        const students = await User.find({ role: 'student', status: 'active' }).select('_id email name').lean();
        studentIds = students.map((s) => s._id);
      }

      // Check which students already submitted
      const submittedStudentIds = await Submission.find({
        assignment: assignment._id,
        student: { $in: studentIds },
      }).distinct('student');

      const submittedSet = new Set(submittedStudentIds.map((id) => id.toString()));
      const pendingStudentIds = studentIds.filter((id) => !submittedSet.has(id.toString()));

      const hoursLeft = Math.max(1, Math.round((new Date(assignment.deadline) - now) / (1000 * 60 * 60)));

      for (const studentId of pendingStudentIds) {
        const studentUser = await User.findById(studentId).select('email name').lean();
        if (studentUser) {
          await notifyUser({
            user: studentId,
            title: `Assignment Due Soon: "${assignment.title}"`,
            message: `Assignment "${assignment.title}" (${assignment.courseCode}) is due in ${hoursLeft} hour(s) and has not yet been submitted.`,
            type: 'deadline',
            link: `/assignments/${assignment._id}`,
            sendEmail: true,
            emailAddress: studentUser.email,
          });
        }
      }
    }
  } catch (err) {
    console.error('[Cron Assignment Reminder Error]:', err.message);
  }

  // 3. Quiz Deadline Reminders for Students who have not taken them
  try {
    const upcomingQuizzes = await Quiz.find({
      published: true,
      deadline: { $gte: now, $lte: in24Hours },
    }).lean();

    for (const quiz of upcomingQuizzes) {
      let studentIds = [];
      if (quiz.course) {
        const enrollments = await Enrollment.find({ course: quiz.course, status: 'enrolled' }).lean();
        studentIds = enrollments.map((e) => e.student);
      }
      if (studentIds.length === 0) {
        const students = await User.find({ role: 'student', status: 'active' }).select('_id email name').lean();
        studentIds = students.map((s) => s._id);
      }

      const completedStudentIds = await QuizResult.find({
        quiz: quiz._id,
        student: { $in: studentIds },
      }).distinct('student');

      const completedSet = new Set(completedStudentIds.map((id) => id.toString()));
      const pendingStudentIds = studentIds.filter((id) => !completedSet.has(id.toString()));

      const hoursLeft = Math.max(1, Math.round((new Date(quiz.deadline) - now) / (1000 * 60 * 60)));

      for (const studentId of pendingStudentIds) {
        const studentUser = await User.findById(studentId).select('email name').lean();
        if (studentUser) {
          await notifyUser({
            user: studentId,
            title: `Quiz Due Soon: "${quiz.title}"`,
            message: `Quiz "${quiz.title}" (${quiz.courseCode}) closes in ${hoursLeft} hour(s).`,
            type: 'deadline',
            link: `/quizzes/${quiz._id}`,
            sendEmail: true,
            emailAddress: studentUser.email,
          });
        }
      }
    }
  } catch (err) {
    console.error('[Cron Quiz Reminder Error]:', err.message);
  }
};

/**
 * Initialize all scheduled background cron jobs
 */
const initCronJobs = () => {
  console.log('[Cron]: Initializing hourly deadline reminders and daily backup cron jobs...');

  // 1. Hourly Deadline Reminders Job (Tasks, Assignments, Quizzes)
  cron.schedule('0 * * * *', async () => {
    await runDeadlineRemindersJob();
  });

  // 2. Automated Daily Database Backup (Runs daily at 02:00 AM) - FR-A05
  cron.schedule('0 2 * * *', async () => {
    try {
      const { runBackupJob } = require('../services/backup.service');
      await runBackupJob('auto');
    } catch (err) {
      console.error('[Cron Automated Backup Error]:', err.message);
    }
  });
};

module.exports = {
  initCronJobs,
  runDeadlineRemindersJob,
};
