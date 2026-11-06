const nodemailer = require('nodemailer');
const { SystemSetting } = require('../models');

/**
 * Dynamically initialize nodemailer transporter using SystemSetting or .env
 */
const getTransporter = async () => {
  let host = process.env.SMTP_HOST;
  let port = parseInt(process.env.SMTP_PORT || '587', 10);
  let secure = process.env.SMTP_SECURE === 'true';
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let from = process.env.EMAIL_FROM || '"Dire Dawa University" <no-reply@ddu.edu.et>';

  try {
    const settings = await SystemSetting.getSettings();
    const es = settings?.emailSettings;
    if (es) {
      if (es.smtpUser && String(es.smtpUser).trim()) {
        user = String(es.smtpUser).trim();
      }
      if (es.smtpPass && String(es.smtpPass).trim()) {
        pass = String(es.smtpPass).trim();
      }
      if (es.smtpHost && String(es.smtpHost).trim()) {
        host = String(es.smtpHost).trim();
      }
      if (es.smtpPort) {
        port = parseInt(es.smtpPort, 10);
      }
      if (es.smtpSecure !== undefined) {
        secure = Boolean(es.smtpSecure);
      }
      if (es.emailFrom && String(es.emailFrom).trim()) {
        from = String(es.emailFrom).trim();
      }
    }
  } catch (e) {
    // DB not ready yet, continue with env
  }

  if (pass) {
    pass = String(pass).replace(/\s+/g, '');
  }

  // Auto-correct host if user entered "DDU Portal" or gmail is used
  if (user && user.toLowerCase().endsWith('@gmail.com')) {
    if (!host || host === 'DDU Portal' || host.includes(' ') || host.includes('.local')) {
      host = 'smtp.gmail.com';
    }
    if (!port || port === 25) {
      port = 587;
    }
    // Prevent sender spoofing rejection by Google
    if (!from || from.includes('no-reply@ddu.edu.et')) {
      from = `"Dire Dawa University" <${user}>`;
    }
  }

  const isRealSmtp = Boolean(
    user &&
    user !== 'test-user@ddu.edu.et' &&
    !user.includes('example.com') &&
    pass &&
    pass !== 'test-pass'
  );

  if (isRealSmtp) {
    let transport;
    if (user.toLowerCase().endsWith('@gmail.com') || host === 'smtp.gmail.com') {
      transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false, // Prevents certificate verification errors across Windows/local network proxies
        },
      });
    } else {
      transport = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port,
        secure: port === 465 || secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false, // Prevents self-signed or university cert rejections
        },
      });
    }

    return {
      mailClient: transport,
      from,
      isReal: true,
    };
  }

  // Fallback logger for development / offline environments
  return {
    mailClient: {
      sendMail: async (mailOptions) => {
        console.log(`\n======================================================`);
        console.log(`[EMAIL DISPATCH] To: ${mailOptions.to}`);
        console.log(`From: ${mailOptions.from}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Content:\n${mailOptions.text || mailOptions.html}`);
        console.log(`======================================================\n`);
        return { messageId: `mock-${Date.now()}` };
      },
    },
    from,
    isReal: false,
  };
};

/**
 * Send account verification email to student (FR-S01)
 * @param {string} to - Recipient email
 * @param {string} name - Student name
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (to, name, token) => {
  const { mailClient, from } = await getTransporter();
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0b3954; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Dire Dawa University</h1>
        <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Institute of Technology - Department of Computer Science</p>
      </div>
      <div style="padding: 24px;">
        <h2 style="color: #0b3954;">Welcome, ${name}!</h2>
        <p>Thank you for registering on the <strong>AI-Based Smart Academic Assistant Portal</strong>.</p>
        <p>Please verify your academic email address to activate your student account and access courses, AI tutoring, and materials.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #0077b6; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Verify My Email Address</a>
        </div>
        <p style="font-size: 13px; color: #666;">Or copy and paste this link in your browser:</p>
        <p style="font-size: 13px; color: #0077b6; word-break: break-all;">${verifyUrl}</p>
        <p style="font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This link will expire in 24 hours. If you did not create this account, please ignore this email.
        </p>
      </div>
    </div>
  `;

  return await mailClient.sendMail({
    from,
    to,
    subject: 'Verify Your Dire Dawa University Student Account',
    html,
    text: `Hello ${name},\nPlease verify your account by visiting: ${verifyUrl}`,
  });
};

/**
 * Send notification email (announcements, grades, assignment deadlines)
 */
const sendNotificationEmail = async (to, subject, title, message) => {
  const { mailClient, from } = await getTransporter();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0b3954; color: #ffffff; padding: 18px; text-align: center;">
        <h2 style="margin: 0;">Dire Dawa University - Academic Alert</h2>
      </div>
      <div style="padding: 20px;">
        <h3 style="color: #0b3954;">${title}</h3>
        <p style="font-size: 15px; color: #444; line-height: 1.6;">${message}</p>
      </div>
    </div>
  `;

  return await mailClient.sendMail({
    from,
    to,
    subject,
    html,
    text: `${title}\n\n${message}`,
  });
};

/**
 * Send admin approval & OTP verification email with default password (FR-S01, FR-A02)
 * @param {string} to - Recipient email
 * @param {string} name - User name
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} defaultPassword - Secure temporary default password
 */
const sendApprovalOtpEmail = async (to, name, otpCode, defaultPassword = null) => {
  const { mailClient, from, isReal } = await getTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0b3954; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Dire Dawa University</h1>
        <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Institute of Technology - Department of Computer Science</p>
      </div>
      <div style="padding: 24px;">
        <h2 style="color: #0b3954; margin-top: 0;">Account Approved, ${name}!</h2>
        <p>Your account on the <strong>Dire Dawa University Smart Academic Assistant Portal</strong> has been approved by the University Administrator.</p>
        <p>Please use your temporary credentials and one-time verification OTP code below to sign in:</p>
        
        <div style="background-color: #f1f5f9; border: 1px dashed #0284c7; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            <span style="color: #64748b; font-size: 13px;">Login Email:</span>
            <span style="font-weight: bold; color: #0b3954;">${to}</span>
          </div>
          ${defaultPassword ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            <span style="color: #64748b; font-size: 13px;">Default Temporary Password:</span>
            <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #b91c1c;">${defaultPassword}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 4px;">
            <span style="color: #64748b; font-size: 13px;">One-Time Verification OTP:</span>
            <span style="font-family: monospace; font-size: 22px; font-weight: bold; letter-spacing: 3px; color: #0284c7;">${otpCode}</span>
          </div>
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 12px; border-radius: 6px; font-size: 12px; color: #92400e; margin-bottom: 20px;">
          <strong>Security Notice:</strong> Upon your first sign-in, enter your temporary default password and this one-time OTP. You will then set your permanent personal password. After that, you will log in with your permanent password without needing an OTP again.
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="background-color: #0b3954; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Sign In to University Portal
          </a>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Dire Dawa University Smart Academic Portal • Automated Notification
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`🎓 [DDU ADMIN APPROVAL] Account approved for: ${to}`);
  if (defaultPassword) {
    console.log(`🔒 Default Temporary Password: ${defaultPassword}`);
  }
  console.log(`🔑 Verification OTP Code: ${otpCode}`);
  console.log(`📨 SMTP Status: ${isReal ? 'Live Real SMTP' : 'Local Mock Transporter (Check console/admin)'}`);
  console.log(`======================================================\n`);

  try {
    const info = await mailClient.sendMail({
      from,
      to,
      subject: `Account Approved - Your DDU Login Credentials & Verification OTP`,
      html,
      text: `Hello ${name},\n\nYour account has been approved by the university administrator.\n\nLogin Email: ${to}${defaultPassword ? `\nDefault Temporary Password: ${defaultPassword}` : ''}\nOne-Time OTP Code: ${otpCode}\n\nPlease sign in at ${process.env.CLIENT_URL || 'http://localhost:5173'}/login and set your personal password.`,
    });
    return { success: true, isReal, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP ERROR]: Failed to deliver email to ${to}:`, err.message);
    return { success: false, isReal, error: err.message };
  }
};

/**
 * Test SMTP Configuration
 */
const testSmtpConnection = async (smtpConfig) => {
  let host = smtpConfig.smtpHost ? String(smtpConfig.smtpHost).trim() : '';
  const port = parseInt(smtpConfig.smtpPort || '587', 10);
  const secure = smtpConfig.smtpSecure ?? (port === 465);
  const user = smtpConfig.smtpUser ? String(smtpConfig.smtpUser).trim() : '';
  let pass = smtpConfig.smtpPass ? String(smtpConfig.smtpPass).replace(/\s+/g, '') : '';

  // Fallback to database password if user didn't retype it
  if (!pass) {
    const saved = await SystemSetting.getSettings();
    pass = saved.emailSettings?.smtpPass ? String(saved.emailSettings.smtpPass).replace(/\s+/g, '') : '';
  }

  // Auto-correct host if user typed portal name or left default for gmail
  if (user && user.toLowerCase().endsWith('@gmail.com')) {
    if (!host || host === 'DDU Portal' || host.includes(' ') || host.includes('.local')) {
      host = 'smtp.gmail.com';
    }
  }

  if (!user || !pass) {
    throw new Error('SMTP Username (Email) and App Password are required for testing.');
  }

  let transport;
  if (user.toLowerCase().endsWith('@gmail.com') || host === 'smtp.gmail.com') {
    transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  } else {
    transport = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure: port === 465 || secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }

  await transport.verify();
  return true;
};

/**
 * Send Student Approved Email with Temporary Default Password and One-Time OTP
 */
const sendStudentApprovedWithCredentials = async (to, name, tempPassword, otpCode, details = {}) => {
  const { mailClient, from, isReal } = await getTransporter();

  const deptName = details.departmentName || 'Department of Computer Science';
  const yearText = details.academicYear ? `Year ${details.academicYear}` : 'Year 1';
  const semText = details.semester ? `Semester ${details.semester}` : 'Semester 1';
  const secText = details.section ? `Section ${details.section}` : 'Section A';

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0b3954; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Dire Dawa University</h1>
        <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Office of the Registrar • IoT Faculty</p>
      </div>
      <div style="padding: 24px;">
        <h2 style="color: #0b3954; margin-top: 0;">Official Academic Admission & Enrollment</h2>
        <p>Dear <strong>${name}</strong>,</p>
        <p>Your student assignment has been verified by the Registrar and officially approved by the University Administrator.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
          <div style="font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 6px;">Your Class Assignment</div>
          <div style="font-size: 14px; color: #0b3954;"><strong>Department:</strong> ${deptName}</div>
          <div style="font-size: 14px; color: #0b3954;"><strong>Level:</strong> ${yearText} • ${semText}</div>
          <div style="font-size: 14px; color: #0b3954;"><strong>Assigned Section:</strong> ${secText}</div>
        </div>

        <p>To access your student dashboard, assigned courses, and faculty learning materials, use your temporary credentials:</p>

        <div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b; font-size: 13px;">Login Email:</span>
            <span style="font-weight: bold; color: #0b3954;">${to}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b; font-size: 13px;">Temporary Password:</span>
            <span style="font-family: monospace; font-size: 15px; font-weight: bold; color: #b91c1c;">${tempPassword}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-size: 13px;">One-Time OTP Verification Code:</span>
            <span style="font-family: monospace; font-size: 18px; font-weight: bold; color: #0284c7; letter-spacing: 2px;">${otpCode}</span>
          </div>
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 12px; border-radius: 6px; font-size: 12px; color: #92400e; margin-bottom: 20px;">
          <strong>Security Notice:</strong> Upon your first sign-in, you must enter this one-time OTP and create your permanent personal password. Once created, you will sign in directly with your personal password without needing an OTP.
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="background-color: #0b3954; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Sign In to Student Portal
          </a>
        </div>
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`🎓 [DDU STUDENT ASSIGNMENT APPROVED] Student: ${to}`);
  console.log(`🔑 Temp Password: ${tempPassword} | OTP: ${otpCode}`);
  console.log(`🏫 Class: ${deptName} | ${yearText} | ${semText} | ${secText}`);
  console.log(`📨 SMTP Status: ${isReal ? 'Live Real SMTP' : 'Local Mock'}`);
  console.log(`======================================================\n`);

  try {
    const info = await mailClient.sendMail({
      from,
      to,
      subject: `Dire Dawa University - Student Assignment Approved & Login Details`,
      html,
      text: `Hello ${name},\nYour student assignment for ${deptName} (${yearText}, ${semText}, ${secText}) has been approved.\nLogin Email: ${to}\nTemporary Password: ${tempPassword}\nOne-Time OTP: ${otpCode}\nSign in and set your personal password.`,
    });
    return { success: true, isReal, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP ERROR]: Failed to deliver credentials to ${to}:`, err.message);
    return { success: false, isReal, error: err.message };
  }
};

/**
 * Send Lecturer Course Assignment Notification Email
 */
const sendLecturerAssignmentNotification = async (to, name, details = {}) => {
  const { mailClient, from, isReal } = await getTransporter();

  const courseTitle = `${details.courseCode} - ${details.courseName}`;
  const deptName = details.departmentName || 'Institute of Technology';
  const yearText = `Year ${details.academicYear || 1}`;
  const semText = `Semester ${details.semester || 1}`;
  const secText = `Section ${details.section || 'A'}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0b3954; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Dire Dawa University</h1>
        <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Office of the Registrar • Faculty Teaching Assignment</p>
      </div>
      <div style="padding: 24px;">
        <h2 style="color: #0b3954; margin-top: 0;">Teaching Assignment Approved</h2>
        <p>Dear Instructor <strong>${name}</strong> (Lecturer ID: ${details.lecturerId || 'N/A'}),</p>
        <p>Your course teaching assignment has been reviewed by the Registrar and officially approved by the University Administration.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
          <div style="font-size: 13px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 6px;">Course & Class Details</div>
          <div style="font-size: 15px; font-weight: bold; color: #0b3954;">${courseTitle}</div>
          <div style="font-size: 13px; color: #334155; margin-top: 4px;"><strong>Department:</strong> ${deptName}</div>
          <div style="font-size: 13px; color: #334155;"><strong>Class Level:</strong> ${yearText} • ${semText}</div>
          <div style="font-size: 13px; color: #334155;"><strong>Assigned Section:</strong> ${secText}</div>
        </div>

        <p>You can now manage course materials (upload PDF files or type/paste text lecture notes), provide section-specific course descriptions, and view your assigned student roster in the Instructor Portal.</p>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/lecturer" style="background-color: #0b3954; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Open Lecturer Dashboard
          </a>
        </div>
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`📚 [DDU LECTURER ASSIGNMENT APPROVED] Lecturer: ${to}`);
  console.log(`📖 Course: ${courseTitle} | Class: ${deptName} ${yearText} ${semText} ${secText}`);
  console.log(`======================================================\n`);

  try {
    const info = await mailClient.sendMail({
      from,
      to,
      subject: `Approved Teaching Assignment: ${details.courseCode} (${secText}) - Dire Dawa University`,
      html,
      text: `Hello ${name},\nYour teaching assignment for ${courseTitle} (${deptName}, ${yearText}, ${semText}, ${secText}) has been approved by the administration.`,
    });
    return { success: true, isReal, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP ERROR]: Failed to notify lecturer ${to}:`, err.message);
    return { success: false, isReal, error: err.message };
  }
};

/**
 * Dispatch Official Lecturer Account Invitation & Activation Credentials
 */
const sendLecturerInvitationEmail = async (to, name, tempPassword, otpCode, details = {}) => {
  const { mailClient, from, isReal } = await getTransporter();
  const lecturerId = details.lecturerId || 'N/A';
  const deptName = details.departmentName || 'Dire Dawa University';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const activationLink = `${clientUrl}/activate-lecturer?email=${encodeURIComponent(to)}&id=${encodeURIComponent(lecturerId)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #0b3954; color: #ffffff; padding: 28px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; letter-spacing: 0.5px;">Dire Dawa University</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #93c5fd; text-transform: uppercase; font-weight: bold;">
          AI-Based Smart Academic Assistant System
        </p>
      </div>

      <div style="padding: 28px 24px; background-color: #ffffff;">
        <h2 style="color: #0b3954; font-size: 18px; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
          Your University Lecturer Account Has Been Approved
        </h2>

        <p style="font-size: 15px;">Dear <strong>${name}</strong>,</p>

        <p>Your lecturer registration has been officially reviewed and approved by the university administrator. Your university lecturer account has been created successfully.</p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
          <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">Official Lecturer Credentials</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 40%;"><strong>Lecturer ID:</strong></td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 15px; font-weight: bold; color: #0b3954;">${lecturerId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Registered Email:</strong></td>
              <td style="padding: 6px 0; color: #0b3954; font-weight: 600;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Department:</strong></td>
              <td style="padding: 6px 0; color: #334155;">${deptName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Temporary Password:</strong></td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 15px; font-weight: bold; color: #b91c1c;">${tempPassword}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>One-Time OTP:</strong></td>
              <td style="padding: 8px 0;">
                <span style="font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0284c7; background: #e0f2fe; padding: 3px 10px; border-radius: 4px; display: inline-block;">
                  ${otpCode}
                </span>
                <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 4px;">(Expires in 24 hours • Single use)</span>
              </td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #92400e; margin-bottom: 24px;">
          <strong>Security Notice:</strong> For security reasons, the OTP and temporary credential must be used only during the initial account activation process. You will be required to create your own permanent personal password.
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${activationLink}" style="background-color: #0b3954; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: bold; font-size: 15px; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(11, 57, 84, 0.2);">
            Activate Lecturer Account
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; text-align: center;">
          Or open this link directly in your browser:<br/>
          <a href="${activationLink}" style="color: #0284c7; word-break: break-all;">${activationLink}</a>
        </p>

        <p style="font-size: 14px; margin-top: 24px;">Welcome to the University Academic Management System.</p>

        <p style="font-size: 14px; margin-bottom: 0;">
          Best regards,<br/>
          <strong>University System Administration</strong><br/>
          <span style="font-size: 12px; color: #64748b;">Office of the Registrar & IT Services • Dire Dawa University</span>
        </p>
      </div>

      <div style="background-color: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Dire Dawa University • AI-Based Smart Academic Assistant System<br/>
        For assistance or account recovery, contact registrar@ddu.edu.et
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`🎓 [DDU LECTURER REGISTRATION APPROVED] Email to: ${to}`);
  console.log(`👤 Lecturer: ${name} (ID: ${lecturerId})`);
  console.log(`🏢 Department: ${deptName}`);
  console.log(`🔒 Temporary Password: ${tempPassword}`);
  console.log(`🔑 Activation OTP Code: ${otpCode}`);
  console.log(`🔗 Activation Link: ${activationLink}`);
  console.log(`📨 SMTP Status: ${isReal ? 'Live Real SMTP' : 'Development/Mock Logger (Deliverable)'}`);
  console.log(`======================================================\n`);

  try {
    const info = await mailClient.sendMail({
      from,
      to,
      subject: 'Your University Lecturer Account Has Been Approved - Dire Dawa University',
      html,
      text: `Dear ${name},\n\nYour lecturer registration has been approved by the university administrator.\nYour lecturer account has been created successfully.\n\nLecturer ID: ${lecturerId}\nEmail: ${to}\nTemporary Password: ${tempPassword}\nOTP: ${otpCode}\n\nPlease use the official account activation page to verify your email and create your personal password:\n${activationLink}\n\nFor security reasons, the OTP and temporary credential must be used only during the initial account activation process.\n\nWelcome to the University Academic Management System.\n\nBest regards,\nUniversity System Administration`,
    });
    return { success: true, isReal, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP ERROR]: Failed to deliver lecturer invitation to ${to}:`, err.message);
    return { success: false, isReal, error: err.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendNotificationEmail,
  sendApprovalOtpEmail,
  sendStudentApprovedWithCredentials,
  sendLecturerAssignmentNotification,
  sendLecturerInvitationEmail,
  testSmtpConnection,
  getTransporter,
};
