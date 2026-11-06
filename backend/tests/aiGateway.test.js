const aiGateway = require('../services/aiGateway.service');
const { QuestionHistory, Summary } = require('../models');

// Mock models
jest.mock('../models', () => {
  const MockQuestionHistory = {
    create: jest.fn().mockImplementation((doc) => Promise.resolve({ _id: 'mock-q-id', ...doc })),
    findOne: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
    findOneAndDelete: jest.fn().mockResolvedValue({ _id: 'deleted-id' }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }),
  };

  const MockSummary = {
    create: jest.fn().mockImplementation((doc) => Promise.resolve({ _id: 'mock-s-id', ...doc })),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
    findOne: jest.fn(),
  };

  const MockEnrollment = {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
  };

  return {
    QuestionHistory: MockQuestionHistory,
    Summary: MockSummary,
    Enrollment: MockEnrollment,
    Course: { find: jest.fn() },
    User: { findById: jest.fn() },
    SystemSetting: {
      getSettings: jest.fn().mockResolvedValue({ sessionTimeout: 120 }),
    },
    SecurityLog: { create: jest.fn() },
  };
});

describe('Phase 2: AI Gateway & Student AI Features Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FR-S03, FR-AI01, FR-AI05: Academic Question Answering & Caching', () => {
    it('should answer an academic computer science question within performance constraints (< 5s)', async () => {
      const startTime = Date.now();
      const result = await aiGateway.askAcademicQuestion(
        'What is an algorithm and its time complexity in Computer Science?',
        'Data Structures Course',
        '507f1f77bcf86cd799439011'
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // NFR: answer within 5 seconds
      expect(result).toHaveProperty('answer');
      expect(result.answer).toContain('algorithm');
      expect(result.answer).toContain('Big-O');
      expect(QuestionHistory.create).toHaveBeenCalled();
    });

    it('should utilize cached answer on repeated query (< 2s search/hit requirement)', async () => {
      // First call (populates cache)
      await aiGateway.askAcademicQuestion(
        'Explain binary search tree properties',
        'Data Structures',
        '507f1f77bcf86cd799439011'
      );

      // Second identical query (cache hit)
      const startTime = Date.now();
      const cachedResult = await aiGateway.askAcademicQuestion(
        'Explain binary search tree properties',
        'Data Structures',
        '507f1f77bcf86cd799439011'
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Fast cache hit
      expect(cachedResult.source).toBe('cache');
    });

    it('should handle question history logging with user reference', async () => {
      await aiGateway.askAcademicQuestion(
        'What is ACID in database systems?',
        'COSC3081',
        'student-user-uuid-123'
      );

      expect(QuestionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'student-user-uuid-123',
          question: 'What is ACID in database systems?',
          status: expect.any(String),
        })
      );
    });
  });

  describe('FR-S04, FR-AI02: Document Summarization Engine', () => {
    it('should summarize academic document and produce key takeaway bullet points (< 10s)', async () => {
      const sampleLectureText = `
        Dire Dawa University IoT Department of Computer Science.
        Lecture 1: Introduction to Advanced Algorithms.
        In this course we explore amortized analysis, dynamic programming, and network flows.
        Amortized analysis guarantees average performance of each operation in the worst case.
        Dynamic programming solves problems by breaking them into overlapping sub-problems.
        Optimal substructure and memoization are key prerequisites for successful dynamic programming solutions.
      `;

      const startTime = Date.now();
      const summary = await aiGateway.summarizeDocument(
        sampleLectureText,
        'COSC2041_Lecture1_Algorithms.txt'
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // NFR: summary within 10 seconds
      expect(summary).toHaveProperty('summaryText');
      expect(summary.summaryText.length).toBeGreaterThan(30);
      expect(Array.isArray(summary.keyPoints)).toBe(true);
      expect(summary.keyPoints.length).toBeGreaterThan(0);
    });
  });

  describe('FR-S07, FR-AI03: Quiz Generation', () => {
    it('should generate multiple-choice practice quiz with questions, options, and explanations', async () => {
      const quiz = await aiGateway.generateQuiz(
        'Artificial Intelligence and Neural Networks',
        'COSC3072',
        4
      );

      expect(quiz.title).toContain('Artificial Intelligence');
      expect(quiz.courseCode).toBe('COSC3072');
      expect(quiz.questions.length).toBe(4);
      
      const firstQ = quiz.questions[0];
      expect(firstQ).toHaveProperty('text');
      expect(firstQ.options.length).toBe(4);
      expect(typeof firstQ.correctAnswer).toBe('number');
      expect(firstQ).toHaveProperty('explanation');
    });
  });

  describe('FR-S07, FR-AI04: Student Answer Evaluation', () => {
    it('should evaluate non-empty answer and return score with feedback', async () => {
      const evalResult = await aiGateway.evaluateStudentAnswer(
        'Explain the time complexity of quicksort and merge sort.',
        'Quicksort average time complexity is O(n log n) and worst case O(n^2). Merge sort is always O(n log n) using divide and conquer algorithms.'
      );

      expect(evalResult).toHaveProperty('score');
      expect(evalResult.score).toBeGreaterThan(0);
      expect(evalResult.score).toBeLessThanOrEqual(10);
      expect(evalResult).toHaveProperty('feedback');
      expect(evalResult.feedback.length).toBeGreaterThan(20);
    });

    it('should return score 0 with feedback when answer is blank', async () => {
      const evalResult = await aiGateway.evaluateStudentAnswer(
        'What is a binary semaphore?',
        ''
      );

      expect(evalResult.score).toBe(0);
      expect(evalResult.feedback).toMatch(/No answer/i);
    });
  });

  describe('FR-S08: Study Recommendations', () => {
    it('should generate relevant study recommendations based on student academic standing', async () => {
      const student = { yearOfStudy: 3, role: 'student' };
      const recs = await aiGateway.getStudyRecommendations(student, []);

      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0]).toHaveProperty('title');
      expect(recs[0]).toHaveProperty('courseCode');
      expect(recs[0]).toHaveProperty('reason');
    });
  });

  describe('FR-A06, FR-AI05: AI Service Health Check', () => {
    it('should report AI Gateway health and fallback status', async () => {
      const health = await aiGateway.checkHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('provider');
      expect(health).toHaveProperty('mode');
      expect(health.active).toBe(true);
    });
  });
});
