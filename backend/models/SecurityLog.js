const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action name is required'],
      index: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'warning'],
      default: 'success',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

securityLogSchema.index({ timestamp: -1 });
securityLogSchema.index({ user: 1, action: 1 });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
