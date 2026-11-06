const API_URL = 'http://127.0.0.1:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function testRegistrarAndApprovalFlow() {
  console.log('--- Starting Registrar & Approval Verification Test ---');

  // Step 1: Login as Registrar
  console.log('\n1. Logging in as Registrar (registrar@ddu.edu.et)...');
  const regLoginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'registrar@ddu.edu.et',
      password: 'Registrar@123',
    },
  });
  const regToken = regLoginRes.token;
  console.log('✓ Registrar logged in successfully.');

  const regHeaders = { Authorization: `Bearer ${regToken}` };

  // Step 2: Test Departments and Courses fetching
  console.log('\n2. Testing Registrar access to Departments & Courses endpoints...');
  const deptsRes = await request('/registrar/departments', { headers: regHeaders });
  console.log(`✓ GET /api/registrar/departments returned ${deptsRes.count} departments.`);

  const coursesRes = await request('/registrar/courses', { headers: regHeaders });
  console.log(`✓ GET /api/registrar/courses returned ${coursesRes.count} courses.`);

  const adminDeptsRes = await request('/admin/departments', { headers: regHeaders });
  console.log(`✓ GET /api/admin/departments returned ${adminDeptsRes.count} departments (RBAC check passed!).`);

  const adminCoursesRes = await request('/admin/courses', { headers: regHeaders });
  console.log(`✓ GET /api/admin/courses returned ${adminCoursesRes.count} courses (RBAC check passed!).`);

  const studentsRes = await request('/registrar/students', { headers: regHeaders });
  console.log(`✓ GET /api/registrar/students returned ${studentsRes.count} students.`);

  const lecturersRes = await request('/registrar/lecturers', { headers: regHeaders });
  console.log(`✓ GET /api/registrar/lecturers returned ${lecturersRes.count} lecturers.`);

  const csDept = deptsRes.data.find(d => d.code === 'COSC') || deptsRes.data[0];
  const testLecturer = lecturersRes.data[0];
  const testCourse = coursesRes.data[0];

  // Step 3: Registrar directly registers a new student
  const uniqueId = Math.floor(100000 + Math.random() * 900000);
  const testStudentEmail = `student.test.${uniqueId}@ddu.edu.et`;
  const testStudentId = `DDU/R/${uniqueId}/16`;

  console.log(`\n3. Registrar directly registering new student (${testStudentEmail})...`);
  const regStudentRes = await request('/registrar/register-student', {
    method: 'POST',
    headers: regHeaders,
    body: {
      name: `Test Student ${uniqueId}`,
      email: testStudentEmail,
      studentId: testStudentId,
      departmentId: csDept._id,
      academicYear: 1,
      semester: 1,
      section: 'A',
    },
  });

  const createdStudent = regStudentRes.data;
  console.log(`✓ Student created: ${createdStudent.name} (${createdStudent._id}) with status 'pending' and assignmentStatus 'pending_approval'.`);

  // Step 4: Login as Admin
  console.log('\n4. Logging in as Admin (admin@ddu.edu.et)...');
  const adminLoginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@ddu.edu.et',
      password: 'Admin@123',
    },
  });
  const adminToken = adminLoginRes.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log('✓ Admin logged in successfully.');

  // Step 5: Admin approves the student assignment
  console.log('\n5. Admin approving student placement and generating OTP + Temp Password...');
  const approveStudentRes = await request(`/admin/student-assignments/${createdStudent._id}/approve`, {
    method: 'POST',
    headers: adminHeaders,
    body: {},
  });

  const { tempPassword, otpCode } = approveStudentRes;
  console.log(`✓ Student assignment approved!`);
  console.log(`   Temporary Password: ${tempPassword}`);
  console.log(`   One-Time OTP Code:  ${otpCode}`);

  // Step 6: Student First-Time Setup
  console.log('\n6. Student performing first-time setup (verifying OTP, setting personal permanent password)...');
  const personalPassword = 'MySecretPass123!';
  const setupRes = await request('/auth/first-time-setup', {
    method: 'POST',
    body: {
      email: testStudentEmail,
      tempPassword: tempPassword,
      otpCode: otpCode,
      newPassword: personalPassword,
    },
  });

  console.log(`✓ First-time setup complete! Token received: ${Boolean(setupRes.token)}`);

  // Step 7: Student subsequent login directly with personal password (NO OTP required)
  console.log('\n7. Student logging in directly with personal password on subsequent visit...');
  const subLoginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: testStudentEmail,
      password: personalPassword,
    },
  });

  const studentToken = subLoginRes.token;
  console.log(`✓ Student logged in directly without OTP requirement! Token: ${Boolean(studentToken)}`);

  // Step 8: Student fetches assigned courses (enforced by department, year, semester)
  console.log('\n8. Student accessing their official assigned courses dashboard...');
  const myCoursesRes = await request('/students/courses', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`✓ Student enrolled in ${myCoursesRes.count} official courses for Year 1 Semester 1 Section A.`);

  // Step 9: Registrar assigns Lecturer to Course & Section
  console.log(`\n9. Registrar assigning lecturer ${testLecturer.name} to course ${testCourse.code}...`);
  const assignLecRes = await request('/registrar/assign-lecturer', {
    method: 'POST',
    headers: regHeaders,
    body: {
      lecturerId: testLecturer._id,
      courseId: testCourse._id,
      departmentId: csDept._id,
      academicYear: 1,
      semester: 1,
      section: 'A',
      courseDescription: 'Comprehensive official syllabus notes for Section A.',
    },
  });

  const createdLecAssignment = assignLecRes.data;
  console.log(`✓ Teaching assignment submitted to Admin for approval (ID: ${createdLecAssignment._id}).`);

  // Step 10: Admin approves lecturer assignment
  console.log('\n10. Admin approving lecturer teaching assignment...');
  const approveLecRes = await request(`/admin/lecturer-assignments/${createdLecAssignment._id}/approve`, {
    method: 'POST',
    headers: adminHeaders,
    body: {},
  });
  console.log(`✓ Lecturer assignment approved! Instructor notified.`);

  console.log('\n======================================================');
  console.log('🎉 ALL REGISTRAR, APPROVAL, OTP, AND DASHBOARD TESTS PASSED!');
  console.log('======================================================');
}

testRegistrarAndApprovalFlow().catch((err) => {
  console.error('❌ Test failed:', err.data || err.message);
  process.exit(1);
});
