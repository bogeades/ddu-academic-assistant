const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    credits: {
      type: Number,
      required: [true, 'Course credit hours is required'],
      default: 3,
      min: 1,
      max: 6,
    },
    prerequisites: [
      {
        type: String, // Course codes or Course ObjectIds
        trim: true,
      },
    ],
    capacity: {
      type: Number,
      required: [true, 'Course enrollment capacity is required'],
      default: 50,
      min: 1,
    },
    enrolledCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
    },
    semester: {
      type: Number,
      default: 1,
      min: 1,
      max: 2,
    },
    yearLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    academicYear: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Course', courseSchema);
