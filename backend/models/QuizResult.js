const mongoose = require('mongoose');

const quizAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    answer: {
      type: String,
      default: '',
    },
    score: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 1,
    },
    correct: {
      type: Boolean,
      default: false,
    },
    feedback: {
      type: String,
      default: '',
    },
    // Backwards-compatible aliases
    selectedAnswer: {
      type: mongoose.Schema.Types.Mixed,
    },
    isCorrect: {
      type: Boolean,
    },
    scoreEarned: {
      type: Number,
    },
  },
  { _id: false }
);

// Sync aliases
quizAnswerSchema.pre('save', function (next) {
  if (this.correct !== undefined && this.isCorrect === undefined) {
    this.isCorrect = this.correct;
  }
  if (this.score !== undefined && this.scoreEarned === undefined) {
    this.scoreEarned = this.score;
  }
  next();
});

const quizResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz reference is required'],
      index: true,
    },
    answers: [quizAnswerSchema],
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    maxScore: {
      type: Number,
      required: true,
      min: 0,
    },
    // Backwards compatibility
    totalPossible: {
      type: Number,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

quizResultSchema.pre('save', function (next) {
  if (this.maxScore !== undefined && this.totalPossible === undefined) {
    this.totalPossible = this.maxScore;
  }
  next();
});

quizResultSchema.index({ student: 1, quiz: 1 });
quizResultSchema.index({ quiz: 1, score: -1 });

module.exports = mongoose.model('QuizResult', quizResultSchema);
