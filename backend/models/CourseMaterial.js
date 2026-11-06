const mongoose = require('mongoose');

const courseMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Material title is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject or topic is required'],
      trim: true,
    },
    courseCode: {
      type: String,
      required: [true, 'Course code is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Material delivery type: PDF document or typed/copy-pasted lecture text (FR-L03)
    materialType: {
      type: String,
      enum: ['pdf', 'text'],
      default: 'pdf',
      index: true,
    },
    textContent: {
      type: String,
      trim: true,
      default: '',
    },
    courseDescriptionOverride: {
      type: String,
      trim: true,
      default: '',
    },
    // Target class restriction (Department, Academic Year, Semester, Section)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    academicYear: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
      index: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 2,
      default: 1,
      index: true,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ALL',
      index: true,
    },
    fileName: {
      type: String,
      trim: true,
      default: 'lecture_material',
    },
    filePath: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    size: {
      type: Number, // in bytes
      default: 0,
      min: 0,
    },
    // Backwards-compatible aliases
    originalFilename: {
      type: String,
    },
    fileType: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader reference is required'],
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'flagged'],
      default: 'approved',
      index: true,
    },
    flagReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save to sync aliases
courseMaterialSchema.pre('save', function (next) {
  if (this.fileName && !this.originalFilename) {
    this.originalFilename = this.fileName;
  }
  if (this.size !== undefined && this.fileSize === undefined) {
    this.fileSize = this.size;
  }
  if (!this.fileUrl && this._id) {
    this.fileUrl = `/api/materials/${this._id}/download`;
  }
  next();
});

// Text index on title and subject for search queries (FR-S05)
courseMaterialSchema.index({ title: 'text', subject: 'text', courseCode: 'text' });
// Compound index for filtering
courseMaterialSchema.index({ approvalStatus: 1, courseCode: 1, createdAt: -1 });

module.exports = mongoose.model('CourseMaterial', courseMaterialSchema);
