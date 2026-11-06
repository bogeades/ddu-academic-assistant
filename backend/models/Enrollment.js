const mongoose = require('mongoose');

const gradeAuditSchema = new mongoose.Schema(
  {
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    modifiedAt: {
      type: Date,
      default: Date.now,
    },
    previousTotal: Number,
    newTotal: Number,
    previousGrade: String,
    newGrade: String,
    action: {
      type: String,
      enum: ['draft_saved', 'published', 'reverted'],
      default: 'draft_saved',
    },
  },
  { _id: false }
);

const enrollmentSchema = new mongoose.Schema(
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
    semester: {
      type: String,
      required: [true, 'Semester is required (e.g., 2026-Semester-1)'],
      trim: true,
    },
    academicYear: {
      type: String,
      default: '2026/2027',
      trim: true,
    },
    status: {
      type: String,
      enum: ['enrolled', 'completed', 'dropped', 'pending_approval'],
      default: 'enrolled',
      index: true,
    },
    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Self-enrolled or Registrar
    },
    // Official Assessment Marks (FR-L04)
    classworkScore: {
      type: Number,
      min: 0,
      default: 0,
    },
    quizScore: {
      type: Number,
      min: 0,
      default: 0,
    },
    midtermScore: {
      type: Number,
      min: 0,
      default: 0,
    },
    finalExamScore: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalMark: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    letterGrade: {
      type: String, // 'A+', 'A', 'B', etc.
      trim: true,
      default: 'F',
    },
    gradePoint: {
      type: Number,
      default: 0.0,
    },
    gradingStatus: {
      type: String,
      enum: ['draft', 'under_review', 'published'],
      default: 'draft',
      index: true,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    gradedAt: {
      type: Date,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    publishedAt: {
      type: Date,
    },
    gradeAuditTrail: [gradeAuditSchema],
    // Backwards compatibility aliases
    grade: {
      type: String,
      trim: true,
    },
    numericScore: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to keep numericScore & grade in sync with totalMark & letterGrade
enrollmentSchema.pre('save', function (next) {
  if (this.totalMark !== undefined) {
    this.numericScore = this.totalMark;
  }
  if (this.letterGrade) {
    this.grade = this.letterGrade;
  }
  next();
});

// Compound unique index on student + course + semester
enrollmentSchema.index({ student: 1, course: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
