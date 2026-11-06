const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    filePath: {
      type: String,
    },
    fileName: {
      type: String,
    },
    textAnswer: {
      type: String,
      trim: true,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    grade: {
      type: Number,
      min: 0,
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    gradedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['submitted', 'graded'],
      default: 'submitted',
      index: true,
    },
    // Backwards-compatible aliases
    fileUrl: {
      type: String,
    },
    originalFilename: {
      type: String,
    },
    submissionText: {
      type: String,
    },
    isAIGraded: {
      type: Boolean,
      default: false,
    },
    aiSuggestedGrade: {
      score: Number,
      maxScore: Number,
      feedback: String,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save to sync aliases
submissionSchema.pre('save', function (next) {
  if (this.filePath && !this.fileUrl) {
    this.fileUrl = this.filePath;
  }
  if (this.fileName && !this.originalFilename) {
    this.originalFilename = this.fileName;
  }
  if (this.textAnswer && !this.submissionText) {
    this.submissionText = this.textAnswer;
  } else if (this.submissionText && !this.textAnswer) {
    this.textAnswer = this.submissionText;
  }
  next();
});

// Unique compound index on assignment + student
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ assignment: 1, status: 1 });
submissionSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
