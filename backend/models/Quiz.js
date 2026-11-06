const mongoose = require('mongoose');

const questionItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['mcq', 'short'],
      default: 'mcq',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: [
      {
        type: String,
        trim: true,
      },
    ],
    correctAnswer: {
      type: String, // For MCQ: exact option text; for short answer: model answer
      required: [true, 'Correct answer / model answer is required'],
      trim: true,
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
    maxScore: {
      type: Number,
      default: 1,
      min: 0.5,
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    topic: {
      type: String,
      trim: true,
      default: 'General',
    },
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'COSC',
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
      index: true,
    },
    questions: [questionItemSchema],
    deadline: {
      type: Date,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 5,
      max: 180,
    },
    maxScore: {
      type: Number,
      default: function () {
        return this.questions && this.questions.length > 0
          ? this.questions.reduce((acc, q) => acc + (q.maxScore || 1), 0)
          : 10;
      },
    },
    // Backwards compatibility alias
    totalScore: {
      type: Number,
    },
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
    published: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

quizSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0) {
    const calculated = this.questions.reduce((acc, q) => acc + (q.maxScore || 1), 0);
    this.maxScore = calculated;
    this.totalScore = calculated;
  }
  next();
});

quizSchema.index({ published: 1, deadline: 1 });
quizSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Quiz', quizSchema);
