const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: [true, 'Course code is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lecturer reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Announcement message is required'],
      trim: true,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ courseCode: 1, createdAt: -1 });
announcementSchema.index({ lecturer: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
