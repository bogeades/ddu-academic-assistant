const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const aiGateway = require('../services/aiGateway');
const {
  User,
  SystemSetting,
  Course,
  CourseMaterial,
  Task,
  Quiz,
  QuizResult,
  Assignment,
  Submission,
  Announcement,
  Notification,
  Summary,
  Enrollment,
} = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'ddu_super_secret_jwt_key_2026_academic_assistant_cs_iot';

const studentId = '507f1f77bcf86cd799439011';
const otherStudentId = '507f1f77bcf86cd799439044';
const lecturerId = '507f1f77bcf86cd799439022';
const adminId = '507f1f77bcf86cd799439033';

const taskId = '507f1f77bcf86cd799439055';
const otherTaskId = '507f1f77bcf86cd799439066';
const materialId = '507f1f77bcf86cd799439077';
const assignmentId = '507f1f77bcf86cd799439088';
const submissionId = '507f1f77bcf86cd799439099';
const quizId = '507f1f77bcf86cd7994390aa';

const studentToken = jwt.sign({ id: studentId, role: 'student' }, JWT_SECRET);
const otherStudentToken = jwt.sign({ id: otherStudentId, role: 'student' }, JWT_SECRET);
const lecturerToken = jwt.sign({ id: lecturerId, role: 'lecturer' }, JWT_SECRET);
const adminToken = jwt.sign({ id: adminId, role: 'admin' }, JWT_SECRET);

describe('Phase 3 Complete Test Suite (FR-S05, FR-S06, FR-L02 to FR-L07, FR-S08)', () => {
  let mockStudent;
  let mockOtherStudent;
  let mockLecturer;
  let mockAdmin;
  let mockTask;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(SystemSetting, 'getSettings').mockResolvedValue({
      sessionTimeout: 120,
      maintenanceMode: false,
      scheduledDowntimeNotice: { active: false },
      materialApprovalRequired: false,
    });

    mockStudent = {
      _id: studentId,
      name: 'Abebe Bikila',
      email: 'student.cs@ddu.edu.et',
      studentId: 'DDU/14/001',
      department: 'Computer Science',
      role: 'student',
      status: 'active',
      populate: jest.fn().mockReturnThis(),
    };

    mockOtherStudent = {
      _id: otherStudentId,
      name: 'Tigist Assefa',
      email: 'tigist.cs@ddu.edu.et',
      studentId: 'DDU/14/002',
      department: 'Computer Science',
      role: 'student',
      status: 'active',
      populate: jest.fn().mockReturnThis(),
    };

    mockLecturer = {
      _id: lecturerId,
      name: 'Dr. Hailu Belay',
      email: 'lecturer.cs@ddu.edu.et',
      role: 'lecturer',
      status: 'active',
      populate: jest.fn().mockReturnThis(),
    };

    mockAdmin = {
      _id: adminId,
      name: 'Admin DDU',
      email: 'admin@ddu.edu.et',
      role: 'admin',
      status: 'active',
      populate: jest.fn().mockReturnThis(),
    };

    mockTask = {
      _id: taskId,
      user: studentId,
      title: 'Review Chapter 5 Sorting Algorithms',
      completed: false,
      save: jest.fn().mockResolvedValue(true),
    };

    // Mock User.findById for auth middleware
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      let userObj = mockStudent;
      if (idStr === lecturerId) userObj = mockLecturer;
      if (idStr === otherStudentId) userObj = mockOtherStudent;
      if (idStr === adminId) userObj = mockAdmin;

      return {
        populate: jest.fn().mockResolvedValue(userObj),
      };
    });

    // Mock User.find to prevent unmocked MongoDB query buffering
    jest.spyOn(User, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockStudent, mockOtherStudent]),
        }),
        lean: jest.fn().mockResolvedValue([mockStudent, mockOtherStudent]),
      }),
      lean: jest.fn().mockResolvedValue([mockStudent, mockOtherStudent]),
    });

    // Mock Course model to prevent query buffering
    jest.spyOn(Course, 'findOne').mockResolvedValue(null);
    jest.spyOn(Course, 'findById').mockResolvedValue(null);

    // Mock Enrollment model to prevent query buffering
    jest.spyOn(Enrollment, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    // Mock Notification insertions
    jest.spyOn(Notification, 'insertMany').mockResolvedValue([]);
    jest.spyOn(Notification, 'create').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================
  // 1. Course Materials (FR-S05, FR-L02, FR-L07)
  // ==========================================
  describe('1. Course Materials (FR-S05, FR-L02, FR-L07)', () => {
    it('should reject student attempting to upload course material with 403 (RBAC)', async () => {
      const res = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Unauthorized Material', courseCode: 'COSC2041' });

      expect(res.status).toBe(403);
    });

    it('should allow lecturer to upload material file and metadata (FR-L02)', async () => {
      const mockMaterial = {
        _id: materialId,
        title: 'Binary Search Trees & AVL',
        subject: 'Data Structures',
        courseCode: 'COSC2041',
        uploadedBy: lecturerId,
        approvalStatus: 'approved',
      };
      jest.spyOn(CourseMaterial, 'create').mockResolvedValue(mockMaterial);

      const res = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .field('title', 'Binary Search Trees & AVL')
        .field('subject', 'Data Structures')
        .field('courseCode', 'COSC2041')
        .attach('file', Buffer.from('Binary search tree lecture content'), 'trees.txt');

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });

    it('should return materials search results in sub-2 seconds (FR-S05)', async () => {
      const startTime = Date.now();
      const mockList = [
        {
          _id: materialId,
          title: 'Binary Search Trees',
          subject: 'Data Structures',
          courseCode: 'COSC2041',
          approvalStatus: 'approved',
        },
      ];

      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockList),
      };

      jest.spyOn(CourseMaterial, 'find').mockReturnValue(queryMock);
      jest.spyOn(CourseMaterial, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/materials?q=Binary&courseCode=COSC2041')
        .set('Authorization', `Bearer ${studentToken}`);

      const elapsedMs = Date.now() - startTime;
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(elapsedMs).toBeLessThan(2000); // Sub-2s latency verification
    });

    it('should trigger AI summarization of uploaded material (FR-L07)', async () => {
      const mockMaterial = {
        _id: materialId,
        title: 'Network Layers Overview',
        subject: 'Networking',
        courseCode: 'COSC4112',
        description: 'Comprehensive overview of the OSI 7 layer architecture.',
        filePath: null,
      };
      jest.spyOn(CourseMaterial, 'findById').mockResolvedValue(mockMaterial);
      jest.spyOn(aiGateway, 'summarize').mockResolvedValue({
        overview: 'Overview of OSI 7 layer model.',
        keyPoints: ['Physical layer handles bits', 'Data link handles frames'],
        keyTerms: [{ term: 'TCP', definition: 'Transmission Control Protocol' }],
      });
      jest.spyOn(Summary, 'create').mockResolvedValue({
        _id: 'sum-1',
        title: 'Summary: Network Layers Overview',
      });

      const res = await request(app)
        .post(`/api/materials/${materialId}/summarize`)
        .set('Authorization', `Bearer ${lecturerToken}`);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toBeDefined();
    });
  });

  // ==========================================
  // 2. Task Manager (FR-S06)
  // ==========================================
  describe('2. Student Task Manager (FR-S06)', () => {
    it('should allow student to create a personal task with deadline', async () => {
      const deadline = new Date(Date.now() + 86400000).toISOString();
      jest.spyOn(Task, 'create').mockResolvedValue({
        _id: taskId,
        user: studentId,
        title: 'Review Chapter 5 Sorting Algorithms',
        deadline: new Date(deadline),
        completed: false,
      });

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Review Chapter 5 Sorting Algorithms',
          deadline,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Review Chapter 5 Sorting Algorithms');
    });

    it('should toggle task completion status', async () => {
      jest.spyOn(Task, 'findOne').mockResolvedValue(mockTask);

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ completed: true });

      expect(res.status).toBe(200);
      expect(mockTask.completed).toBe(true);
      expect(mockTask.save).toHaveBeenCalled();
    });

    it('should isolate tasks: reject student editing task belonging to another student', async () => {
      // Query searches for { _id: otherTaskId, user: studentId } which returns null
      jest.spyOn(Task, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .put(`/api/tasks/${otherTaskId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Attempted Hijack' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found or access denied/i);
    });
  });

  // ==========================================
  // 3. Quizzes Management (FR-L03, FR-S07)
  // ==========================================
  describe('3. Quizzes Management (FR-L03, FR-S07)', () => {
    it('should allow lecturer to create quiz manually with questions and dispatch notifications on publish', async () => {
      const mockQuiz = {
        _id: quizId,
        title: 'Midterm Practice Quiz',
        courseCode: 'COSC2041',
        topic: 'Graph Theory',
        published: true,
        maxScore: 10,
        questions: [
          {
            type: 'mcq',
            text: 'What algorithm finds shortest paths in weighted graphs?',
            options: ['Dijkstra', 'DFS', 'Kruskal', 'Binary Search'],
            correctAnswer: 'Dijkstra',
            maxScore: 5,
          },
          {
            type: 'short',
            text: 'Define a connected graph.',
            modelAnswer: 'A graph where every pair of vertices is connected by a path.',
            maxScore: 5,
          },
        ],
      };

      jest.spyOn(Quiz, 'create').mockResolvedValue(mockQuiz);

      const res = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          title: 'Midterm Practice Quiz',
          courseCode: 'COSC2041',
          topic: 'Graph Theory',
          published: true,
          questions: mockQuiz.questions,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.published).toBe(true);
    });
  });

  // ==========================================
  // 4. Assignments & Submissions (FR-L03, FR-S08)
  // ==========================================
  describe('4. Assignments & Submissions (FR-L03, FR-S08)', () => {
    it('should allow lecturer to create assignment with deadline and late policy', async () => {
      const deadline = new Date(Date.now() + 172800000).toISOString();
      const mockAssignment = {
        _id: assignmentId,
        title: 'Lab 1: Red-Black Trees',
        instructions: 'Implement insertion and rebalancing.',
        courseCode: 'COSC2041',
        deadline: new Date(deadline),
        maxScore: 25,
        allowLate: false,
        published: true,
      };

      jest.spyOn(Assignment, 'create').mockResolvedValue(mockAssignment);

      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          title: 'Lab 1: Red-Black Trees',
          instructions: 'Implement insertion and rebalancing.',
          courseCode: 'COSC2041',
          deadline,
          maxScore: 25,
          allowLate: false,
          published: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allowLate).toBe(false);
    });

    it('should reject student submission when deadline has passed and allowLate is false', async () => {
      const pastDeadline = new Date(Date.now() - 86400000); // 1 day ago
      const mockAssignment = {
        _id: assignmentId,
        title: 'Past Strict Assignment',
        deadline: pastDeadline,
        allowLate: false,
        published: true,
      };

      jest.spyOn(Assignment, 'findById').mockResolvedValue(mockAssignment);

      const res = await request(app)
        .post(`/api/submissions/${assignmentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ textAnswer: 'Late solution submission.' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/deadline has passed/i);
    });

    it('should accept student submission and flag isLate=true when allowLate is true', async () => {
      const pastDeadline = new Date(Date.now() - 86400000);
      const mockAssignment = {
        _id: assignmentId,
        title: 'Late Permitted Assignment',
        deadline: pastDeadline,
        allowLate: true,
        published: true,
      };
      const mockSavedSubmission = {
        _id: submissionId,
        assignment: assignmentId,
        student: studentId,
        textAnswer: 'My submitted work',
        isLate: true,
        status: 'submitted',
      };

      jest.spyOn(Assignment, 'findById').mockResolvedValue(mockAssignment);
      jest.spyOn(Submission, 'findOne').mockResolvedValue(null);
      jest.spyOn(Submission, 'findOneAndUpdate').mockResolvedValue(mockSavedSubmission);

      const res = await request(app)
        .post(`/api/submissions/${assignmentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ textAnswer: 'My submitted work' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isLate).toBe(true);
    });
  });

  // ==========================================
  // 5. Grading & AI Evaluation (FR-L04)
  // ==========================================
  describe('5. Grading & AI Assistance (FR-L04)', () => {
    it('should generate AI grading suggestion without marking submission as graded', async () => {
      const mockSubmission = {
        _id: submissionId,
        assignment: {
          _id: assignmentId,
          title: 'Lab 1',
          instructions: 'Implement QuickSort.',
          maxScore: 20,
          createdBy: lecturerId,
        },
        student: { _id: studentId, name: 'Abebe Bikila', email: 'student.cs@ddu.edu.et' },
        textAnswer: 'QuickSort implementation with Lomuto partition.',
        status: 'submitted',
        aiSuggestedGrade: null,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Submission, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockSubmission),
        }),
      });

      jest.spyOn(aiGateway, 'evaluateShortAnswer').mockResolvedValue({
        score: 0.9,
        feedback: 'Correct algorithmic logic with efficient pivot selection.',
      });

      const res = await request(app)
        .post(`/api/submissions/${submissionId}/ai-grade`)
        .set('Authorization', `Bearer ${lecturerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.suggestion.score).toBe(18); // 0.9 * 20
      expect(mockSubmission.status).toBe('submitted'); // NOT marked as final graded!
    });

    it('should enforce numerical bounds on grade (reject score < 0 or > maxScore)', async () => {
      const mockSubmission = {
        _id: submissionId,
        assignment: { maxScore: 20, createdBy: lecturerId },
        student: { _id: studentId, email: 'student.cs@ddu.edu.et' },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Submission, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockSubmission),
        }),
      });

      // Attempt score 25 on 20 maxScore
      const resHigh = await request(app)
        .patch(`/api/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ grade: 25, feedback: 'Too high' });

      expect(resHigh.status).toBe(400);

      // Attempt negative score
      const resNeg = await request(app)
        .patch(`/api/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ grade: -5, feedback: 'Negative' });

      expect(resNeg.status).toBe(400);
    });

    it('should save valid instructor grade and notify student (FR-L04)', async () => {
      const mockSubmission = {
        _id: submissionId,
        assignment: { title: 'Lab 1', maxScore: 20, createdBy: lecturerId },
        student: { _id: studentId, name: 'Abebe Bikila', email: 'student.cs@ddu.edu.et' },
        grade: null,
        feedback: null,
        status: 'submitted',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Submission, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockSubmission),
        }),
      });

      const res = await request(app)
        .patch(`/api/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ grade: 19, feedback: 'Flawless analysis.' });

      expect(res.status).toBe(200);
      expect(mockSubmission.grade).toBe(19);
      expect(mockSubmission.status).toBe('graded');
      expect(mockSubmission.save).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 6. Student Progress Monitoring (FR-L06)
  // ==========================================
  describe('6. Student Progress Monitoring (FR-L06)', () => {
    it('should calculate class metrics, completion rates, and at-risk students accurately', async () => {
      const mockQuizzes = [{ _id: quizId, courseCode: 'COSC2041', published: true }];
      const mockAssignments = [{ _id: assignmentId, courseCode: 'COSC2041', published: true, maxScore: 20 }];

      jest.spyOn(Quiz, 'find').mockReturnValue({ lean: jest.fn().mockResolvedValue(mockQuizzes) });
      jest.spyOn(Assignment, 'find').mockReturnValue({ lean: jest.fn().mockResolvedValue(mockAssignments) });

      // Student 1: 90% Quiz, 18/20 (90%) Assignment -> Overall 90% (Not at risk)
      // Student 2: 40% Quiz, 6/20 (30%) Assignment -> Overall 35% (At risk!)
      const mockQuizResults = [
        { quiz: quizId, student: mockStudent, percentage: 90 },
        { quiz: quizId, student: mockOtherStudent, percentage: 40 },
      ];
      const mockSubmissions = [
        { assignment: { _id: assignmentId, maxScore: 20 }, student: mockStudent, grade: 18, status: 'graded' },
        { assignment: { _id: assignmentId, maxScore: 20 }, student: mockOtherStudent, grade: 6, status: 'graded' },
      ];

      jest.spyOn(QuizResult, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockQuizResults),
        }),
      });

      jest.spyOn(Submission, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockSubmissions),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/lecturer/progress?courseCode=COSC2041')
        .set('Authorization', `Bearer ${lecturerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.courseCode).toBe('COSC2041');
      expect(data.totalStudents).toBe(2);
      expect(data.classQuizAverage).toBe(65); // (90 + 40) / 2
      expect(data.atRiskCount).toBe(1); // mockOtherStudent is at risk (< 50%)
    });
  });

  // ==========================================
  // 7. Announcements (FR-L05)
  // ==========================================
  describe('7. Course Announcements (FR-L05)', () => {
    it('should allow lecturer to post course announcement and notify enrolled students', async () => {
      const mockAnnouncement = {
        _id: '507f1f77bcf86cd7994390ee',
        courseCode: 'COSC2041',
        title: 'Midterm Room Assignment',
        message: 'Exam will take place in ICT Lab 304.',
        isUrgent: true,
      };

      jest.spyOn(Announcement, 'create').mockResolvedValue(mockAnnouncement);

      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          courseCode: 'COSC2041',
          title: 'Midterm Room Assignment',
          message: 'Exam will take place in ICT Lab 304.',
          isUrgent: true,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isUrgent).toBe(true);
    });
  });
});
