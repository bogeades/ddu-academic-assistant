const {
  getAIGradeSuggestion,
  gradeSubmission,
} = require('../controllers/submission.controller');
const { updateSemesterRecord } = require('../controllers/record.controller');
const { Submission, AcademicRecord, User } = require('../models');

jest.mock('../models', () => {
  return {
    Submission: {
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
    AcademicRecord: {
      findOne: jest.fn(),
    },
    User: {
      findById: jest.fn(),
    },
    Notification: {
      create: jest.fn().mockResolvedValue(true),
    },
  };
});

describe('Phase 3 & 4: Grading & Academic Record Test Suite (FR-L04, FR-R04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate AI-assisted grade suggestion for student submission (FR-L04)', async () => {
    const mockSubmission = {
      _id: 'sub-id-1',
      submissionText: 'Implemented QuickSort with O(n log n) average time complexity using divide and conquer.',
      assignment: {
        instructions: 'Implement QuickSort in Python with runtime analysis.',
        maxScore: 20,
      },
      student: { name: 'Yared Getachew' },
      save: jest.fn().mockResolvedValue(true),
    };

    Submission.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSubmission),
      }),
    });

    const req = {
      params: { submissionId: 'sub-id-1' },
      user: { _id: 'lecturer-id', role: 'lecturer' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await getAIGradeSuggestion(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        suggestion: expect.objectContaining({
          score: expect.any(Number),
          maxScore: 20,
          feedback: expect.any(String),
        }),
      })
    );
  });

  it('should record instructor grade, update status to graded, and notify student (FR-L04)', async () => {
    const mockSubmission = {
      _id: 'sub-id-1',
      assignment: { title: 'Algorithm Lab 1', maxScore: 20 },
      student: { _id: 'student-id-1', name: 'Yared Getachew', email: 'student.cs@ddu.edu.et' },
      grade: null,
      feedback: null,
      status: 'submitted',
      save: jest.fn().mockResolvedValue(true),
    };

    Submission.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSubmission),
      }),
    });

    const req = {
      params: { submissionId: 'sub-id-1' },
      user: { _id: 'lecturer-id', role: 'lecturer' },
      body: {
        grade: 19,
        feedback: 'Excellent implementation and clean algorithmic analysis.',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await gradeSubmission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSubmission.grade).toBe(19);
    expect(mockSubmission.status).toBe('graded');
    expect(mockSubmission.save).toHaveBeenCalled();
  });

  it('should calculate semester GPA and cumulative CGPA correctly (FR-R04)', async () => {
    const mockStudent = { _id: 'student-id-1', name: 'Yared Getachew' };
    User.findById.mockResolvedValue(mockStudent);

    const mockRecord = {
      student: 'student-id-1',
      semesters: [],
      cgpa: 0,
      totalCredits: 0,
      calculateCGPA: function () {
        let totalPts = 0;
        let totalCr = 0;
        this.semesters.forEach((sem) => {
          let semCr = 0;
          let semPts = 0;
          sem.courses.forEach((c) => {
            semCr += c.credits;
            semPts += c.credits * c.gradePoint;
          });
          sem.gpa = parseFloat((semPts / semCr).toFixed(2));
          totalCr += semCr;
          totalPts += semPts;
        });
        this.totalCredits = totalCr;
        this.cgpa = parseFloat((totalPts / totalCr).toFixed(2));
        return this.cgpa;
      },
      save: jest.fn().mockResolvedValue(true),
    };

    AcademicRecord.findOne.mockResolvedValue(mockRecord);

    const req = {
      params: { studentId: 'student-id-1' },
      user: { _id: 'registrar-id', role: 'registrar' },
      body: {
        semesterName: 'Year 3 Semester 1',
        academicYear: '2025/2026',
        courses: [
          { courseCode: 'COSC3072', courseName: 'Artificial Intelligence', credits: 4, grade: 'A' },
          { courseCode: 'COSC3081', courseName: 'Database Systems', credits: 4, grade: 'B+' },
        ],
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await updateSemesterRecord(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    // Grade A is 4.0, B+ is 3.5. (4*4 + 4*3.5)/8 = (16+14)/8 = 30/8 = 3.75
    expect(mockRecord.cgpa).toBe(3.75);
    expect(mockRecord.totalCredits).toBe(8);
  });
});
