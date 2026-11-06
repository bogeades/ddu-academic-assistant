const mongoose = require('mongoose');

const lecturerAssignmentSchema = new mongoose.Schema(
  {
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lecturer reference is required'],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true,
    },
    academicYear: {
      type: Number,
      required: [true, 'Academic year is required (1-5)'],
      min: 1,
      max: 5,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required (1 or 2)'],
      min: 1,
      max: 2,
    },
    section: {
      type: String,
      required: [true, 'Section is required (e.g., A, B, C)'],
      trim: true,
      uppercase: true,
    },
    courseDescription: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected'],
      default: 'pending_approval',
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per lecturer/course/year/sem/section
lecturerAssignmentSchema.index(
  { course: 1, academicYear: 1, semester: 1, section: 1 },
  { name: 'course_class_unique' }
);

module.exports = mongoose.model('LecturerAssignment', lecturerAssignmentSchema);
