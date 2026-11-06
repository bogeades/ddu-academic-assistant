const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Backup filename is required'],
      unique: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    sizeBytes: {
      type: Number,
      default: 0,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    errorLog: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

backupSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Backup', backupSchema);
