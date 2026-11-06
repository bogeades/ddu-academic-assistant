const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['student', 'lecturer', 'registrar', 'deptHead', 'admin'],
      default: 'student',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'pending',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    studentId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    lecturerId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    academicQualification: {
      type: String,
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
      default: '',
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    registrationRef: {
      type: String,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    yearOfStudy: {
      type: Number,
      min: [1, 'Year of study must be at least 1'],
      max: [7, 'Year of study cannot exceed 7'],
      default: 1,
    },
    semester: {
      type: Number,
      min: [1, 'Semester must be 1 or 2'],
      max: [2, 'Semester must be 1 or 2'],
      default: 1,
    },
    section: {
      type: String,
      trim: true,
      default: 'A',
    },
    // Registrar student assignment workflow (FR-R01, FR-A02)
    assignmentStatus: {
      type: String,
      enum: ['none', 'pending_approval', 'approved', 'rejected'],
      default: 'none',
    },
    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    assignedYear: {
      type: Number,
      default: 1,
    },
    assignedSemester: {
      type: Number,
      default: 1,
    },
    assignedSection: {
      type: String,
      default: 'A',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: {
      type: Date,
    },
    assignmentApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignmentApprovedAt: {
      type: Date,
    },
    // Temporary password & first-time login security
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    tempPassword: {
      type: String,
      select: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationExpires: {
      type: Date,
      select: false,
    },
    otpCode: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
