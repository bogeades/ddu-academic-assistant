const PDFDocument = require('pdfkit');

/**
 * Generate Official Dire Dawa University Student Academic Transcript PDF (FR-R05)
 * @param {Object} student - Student user document
 * @param {Object} academicRecord - AcademicRecord document with semesters
 * @param {Stream} res - Express response stream
 */
const generateTranscriptPDF = (student, academicRecord, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  // University Header Banner
  doc.rect(40, 40, 515, 60).fill('#0b3954');
  doc.fillColor('#ffffff').fontSize(18).text('DIRE DAWA UNIVERSITY', 50, 50, { align: 'center' });
  doc.fontSize(11).text('Institute of Technology (IoT) - Office of the Registrar', 50, 72, { align: 'center' });
  doc.fontSize(12).text('OFFICIAL ACADEMIC TRANSCRIPT', 50, 87, { align: 'center' });

  doc.moveDown(2);
  doc.fillColor('#333333');

  // Student Profile Card
  const topY = 115;
  doc.rect(40, topY, 515, 65).stroke('#cccccc');
  doc.fontSize(10);
  doc.text(`Student Name: ${student.name}`, 50, topY + 10);
  doc.text(`Student ID: ${student.studentId || 'N/A'}`, 320, topY + 10);
  doc.text(`Department: ${student.department ? student.department.name : 'Computer Science'}`, 50, topY + 28);
  doc.text(`Cumulative GPA (CGPA): ${academicRecord ? academicRecord.cgpa.toFixed(2) : '0.00'}`, 320, topY + 28);
  doc.text(`Academic Standing: ${academicRecord ? academicRecord.academicStanding : 'Good Standing'}`, 50, topY + 46);
  doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 320, topY + 46);

  let currentY = topY + 80;

  // Semesters & Course Grades
  if (academicRecord && academicRecord.semesters && academicRecord.semesters.length > 0) {
    academicRecord.semesters.forEach((semester, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      // Semester Header
      doc.rect(40, currentY, 515, 20).fill('#e0f2fe');
      doc.fillColor('#0369a1').fontSize(10).text(
        `${semester.name.toUpperCase()} (Academic Year: ${semester.academicYear || '2025/2026'}) - Term GPA: ${semester.gpa.toFixed(2)}`,
        48,
        currentY + 5
      );
      currentY += 25;

      // Table Header
      doc.rect(40, currentY, 515, 18).fill('#f1f5f9');
      doc.fillColor('#475569').fontSize(9);
      doc.text('Course Code', 48, currentY + 4);
      doc.text('Course Title', 130, currentY + 4);
      doc.text('Cr. Hrs', 390, currentY + 4);
      doc.text('Grade', 450, currentY + 4);
      doc.text('Points', 500, currentY + 4);
      currentY += 20;

      // Courses List
      semester.courses.forEach((course) => {
        doc.fillColor('#1e293b').fontSize(9);
        doc.text(course.courseCode, 48, currentY + 3);
        doc.text(course.courseName.slice(0, 42), 130, currentY + 3);
        doc.text(course.credits.toString(), 400, currentY + 3);
        doc.text(course.grade, 455, currentY + 3);
        doc.text((course.credits * course.gradePoint).toFixed(1), 505, currentY + 3);
        
        doc.moveTo(40, currentY + 16).lineTo(555, currentY + 16).stroke('#e2e8f0');
        currentY += 18;
      });

      currentY += 10;
    });
  } else {
    doc.fontSize(10).text('No official semester coursework recorded to date.', 50, currentY);
    currentY += 30;
  }

  // Official Signature Footer
  if (currentY > 680) {
    doc.addPage();
    currentY = 80;
  } else {
    currentY += 25;
  }

  doc.rect(40, currentY, 515, 70).stroke('#cbd5e1');
  doc.fontSize(9).fillColor('#64748b');
  doc.text('REGISTRAR CERTIFICATION & VERIFICATION SEAL', 50, currentY + 10, { align: 'center' });
  doc.text('This document is certified as an official academic record from Dire Dawa University.', 50, currentY + 25, { align: 'center' });
  doc.text('Authorized Signature: _______________________      Office Stamp: [ VERIFIED ]', 50, currentY + 45, { align: 'center' });

  doc.end();
};

/**
 * Generate Course Enrollment List PDF (FR-R05)
 * @param {Object} course - Course document
 * @param {Array} enrollments - Enrolled students list
 * @param {Stream} res - Express response stream
 */
const generateCourseEnrollmentPDF = (course, enrollments, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  // Header Banner
  doc.rect(40, 40, 515, 55).fill('#0b3954');
  doc.fillColor('#ffffff').fontSize(16).text('DIRE DAWA UNIVERSITY - REGISTRAR', 50, 48, { align: 'center' });
  doc.fontSize(11).text(`OFFICIAL COURSE ENROLLMENT ROSTER: ${course.code} - ${course.name}`, 50, 70, { align: 'center' });

  doc.moveDown(2);
  doc.fillColor('#333333');

  // Course Details
  const topY = 105;
  doc.rect(40, topY, 515, 45).stroke('#cbd5e1');
  doc.fontSize(9);
  doc.text(`Course Code: ${course.code}`, 50, topY + 8);
  doc.text(`Capacity: ${course.capacity}`, 220, topY + 8);
  doc.text(`Enrolled Students: ${enrollments.length}`, 380, topY + 8);
  doc.text(`Department: ${course.department ? course.department.name : 'Computer Science'}`, 50, topY + 24);
  doc.text(`Semester: Term ${course.semester}`, 220, topY + 24);
  doc.text(`Credits: ${course.credits} Cr. Hrs`, 380, topY + 24);

  let currentY = topY + 60;

  // Table Header
  doc.rect(40, currentY, 515, 20).fill('#0284c7');
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('#', 48, currentY + 5);
  doc.text('Student ID', 75, currentY + 5);
  doc.text('Full Name', 185, currentY + 5);
  doc.text('Email', 340, currentY + 5);
  doc.text('Status', 495, currentY + 5);
  currentY += 22;

  // Students Rows
  doc.font('Helvetica');
  enrollments.forEach((enrollment, index) => {
    if (currentY > 730) {
      doc.addPage();
      currentY = 50;
    }

    const s = enrollment.student;
    doc.fillColor('#1e293b').fontSize(9);
    doc.text((index + 1).toString(), 48, currentY + 3);
    doc.text(s ? s.studentId || 'N/A' : 'N/A', 75, currentY + 3);
    doc.text(s ? s.name : 'Unknown Student', 185, currentY + 3);
    doc.text(s ? s.email : '', 340, currentY + 3);
    doc.text(enrollment.status.toUpperCase(), 495, currentY + 3);

    doc.moveTo(40, currentY + 16).lineTo(555, currentY + 16).stroke('#e2e8f0');
    currentY += 18;
  });

  doc.end();
};

/**
 * Generate Official Dire Dawa University Department Academic Performance & Quality Report PDF (FR-DH04)
 * @param {Object} department - Department document
 * @param {Object} summary - Report statistics summary
 * @param {Array} studentRoster - Array of student records
 * @param {Object} filters - Applied filters
 * @param {Stream} res - Express response stream
 */
const generateDepartmentReportPDF = (department, summary, studentRoster, filters, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  // University Header Banner
  doc.rect(40, 40, 515, 60).fill('#0b3954');
  doc.fillColor('#ffffff').fontSize(16).text('DIRE DAWA UNIVERSITY', 50, 48, { align: 'center' });
  doc.fontSize(10).text('Institute of Technology (IoT) • Department of ' + (department?.name || 'Computer Science'), 50, 68, { align: 'center' });
  doc.fontSize(11).text('DEPARTMENTAL ACADEMIC QUALITY & PERFORMANCE REPORT', 50, 82, { align: 'center' });

  doc.moveDown(2);
  doc.fillColor('#333333');

  // Metadata Card
  const topY = 115;
  doc.rect(40, topY, 515, 65).stroke('#cccccc');
  doc.fontSize(9);
  doc.text(`Department: ${department?.name || 'Computer Science'} (${department?.code || 'COSC'})`, 50, topY + 8);
  doc.text(`Academic Faculty: ${department?.faculty || 'Institute of Technology'}`, 320, topY + 8);
  doc.text(`Total Department Students: ${summary.totalStudents || 0}`, 50, topY + 24);
  doc.text(`Average Department CGPA: ${summary.averageCGPA?.toFixed(2) || '0.00'}`, 320, topY + 24);
  doc.text(`Cohort Filters: Year ${filters.academicYear || 'ALL'} • Sem ${filters.semester || 'ALL'} • Sec ${filters.section || 'ALL'}`, 50, topY + 40);
  doc.text(`Generated Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 320, topY + 40);

  let currentY = topY + 80;

  // Student Roster Table Header
  doc.rect(40, currentY, 515, 20).fill('#0284c7');
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('#', 45, currentY + 5);
  doc.text('Student ID', 65, currentY + 5);
  doc.text('Full Name', 160, currentY + 5);
  doc.text('Yr/Sem/Sec', 290, currentY + 5);
  doc.text('CGPA', 360, currentY + 5);
  doc.text('Credits', 405, currentY + 5);
  doc.text('Senate Standing', 455, currentY + 5);
  currentY += 22;

  // Students Rows
  doc.font('Helvetica');
  studentRoster.forEach((s, index) => {
    if (currentY > 740) {
      doc.addPage();
      currentY = 50;

      // Table Header on new page
      doc.rect(40, currentY, 515, 20).fill('#0284c7');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('#', 45, currentY + 5);
      doc.text('Student ID', 65, currentY + 5);
      doc.text('Full Name', 160, currentY + 5);
      doc.text('Yr/Sem/Sec', 290, currentY + 5);
      doc.text('CGPA', 360, currentY + 5);
      doc.text('Credits', 405, currentY + 5);
      doc.text('Senate Standing', 455, currentY + 5);
      currentY += 22;
      doc.font('Helvetica');
    }

    doc.fillColor('#1e293b').fontSize(8);
    doc.text((index + 1).toString(), 45, currentY + 3);
    doc.text(s.studentId || 'N/A', 65, currentY + 3);
    doc.text(s.name || 'Unknown', 160, currentY + 3);
    doc.text(`Y${s.year} S${s.semester} ${s.section}`, 290, currentY + 3);
    doc.text(typeof s.cgpa === 'number' ? s.cgpa.toFixed(2) : '0.00', 360, currentY + 3);
    doc.text(`${s.totalCredits || 0}`, 405, currentY + 3);
    doc.text(s.academicStanding || 'Good Standing', 455, currentY + 3);

    doc.moveTo(40, currentY + 16).lineTo(555, currentY + 16).stroke('#e2e8f0');
    currentY += 18;
  });

  // Verification & Signature Footer
  if (currentY > 700) {
    doc.addPage();
    currentY = 50;
  }
  currentY += 30;
  doc.fontSize(9).fillColor('#475569');
  doc.text('_____________________________________', 50, currentY);
  doc.text('Department Head Verification & Stamp', 50, currentY + 15);

  doc.text('_____________________________________', 350, currentY);
  doc.text('Dean of Academic Affairs Endorsement', 350, currentY + 15);

  doc.end();
};

module.exports = {
  generateTranscriptPDF,
  generateCourseEnrollmentPDF,
  generateDepartmentReportPDF,
};
