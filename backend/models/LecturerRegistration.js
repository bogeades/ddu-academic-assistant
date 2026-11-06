const mongoose = require('mongoose');

const lecturerRegistrationSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: [true, 'Registration reference ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    lecturerId: {
      type: String,
      required: [true, 'Lecturer ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true,
    },
    academicQualification: {
      type: String,
      trim: true,
      default: 'Lecturer',
    },
    specialization: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Registrar ID is required'],
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    createdUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    invitationEmailSent: {
      type: Boolean,
      default: false,
    },
    invitationEmailSentAt: {
      type: Date,
    },
    activationStatus: {
      type: String,
      enum: ['pending', 'activated'],
      default: 'pending',
    },
    activatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to populate fullName
lecturerRegistrationSchema.pre('save', function (next) {
  const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
  this.fullName = parts.join(' ').trim();
  next();
});

module.exports = mongoose.model('LecturerRegistration', lecturerRegistrationSchema);
