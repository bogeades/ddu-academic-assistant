const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      default: 'Document Summary',
      trim: true,
    },
    sourceName: {
      type: String,
      default: 'Direct Input',
      trim: true,
    },
    sourceLength: {
      type: Number,
      default: 0,
    },
    summaryText: {
      type: String,
      required: [true, 'Summary text is required'],
    },
    // Backwards-compatibility fields
    source: {
      type: String,
      trim: true,
    },
    originalTextLength: {
      type: Number,
    },
    keyPoints: [
      {
        type: String,
      },
    ],
    fileUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save to sync sourceName/source and sourceLength/originalTextLength
summarySchema.pre('save', function (next) {
  if (this.sourceName && !this.source) {
    this.source = this.sourceName;
  } else if (this.source && !this.sourceName) {
    this.sourceName = this.source;
  }
  if (this.sourceLength !== undefined && this.originalTextLength === undefined) {
    this.originalTextLength = this.sourceLength;
  } else if (this.originalTextLength !== undefined && this.sourceLength === undefined) {
    this.sourceLength = this.originalTextLength;
  }
  next();
});

module.exports = mongoose.model('Summary', summarySchema);
