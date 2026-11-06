const mongoose = require('mongoose');

const questionHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    answer: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['answered', 'failed', 'unanswerable'],
      default: 'answered',
      index: true,
    },
    cached: {
      type: Boolean,
      default: false,
    },
    responseMs: {
      type: Number,
      default: 0,
    },
    // Backwards compatibility alias
    responseTimeMs: {
      type: Number,
    },
    subject: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save to sync responseMs and responseTimeMs
questionHistorySchema.pre('save', function (next) {
  if (this.responseMs !== undefined && this.responseTimeMs === undefined) {
    this.responseTimeMs = this.responseMs;
  } else if (this.responseTimeMs !== undefined && this.responseMs === undefined) {
    this.responseMs = this.responseTimeMs;
  }
  next();
});

// Compound index for user question history ordered by date
questionHistorySchema.index({ user: 1, createdAt: -1 });
questionHistorySchema.index({ question: 1 });

module.exports = mongoose.model('QuestionHistory', questionHistorySchema);
