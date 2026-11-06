const { Task } = require('../models');

/**
 * @desc    FR-S06: Get student's own tasks (filter by completed or pending, sort by deadline)
 * @route   GET /api/tasks
 * @access  Private (Student only)
 */
const getTasks = async (req, res, next) => {
  try {
    const query = { user: req.user._id };

    // Support status filter (pending | completed)
    if (req.query.status === 'completed' || req.query.completed === 'true') {
      query.completed = true;
    } else if (req.query.status === 'pending' || req.query.completed === 'false') {
      query.completed = false;
    }

    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    const tasks = await Task.find(query)
      .sort({ deadline: 1 }) // Upcoming deadlines first
      .lean();

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S06: Add a new task with deadline
 * @route   POST /api/tasks
 * @access  Private (Student only)
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, deadline, priority } = req.body;

    if (!title || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Task title and deadline date are required.',
      });
    }

    const task = await Task.create({
      user: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      deadline: new Date(deadline),
      priority: priority || 'medium',
      completed: false,
      reminderSent: false,
    });

    res.status(201).json({
      success: true,
      message: 'Task added successfully.',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S06: Mark task completed
 * @route   PATCH /api/tasks/:id/complete
 * @access  Private (Student only)
 */
const completeTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or access denied.' });
    }

    if (req.body.completed !== undefined) {
      task.completed = Boolean(req.body.completed);
    } else {
      task.completed = true;
    }

    task.completedAt = task.completed ? new Date() : undefined;
    await task.save();

    res.status(200).json({
      success: true,
      message: `Task marked as ${task.completed ? 'completed' : 'pending'}.`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S06: Update task details
 * @route   PUT /api/tasks/:id
 * @access  Private (Student only)
 */
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or access denied.' });
    }

    if (req.body.title) task.title = req.body.title.trim();
    if (req.body.description !== undefined) task.description = req.body.description.trim();
    if (req.body.deadline) {
      task.deadline = new Date(req.body.deadline);
      task.reminderSent = false;
    }
    if (req.body.priority) task.priority = req.body.priority;
    if (req.body.completed !== undefined) {
      task.completed = Boolean(req.body.completed);
      task.completedAt = task.completed ? new Date() : undefined;
    }

    await task.save();

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    FR-S06: Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private (Student only)
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or access denied.' });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  createTask,
  completeTask,
  updateTask,
  deleteTask,
};
