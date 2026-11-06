const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
    },
    instructions: {
      type: String,
      required: [true, 'Instructions are required'],
      trim: true,
    },
    courseCode: {
      type: String,
      required: [true, 'Course code is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor reference is required'],
      index: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Assignment deadline is required'],
      index: true,
    },
    maxScore: {
      type: Number,
      required: [true, 'Maximum score is required'],
      default: 100,
      min: 1,
    },
    published: {
      type: Boolean,
      default: false,
      index: true,
    },
    attachmentPath: {
      type: String,
    },
    attachmentOriginalName: {
      type: String,
    },
    allowLate: {
      type: Boolean,
      default: true,
    },
    // Backwards-compatible aliases
    attachments: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

assignmentSchema.index({ courseCode: 1, published: 1, deadline: 1 });
assignmentSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
