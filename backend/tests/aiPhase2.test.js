const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const aiGateway = require('../services/aiGateway');
const { User, SystemSetting, QuestionHistory, Summary, Quiz, QuizResult } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'ddu_super_secret_jwt_key_2026_academic_assistant_cs_iot';

// Generate valid tokens
const studentId = '507f1f77bcf86cd799439011';
const lecturerId = '507f1f77bcf86cd799439022';
const adminId = '507f1f77bcf86cd799439033';

const studentToken = jwt.sign({ id: studentId, role: 'student' }, JWT_SECRET);
const lecturerToken = jwt.sign({ id: lecturerId, role: 'lecturer' }, JWT_SECRET);
const adminToken = jwt.sign({ id: adminId, role: 'admin' }, JWT_SECRET);

describe('Phase 2 AI Endpoints & Business Logic Test Suite', () => {
  let mockStudent;
  let mockLecturer;
  let mockAdmin;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SystemSetting singleton to prevent unmocked MongoDB buffering
    jest.spyOn(SystemSetting, 'getSettings').mockResolvedValue({
      sessionTimeout: 120,
      maintenanceMode: false,
      scheduledDowntimeNotice: { active: false },
    });

    mockStudent = {
      _id: studentId,
      name: 'Abebe Bikila',
      email: 'student.cs@ddu.edu.et',
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

    // Mock User.findById for auth middleware
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      let userObj = mockStudent;
      if (idStr === lecturerId) userObj = mockLecturer;
      if (idStr === adminId) userObj = mockAdmin;

      return {
        populate: jest.fn().mockResolvedValue(userObj),
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. POST /api/ai/ask (FR-S03, FR-AI01, FR-AI05)', () => {
    it('should successfully answer an academic question and log history as answered', async () => {
      const mockHistory = {
        _id: 'history-123',
        user: studentId,
        question: 'What is the time complexity of QuickSort?',
        answer: '',
        status: 'answered',
        responseMs: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(QuestionHistory, 'create').mockResolvedValue(mockHistory);
      jest.spyOn(aiGateway, 'answerQuestion').mockResolvedValue({
        answer: 'QuickSort has an average time complexity of O(n log n) and worst-case O(n^2).',
        cached: false,
        responseMs: 120,
      });

      const res = await request(app)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: 'What is the time complexity of QuickSort?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answer).toContain('O(n log n)');
      expect(mockHistory.save).toHaveBeenCalled();
      expect(mockHistory.status).toBe('answered');
    });

    it('should handle CANNOT_ANSWER by setting status to unanswerable with friendly advice', async () => {
      const mockHistory = {
        _id: 'history-456',
        user: studentId,
        question: 'Who will win the Premier League?',
        answer: '',
        status: 'answered',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(QuestionHistory, 'create').mockResolvedValue(mockHistory);
      jest.spyOn(aiGateway, 'answerQuestion').mockResolvedValue({
        answer: 'CANNOT_ANSWER',
        cached: false,
        responseMs: 50,
      });

      const res = await request(app)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: 'Who will win the Premier League?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('unanswerable');
      expect(res.body.data.answer).toContain('could not find a verified academic answer');
      expect(mockHistory.status).toBe('unanswerable');
    });

    it('should preserve QuestionHistory with status failed when external AI fails (FR-AI05)', async () => {
      const mockHistory = {
        _id: 'history-789',
        user: studentId,
        question: 'Explain AVL tree balance factors.',
        status: 'answered',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(QuestionHistory, 'create').mockResolvedValue(mockHistory);
      jest.spyOn(aiGateway, 'answerQuestion').mockRejectedValue(new Error('AI Gateway Timeout'));

      const res = await request(app)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ question: 'Explain AVL tree balance factors.' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('failed');
      expect(mockHistory.status).toBe('failed');
    });
  });

  describe('2. POST /api/ai/summarize (FR-S04, FR-L07, FR-AI02)', () => {
    it('should summarize pasted academic text and save summary', async () => {
      jest.spyOn(aiGateway, 'summarize').mockResolvedValue({
        overview: 'Overview of Dijkstra algorithm.',
        keyPoints: ['Uses priority queue', 'Non-negative edges'],
        keyTerms: [{ term: 'Shortest Path', definition: 'Minimal cost route' }],
        summaryText: 'Complete markdown summary of Dijkstra algorithm.',
      });

      jest.spyOn(Summary, 'create').mockImplementation((doc) =>
        Promise.resolve({ _id: 'sum-123', ...doc })
      );

      const res = await request(app)
        .post('/api/ai/summarize')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Dijkstra Algorithm Notes',
          text: 'Dijkstra algorithm finds the shortest path from a starting node to all other nodes in a weighted graph.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Dijkstra Algorithm Notes');
      expect(res.body.data.summaryText).toContain('Dijkstra');
    });

    it('should summarize an uploaded text file', async () => {
      jest.spyOn(aiGateway, 'summarize').mockResolvedValue({
        overview: 'Overview of operating systems.',
        keyPoints: ['Process scheduling', 'Deadlock prevention'],
        keyTerms: [],
        summaryText: 'Summary of Operating Systems principles.',
      });

      jest.spyOn(Summary, 'create').mockImplementation((doc) =>
        Promise.resolve({ _id: 'sum-456', ...doc })
      );

      const res = await request(app)
        .post('/api/ai/summarize')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .attach('file', Buffer.from('Operating systems manage hardware resources and process execution.'), 'os-notes.txt')
        .field('title', 'OS Notes');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. POST /api/ai/quizzes/generate (FR-AI03)', () => {
    it('should generate quiz questions and save quiz record', async () => {
      const mockQuestions = [
        {
          type: 'mcq',
          text: 'What is the worst-case time complexity of MergeSort?',
          options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'],
          correctAnswer: 'O(n log n)',
          explanation: 'MergeSort always divides and merges in O(n log n).',
          maxScore: 1,
        },
        {
          type: 'short',
          text: 'Explain the principle of Divide and Conquer.',
          options: [],
          correctAnswer: 'Divide problem into subproblems, conquer recursively, and combine results.',
          explanation: 'Key points: divide, conquer, combine.',
          maxScore: 2,
        },
      ];

      jest.spyOn(aiGateway, 'generateQuiz').mockResolvedValue(mockQuestions);
      jest.spyOn(Quiz, 'create').mockImplementation((doc) =>
        Promise.resolve({ _id: 'quiz-123', ...doc })
      );

      const res = await request(app)
        .post('/api/ai/quizzes/generate')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({
          topic: 'Sorting Algorithms',
          courseCode: 'COSC2041',
          count: 2,
          publish: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.questions).toHaveLength(2);
      expect(res.body.data.published).toBe(true);
    });
  });

  describe('4. POST /api/ai/quizzes/:id/submit & Grading (FR-S07, FR-AI04)', () => {
    const mockQuiz = {
      _id: 'quiz-999',
      title: 'Algorithm Quiz',
      questions: [
        {
          _id: 'q1-id',
          type: 'mcq',
          text: 'What is O(1)?',
          options: ['Constant time', 'Linear time'],
          correctAnswer: 'Constant time',
          maxScore: 1,
        },
        {
          _id: 'q2-id',
          type: 'short',
          text: 'Define a Hash Table.',
          options: [],
          correctAnswer: 'A data structure that maps keys to values using a hash function.',
          maxScore: 2,
        },
      ],
    };

    it('should grade MCQ locally and short answers via AI Gateway', async () => {
      jest.spyOn(Quiz, 'findById').mockResolvedValue(mockQuiz);
      jest.spyOn(aiGateway, 'evaluateShortAnswer').mockResolvedValue({
        score: 1.0,
        feedback: 'Complete and accurate definition.',
      });

      jest.spyOn(QuizResult, 'create').mockImplementation((doc) =>
        Promise.resolve({ _id: 'result-123', ...doc })
      );

      const res = await request(app)
        .post('/api/ai/quizzes/quiz-999/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          answers: [
            { questionId: 'q1-id', answer: 'Constant time' },
            { questionId: 'q2-id', answer: 'A data structure that maps keys to values with a hash function.' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(3); // 1 pt MCQ + 2 pts Short
      expect(res.body.data.percentage).toBe(100);
    });

    it('should gracefully handle offline AI fallback without blocking the student', async () => {
      jest.spyOn(Quiz, 'findById').mockResolvedValue(mockQuiz);
      jest.spyOn(aiGateway, 'evaluateShortAnswer').mockRejectedValue(new Error('AI Service Offline'));

      jest.spyOn(QuizResult, 'create').mockImplementation((doc) =>
        Promise.resolve({ _id: 'result-fallback', ...doc })
      );

      const res = await request(app)
        .post('/api/ai/quizzes/quiz-999/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          answers: [
            { questionId: 'q1-id', answer: 'Constant time' },
            { questionId: 'q2-id', answer: 'Mapping keys to values.' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(1); // 1 pt MCQ earned, short answer gets 0 in fallback
      expect(res.body.data.feedback).toContain('short-answer questions could not be graded automatically');
    });
  });

  describe('5. RBAC & Security Access Controls', () => {
    it('should prohibit lecturer from submitting quiz answers (student only)', async () => {
      const res = await request(app)
        .post('/api/ai/quizzes/quiz-999/submit')
        .set('Authorization', `Bearer ${lecturerToken}`)
        .send({ answers: [] });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not authorized');
    });

    it('should prohibit student from publishing a quiz (lecturer/admin only)', async () => {
      const res = await request(app)
        .patch('/api/ai/quizzes/quiz-999/publish')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ published: true });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not authorized');
    });

    it('should allow only admin on /api/ai/health', async () => {
      // Student gets 403
      const studentRes = await request(app)
        .get('/api/ai/health')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(studentRes.status).toBe(403);

      // Lecturer gets 403
      const lecturerRes = await request(app)
        .get('/api/ai/health')
        .set('Authorization', `Bearer ${lecturerToken}`);
      expect(lecturerRes.status).toBe(403);

      // Admin gets 200
      jest.spyOn(aiGateway, 'health').mockReturnValue({
        configured: true,
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        totalCalls: 10,
        failures: 0,
        cacheHits: 4,
        averageLatency: 45,
      });

      const adminRes = await request(app)
        .get('/api/ai/health')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.provider).toBe('gemini');
    });
  });
});
