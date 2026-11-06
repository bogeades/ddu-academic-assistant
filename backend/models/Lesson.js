const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    courseCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    academicYear: {
      type: Number,
      default: 1,
    },
    semester: {
      type: Number,
      default: 1,
    },
    section: {
      type: String,
      default: 'ALL',
    },
    chapterTitle: {
      type: String,
      required: [true, 'Chapter title is required'],
      trim: true,
      default: 'Chapter 1: Foundations',
    },
    chapterOrder: {
      type: Number,
      default: 1,
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    summary: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Lesson content is required'],
    },
    codeSnippet: {
      code: { type: String, default: '' },
      language: { type: String, default: 'python' },
      output: { type: String, default: '' },
    },
    attachedMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseMaterial',
    },
    practiceQuiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

lessonSchema.index({ course: 1, chapterOrder: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
