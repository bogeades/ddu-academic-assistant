const { enrollCourse, dropCourse } = require('../controllers/enrollment.controller');
const { Course, Enrollment, AcademicRecord } = require('../models');

jest.mock('../models', () => {
  return {
    Course: {
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    },
    Enrollment: {
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      }),
      create: jest.fn(),
      findById: jest.fn(),
    },
    AcademicRecord: {
      findOne: jest.fn(),
    },
  };
});

describe('Phase 4: Course Enrollment Test Suite (FR-S08, FR-R03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Enrollment.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });
  });

  it('should successfully enroll student when prerequisites are satisfied and capacity is available', async () => {
    const mockCourse = {
      _id: 'course-id-ai',
      code: 'COSC3072',
      name: 'Artificial Intelligence',
      capacity: 50,
      enrolledCount: 20,
      prerequisites: ['COSC2041'],
    };

    Course.findById.mockResolvedValue(mockCourse);
    Enrollment.findOne.mockResolvedValue(null); // No previous enrollment

    // Student has completed prerequisite COSC2041 with grade A
    AcademicRecord.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        semesters: [
          {
            courses: [
              { courseCode: 'COSC2041', grade: 'A', credits: 4 },
            ],
          },
        ],
      }),
    });

    // Atomic capacity increment succeeds
    Course.findOneAndUpdate.mockResolvedValue({
      ...mockCourse,
      enrolledCount: 21,
    });

    Enrollment.create.mockResolvedValue({
      _id: 'enrollment-id-1',
      student: 'student-id-1',
      course: 'course-id-ai',
      semester: '2026-Semester-1',
      status: 'enrolled',
    });

    const req = {
      user: { _id: 'student-id-1', role: 'student' },
      body: {
        courseId: 'course-id-ai',
        semester: '2026-Semester-1',
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await enrollCourse(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringMatching(/Successfully enrolled/i),
      })
    );
  });

  it('should block enrollment when prerequisites are NOT met (FR-R03)', async () => {
    const mockCourse = {
      _id: 'course-id-ai',
      code: 'COSC3072',
      name: 'Artificial Intelligence',
      capacity: 50,
      prerequisites: ['COSC2041'],
    };

    Course.findById.mockResolvedValue(mockCourse);
    Enrollment.findOne.mockResolvedValue(null);

    // Student has NOT completed prerequisite COSC2041
    AcademicRecord.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ semesters: [] }),
    });

    const req = {
      user: { _id: 'student-id-1', role: 'student' },
      body: { courseId: 'course-id-ai', semester: '2026-Semester-1' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await enrollCourse(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/Prerequisite validation failed/i),
      })
    );
  });

  it('should block enrollment when course reaches maximum capacity (FR-R03)', async () => {
    const mockCourse = {
      _id: 'course-id-full',
      code: 'COSC4112',
      capacity: 30,
      enrolledCount: 30,
      prerequisites: [],
    };

    Course.findById.mockResolvedValue(mockCourse);
    Enrollment.findOne.mockResolvedValue(null);
    AcademicRecord.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    // Atomic update fails because enrolledCount >= capacity
    Course.findOneAndUpdate.mockResolvedValue(null);

    const req = {
      user: { _id: 'student-id-1', role: 'student' },
      body: { courseId: 'course-id-full', semester: '2026-Semester-1' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await enrollCourse(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/maximum capacity/i),
      })
    );
  });
});
