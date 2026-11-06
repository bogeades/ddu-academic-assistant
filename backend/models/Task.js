const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline date is required'],
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    reminderSent: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index on user + deadline
taskSchema.index({ user: 1, deadline: 1 });
// Compound index for querying user's upcoming tasks
taskSchema.index({ user: 1, completed: 1, deadline: 1 });

module.exports = mongoose.model('Task', taskSchema);
