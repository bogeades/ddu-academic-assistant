const mongoose = require('mongoose');

const semesterCourseSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    courseCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    credits: {
      type: Number,
      required: true,
      default: 3,
    },
    grade: {
      type: String,
      required: true, // e.g. 'A+', 'A', 'B', 'C', 'D', 'F'
      trim: true,
    },
    gradePoint: {
      type: Number, // 4.0, 3.5, 3.0, etc.
      required: true,
      default: 4.0,
    },
  },
  { _id: false }
);

const semesterRecordSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // e.g., 'Year 1 Semester 1'
      trim: true,
    },
    academicYear: {
      type: String,
      default: '2025/2026',
      trim: true,
    },
    courses: [semesterCourseSchema],
    gpa: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 4.0,
    },
    creditsEarned: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const academicRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      unique: true,
      index: true,
    },
    semesters: [semesterRecordSchema],
    cgpa: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 4.0,
    },
    totalCredits: {
      type: Number,
      default: 0,
    },
    academicStanding: {
      type: String,
      enum: ['Very Great Distinction', 'Great Distinction', 'Distinction', 'Good Standing', 'Warning', 'Probation'],
      default: 'Good Standing',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Helper calculation method
academicRecordSchema.methods.calculateCGPA = function () {
  let totalGradePoints = 0;
  let totalCredits = 0;

  this.semesters.forEach((sem) => {
    let semCredits = 0;
    let semPoints = 0;
    sem.courses.forEach((c) => {
      semCredits += c.credits;
      semPoints += c.credits * c.gradePoint;
    });
    sem.creditsEarned = semCredits;
    sem.gpa = semCredits > 0 ? parseFloat((semPoints / semCredits).toFixed(2)) : 0;
    totalCredits += semCredits;
    totalGradePoints += semPoints;
  });

  this.totalCredits = totalCredits;
  this.cgpa = totalCredits > 0 ? parseFloat((totalGradePoints / totalCredits).toFixed(2)) : 0;
  
  if (this.cgpa >= 3.75) this.academicStanding = 'Very Great Distinction';
  else if (this.cgpa >= 3.5) this.academicStanding = 'Great Distinction';
  else if (this.cgpa >= 3.25) this.academicStanding = 'Distinction';
  else if (this.cgpa >= 2.0) this.academicStanding = 'Good Standing';
  else if (this.cgpa >= 1.75) this.academicStanding = 'Warning';
  else this.academicStanding = 'Probation';
  
  return this.cgpa;
};

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);
