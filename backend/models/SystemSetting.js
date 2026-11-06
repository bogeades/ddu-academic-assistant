const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    sessionTimeout: {
      type: Number, // In minutes
      default: 120, // 2 hours
      min: 15,
      max: 1440,
    },
    passwordPolicy: {
      minLength: {
        type: Number,
        default: 8,
        min: 6,
      },
      requireNumbers: {
        type: Boolean,
        default: true,
      },
      requireSymbols: {
        type: Boolean,
        default: false,
      },
      requireUppercase: {
        type: Boolean,
        default: true,
      },
    },
    registrationEnabled: {
      type: Boolean,
      default: true,
    },
    materialApprovalRequired: {
      type: Boolean,
      default: false, // When true, materials require Dept Head approval (FR-DH05)
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    scheduledDowntimeNotice: {
      active: { type: Boolean, default: false },
      message: { type: String, default: '' },
      scheduledTime: { type: Date },
    },
    aiDailyQuotaPerUser: {
      type: Number,
      default: 100,
    },
    // University Official Assessment & Grading Policy (FR-L04)
    gradingPolicy: {
      weights: {
        classwork: { type: Number, default: 10, min: 0, max: 100 },
        quiz: { type: Number, default: 10, min: 0, max: 100 },
        midterm: { type: Number, default: 30, min: 0, max: 100 },
        finalExam: { type: Number, default: 50, min: 0, max: 100 },
      },
      scale: {
        type: [
          {
            grade: { type: String, required: true },
            minScore: { type: Number, required: true },
            gradePoint: { type: Number, required: true },
          },
        ],
        default: [
          { grade: 'A+', minScore: 90, gradePoint: 4.0 },
          { grade: 'A', minScore: 85, gradePoint: 4.0 },
          { grade: 'A-', minScore: 80, gradePoint: 3.75 },
          { grade: 'B+', minScore: 75, gradePoint: 3.5 },
          { grade: 'B', minScore: 70, gradePoint: 3.0 },
          { grade: 'B-', minScore: 65, gradePoint: 2.75 },
          { grade: 'C+', minScore: 60, gradePoint: 2.5 },
          { grade: 'C', minScore: 50, gradePoint: 2.0 },
          { grade: 'C-', minScore: 45, gradePoint: 1.75 },
          { grade: 'D', minScore: 40, gradePoint: 1.0 },
          { grade: 'F', minScore: 0, gradePoint: 0.0 },
        ],
      },
      passThreshold: { type: Number, default: 40 },
    },
    // Email / SMTP Settings (FR-A04, FR-S01)
    emailSettings: {
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      smtpSecure: { type: Boolean, default: false },
      smtpUser: { type: String, default: '' },
      smtpPass: { type: String, default: '' },
      emailFrom: { type: String, default: 'Dire Dawa University <no-reply@ddu.edu.et>' },
    },
  },
  {
    timestamps: true,
  }
);

// Helper static method to get active singleton settings
systemSettingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
