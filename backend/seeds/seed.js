require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  User,
  Department,
  Course,
  SystemSetting,
} = require('../models');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ddu_academic_assistant';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[Seeding]: Clearing existing core seed collections...');
    await SystemSetting.deleteMany({});
    await Department.deleteMany({});
    await Course.deleteMany({});
    await User.deleteMany({});

    console.log('[Seeding]: Initializing System Settings...');
    const settings = await SystemSetting.create({
      sessionTimeout: 120, // 2 hours
      passwordPolicy: {
        minLength: 8,
        requireNumbers: true,
        requireSymbols: false,
        requireUppercase: true,
      },
      registrationEnabled: true,
      materialApprovalRequired: false,
      maintenanceMode: false,
      scheduledDowntimeNotice: {
        active: false,
        message: 'Scheduled maintenance: System upgrade on Sunday at 02:00 AM EAT.',
      },
      aiDailyQuotaPerUser: 100,
    });
    console.log('System settings created.');

    console.log('[Seeding]: Creating Departments...');
    const csDept = await Department.create({
      name: 'Department of Computer Science',
      code: 'COSC',
      faculty: 'Institute of Technology',
      description: 'Department of Computer Science, IoT, Dire Dawa University',
    });

    const seDept = await Department.create({
      name: 'Department of Software Engineering',
      code: 'SE',
      faculty: 'Institute of Technology',
      description: 'Department of Software Engineering, IoT, Dire Dawa University',
    });

    console.log('[Seeding]: Creating Role Accounts with verified passwords...');
    const salt = await bcrypt.genSalt(10);

    const adminHash = await bcrypt.hash('Admin@123', salt);
    const deptHeadHash = await bcrypt.hash('DeptHead@123', salt);
    const registrarHash = await bcrypt.hash('Registrar@123', salt);
    const lecturerHash = await bcrypt.hash('Lecturer@123', salt);
    const studentHash = await bcrypt.hash('Student@123', salt);

    // 1. Admin (FR-A01)
    const admin = await User.create({
      name: 'Dire Dawa Admin',
      email: 'admin@ddu.edu.et',
      passwordHash: adminHash,
      role: 'admin',
      status: 'active',
      emailVerified: true,
    });

    // 2. Department Head (FR-DH01)
    const deptHead = await User.create({
      name: 'Dr. Abebe Bekele (CS Dept Head)',
      email: 'depthead.cs@ddu.edu.et',
      passwordHash: deptHeadHash,
      role: 'deptHead',
      status: 'active',
      emailVerified: true,
      department: csDept._id,
    });
    csDept.head = deptHead._id;
    await csDept.save();

    // 3. Registrar (FR-R01)
    const registrar = await User.create({
      name: 'Chala Tadesse (Registrar Officer)',
      email: 'registrar@ddu.edu.et',
      passwordHash: registrarHash,
      role: 'registrar',
      status: 'active',
      emailVerified: true,
    });

    // 4. Lecturer (FR-L01)
    const lecturer = await User.create({
      name: 'Prof. Tigist Hailu (Senior Lecturer)',
      email: 'lecturer.cs@ddu.edu.et',
      passwordHash: lecturerHash,
      role: 'lecturer',
      status: 'active',
      emailVerified: true,
      department: csDept._id,
    });

    // 5. Student (FR-S01, S02)
    const student = await User.create({
      name: 'Yared Getachew',
      email: 'student.cs@ddu.edu.et',
      passwordHash: studentHash,
      role: 'student',
      status: 'active',
      emailVerified: true,
      studentId: 'DDU/R/1024/14',
      department: csDept._id,
      yearOfStudy: 3,
    });

    console.log('[Seeding]: Creating Sample Courses...');
    const courses = await Course.create([
      {
        code: 'COSC2041',
        name: 'Data Structures and Algorithms',
        description: 'Linear and non-linear data structures, trees, graphs, sorting, and algorithmic complexity.',
        credits: 4,
        prerequisites: ['COSC1012'],
        capacity: 50,
        enrolledCount: 1,
        lecturer: lecturer._id,
        department: csDept._id,
        semester: 1,
        yearLevel: 2,
      },
      {
        code: 'COSC3072',
        name: 'Artificial Intelligence and Machine Learning',
        description: 'Heuristic search, knowledge representation, neural networks, natural language processing, and prompt engineering.',
        credits: 3,
        prerequisites: ['COSC2041'],
        capacity: 45,
        enrolledCount: 1,
        lecturer: lecturer._id,
        department: csDept._id,
        semester: 1,
        yearLevel: 3,
      },
      {
        code: 'COSC3081',
        name: 'Database Systems & Information Management',
        description: 'Relational databases, SQL, NoSQL systems, transaction handling, indexing, and normal forms.',
        credits: 4,
        prerequisites: ['COSC2041'],
        capacity: 50,
        enrolledCount: 0,
        lecturer: lecturer._id,
        department: csDept._id,
        semester: 2,
        yearLevel: 3,
      },
      {
        code: 'COSC4112',
        name: 'Computer and Network Security',
        description: 'Cryptographic algorithms, authentication protocols, network vulnerabilities, web application security.',
        credits: 3,
        prerequisites: ['COSC3081'],
        capacity: 40,
        enrolledCount: 0,
        lecturer: lecturer._id,
        department: csDept._id,
        semester: 1,
        yearLevel: 4,
      },
    ]);

    console.log('\n=============================================================');
    console.log('✅ DIRE DAWA UNIVERSITY SMART ASSISTANT SEEDED SUCCESSFULLY');
    console.log('=============================================================');
    console.log('Users created:');
    console.log('1. Admin:           admin@ddu.edu.et        / Admin@123');
    console.log('2. Department Head: depthead.cs@ddu.edu.et  / DeptHead@123');
    console.log('3. Registrar:       registrar@ddu.edu.et    / Registrar@123');
    console.log('4. Lecturer:        lecturer.cs@ddu.edu.et   / Lecturer@123');
    console.log('5. Student:         student.cs@ddu.edu.et   / Student@123');
    console.log('=============================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seeding Error]:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
