const mongoose = require('mongoose');

const learningProgressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    currentLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    lastPdfMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseMaterial',
    },
    lastPdfPage: {
      type: Number,
      default: 1,
      min: 1,
    },
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
      },
    ],
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

learningProgressSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('LearningProgress', learningProgressSchema);
