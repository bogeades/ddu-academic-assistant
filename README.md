# Dire Dawa University - AI-Based Smart Academic Assistant
### Institute of Technology (IoT) • Department of Computer Science

A complete production-grade, modular, three-tier full-stack academic assistant platform built with **Node.js/Express**, **MongoDB (Mongoose)**, **React.js (Vite)**, and **React Native (Expo)**.

---

## 1. System Architecture & Tech Stack

```
   ┌──────────────────────────────────────────────────────────────┐
   │                    Client Applications                      │
   │  React.js Web Client (Vite)  │  React Native Mobile App (Expo)│
   └──────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS / REST API / JWT
   ┌──────────────────────────────▼───────────────────────────────┐
   │             Backend Gateway (Node.js + Express)              │
   │  - Helmet Security Headers       - express-mongo-sanitize    │
   │  - Rate Limiting (Brute-force)   - RBAC Guard Middleware     │
   │  - Express-Validator Chains      - Centralized Error Handler │
   └───────┬──────────────────────┬──────────────────────┬────────┘
           │                      │                      │
           ▼                      ▼                      ▼
   ┌───────────────┐      ┌───────────────┐      ┌────────────────┐
   │   MongoDB     │      │  AI Gateway   │      │ Email Service  │
   │  (18 Mongoose │      │  (Gemini /    │      │ (Nodemailer    │
   │    Schemas)   │      │   OpenAI)     │      │  & Alerts)     │
   └───────────────┘      └───────────────┘      └────────────────┘
```

- **Backend**: Node.js & Express.js (Modular MVC), Mongoose ODM, JWT, bcryptjs, multer, helmet, cors, express-rate-limit, express-validator, express-mongo-sanitize, node-cron, nodemailer, pdfkit.
- **Database**: MongoDB with connection pooling (`maxPoolSize: 50`), compound indexes, text indexes, unique sparse constraints.
- **Web Client**: React 18, Vite, React Router 6, Axios, Lucide React, Chart.js, mobile-first responsive CSS with WCAG 2.1 AA accessible contrast.
- **Mobile Client**: React Native with Expo, large touch-friendly button targets (minHeight: 52px), high contrast UI.
- **AI Gateway**: External LLM (Gemini 1.5 Flash / OpenAI) called **strictly from backend**, with caching layer (< 2s response), 5-second timeout, retry, and deterministic academic fallback engine.

---

## 2. Directory Structure

```
ddu-academic-assistant/
├── backend/
│   ├── config/
│   │   └── db.js                        # Mongoose connection pooling (maxPoolSize: 50)
│   ├── controllers/
│   │   ├── auth.controller.js           # FR-S01, S02, L01, R01, DH01, A01
│   │   ├── student.controller.js        # FR-S08, FR-L06
│   │   ├── material.controller.js       # FR-S05, FR-L02, FR-L07
│   │   ├── ai.controller.js             # FR-S03, S04, S07, FR-AI01 to AI05
│   │   ├── task.controller.js           # FR-S06
│   │   ├── quiz.controller.js           # FR-S07, FR-L03, FR-L06
│   │   ├── assignment.controller.js     # FR-L03, FR-S08
│   │   ├── submission.controller.js     # FR-S08, FR-L04 (AI-assisted grading)
│   │   ├── announcement.controller.js   # FR-L05
│   │   ├── enrollment.controller.js     # FR-S08, FR-R03 (Atomic capacity)
│   │   ├── record.controller.js         # FR-R04, FR-S08 (GPA / CGPA calculations)
│   │   ├── report.controller.js         # FR-R05, FR-R06 (Official PDF reports)
│   │   ├── department.controller.js     # FR-DH02 to FR-DH05 (Pass rate analytics)
│   │   └── admin.controller.js          # FR-A02 to FR-A06 (User lifecycle & backups)
│   ├── middleware/
│   │   ├── auth.middleware.js            # JWT verification & session timeout check
│   │   ├── rbac.middleware.js            # Role-based access control & data isolation
│   │   ├── validator.middleware.js       # express-validator & password policy check
│   │   ├── rateLimiter.middleware.js     # Brute-force & API rate limiters
│   │   ├── securityLog.middleware.js     # Audit trail logging to MongoDB
│   │   ├── downtime.middleware.js        # 24h scheduled downtime notice injection
│   │   ├── upload.middleware.js          # Multer file upload & extension sanitizer
│   │   └── error.middleware.js           # Centralized operational error handler
│   ├── models/                           # All 18 Mongoose Schemas
│   │   ├── User.js
│   │   ├── Department.js
│   │   ├── Course.js
│   │   ├── Enrollment.js                 # Unique compound index: student+course+semester
│   │   ├── CourseMaterial.js             # Text index: title, subject, courseCode
│   │   ├── Summary.js
│   │   ├── Task.js                       # Compound index: user+completed+deadline
│   │   ├── QuestionHistory.js            # Compound index: user+createdAt
│   │   ├── Quiz.js
│   │   ├── QuizResult.js                 # Compound index: student+quiz
│   │   ├── Assignment.js
│   │   ├── Submission.js                 # Compound unique index: assignment+student
│   │   ├── Announcement.js
│   │   ├── AcademicRecord.js             # Embedded semesters & GPA calculations
│   │   ├── Notification.js               # Compound index: user+read+createdAt
│   │   ├── SystemSetting.js              # Singleton configuration
│   │   ├── SecurityLog.js                # Security audit trail records
│   │   ├── Backup.js                     # Disaster recovery snapshots
│   │   └── index.js                      # Central export
│   ├── routes/                           # Modular API Routers with RBAC guards
│   ├── services/
│   │   ├── aiGateway.service.js          # Gemini/OpenAI Gateway, Caching & Fallback
│   │   ├── email.service.js              # Nodemailer verification & alert emails
│   │   ├── pdf.service.js                # PDFKit Transcript & Roster generation
│   │   ├── backup.service.js             # Database snapshot & restoration engine
│   │   └── notification.service.js       # In-app and email alert dispatch
│   ├── cron/
│   │   └── jobs.js                       # 24h Task reminders & 02:00 AM daily backups
│   ├── seeds/
│   │   └── seed.js                       # Verified demo accounts across all 5 roles
│   ├── tests/
│   │   ├── auth.test.js                  # Auth, Password Policy & RBAC tests
│   │   ├── aiGateway.test.js             # AI Q&A, Caching, Summarizer, Quizzes
│   │   ├── enrollment.test.js            # Prerequisites & atomic capacity tests
│   │   └── grading.test.js               # AI-assisted grading & CGPA calculations
│   ├── uploads/                          # Material & assignment file storage
│   ├── app.js
│   ├── server.js
│   └── package.json
├── web/                                  # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/                   # Navbar, Sidebar, ProtectedRoute
│   │   ├── context/AuthContext.jsx       # State management & token retention
│   │   ├── pages/                        # All 14 responsive role-based pages
│   │   ├── services/api.js               # Axios instance with interceptors
│   │   ├── App.jsx                       # Role-based route definitions
│   │   ├── main.jsx
│   │   └── index.css                     # Responsive mobile-first styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── mobile/                               # React Native (Expo) Mobile Application
│   ├── src/
│   │   ├── context/AuthContext.js        # Mobile authentication state
│   │   ├── navigation/AppNavigator.js    # Stack navigation
│   │   ├── screens/                      # Touch-friendly screens (min 52px targets)
│   │   ├── services/api.js               # Mobile API service
│   │   └── theme/colors.js               # Accessible color tokens
│   ├── App.js
│   ├── app.json
│   └── package.json
├── .env.example
└── README.md
```

---

## 3. Seed Accounts & Credentials

Run the database seed script to initialize system settings, computer science courses, and 1 verified account per actor:

```bash
cd backend
npm run seed
```

| Actor / Role | Email | Password | Role Identifier |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@ddu.edu.et` | `Admin@123` | `admin` |
| **Department Head** | `depthead.cs@ddu.edu.et` | `DeptHead@123` | `deptHead` |
| **Registrar Officer** | `registrar@ddu.edu.et` | `Registrar@123` | `registrar` |
| **Faculty Lecturer** | `lecturer.cs@ddu.edu.et` | `Lecturer@123` | `lecturer` |
| **Student** | `student.cs@ddu.edu.et` | `Student@123` | `student` |

---

## 4. API Endpoints Reference

All endpoints are prefixed with `/api` and return standardized JSON `{ success: true, data: ... }`.

### Authentication (`/api/auth`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register student account, enforce password policy, send verification email (FR-S01) |
| `POST` | `/api/auth/verify-email` | Public | Verify student email address via token (FR-S01) |
| `POST` | `/api/auth/login` | Public | Authenticate student, lecturer, registrar, dept head, or admin (FR-S02, L01, R01, DH01, A01) |
| `POST` | `/api/auth/logout` | Authenticated | Secure logout, terminate token session, write security log |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile and department details |
| `POST` | `/api/auth/change-password` | Authenticated | Update user password with policy validation |

### AI Gateway (`/api/ai`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/ask` | Authenticated | Ask academic question, real-time AI answer (<5s), query caching (<2s) (FR-S03, FR-AI01, FR-AI05) |
| `GET` | `/api/ai/history` | Authenticated | Retrieve user's past academic question & answer history (FR-S03) |
| `DELETE`| `/api/ai/history/:id?` | Authenticated | Delete item or clear question history |
| `POST` | `/api/ai/summarize` | Authenticated | Upload PDF/DOC/TXT or paste text for AI summarization (<10s) (FR-S04, FR-AI02) |
| `GET` | `/api/ai/summaries` | Authenticated | Retrieve saved document summaries for offline study (FR-S04) |
| `GET` | `/api/ai/summaries/:id/download` | Authenticated | Download summary as plain text file for offline study (FR-S04) |
| `POST` | `/api/ai/generate-quiz`| Authenticated | Generate practice multiple-choice questions on any CS topic (FR-S07, FR-AI03) |
| `POST` | `/api/ai/evaluate` | Authenticated | Evaluate student answer against rubric, return score and feedback (FR-S07, FR-AI04) |
| `GET` | `/api/ai/recommend` | Student | AI study-resource recommendations based on progress and standing (FR-S08) |
| `GET` | `/api/ai/health` | Authenticated | Monitor external AI Gateway connectivity, provider, and latency (FR-A06, FR-AI05) |

### Course Materials (`/api/materials`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/materials` | Authenticated | Search (text index) and filter course materials (FR-S05) |
| `GET` | `/api/materials/:id` | Authenticated | Retrieve single material details |
| `GET` | `/api/materials/:id/download` | Authenticated | Download material file, increment download counter (FR-S05) |
| `POST` | `/api/materials` | Lecturer, Admin, DeptHead | Upload course learning material (PDF/DOC/TXT) (FR-L02, FR-A06) |
| `DELETE`| `/api/materials/:id` | Lecturer (Owner), Admin | Delete course learning material (FR-L02, FR-A06) |
| `POST` | `/api/materials/:id/ai-summarize` | Lecturer, Student | Generate AI summary for uploaded course material (FR-L07) |

### Task Manager (`/api/tasks`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | Authenticated | Get user's academic tasks with completion & priority filters (FR-S06) |
| `POST` | `/api/tasks` | Authenticated | Create new task with deadline and priority (FR-S06) |
| `PATCH`| `/api/tasks/:id` | Authenticated | Toggle task complete or update details (FR-S06) |
| `DELETE`| `/api/tasks/:id` | Authenticated | Delete task from task manager (FR-S06) |

### Quizzes (`/api/quizzes`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/quizzes` | Authenticated | List quizzes for student courses or instructor assessments |
| `POST` | `/api/quizzes` | Lecturer, Admin, DeptHead | Create & publish quiz; notify enrolled students (FR-L03) |
| `GET` | `/api/quizzes/:id` | Authenticated | Get quiz questions (hides correct answers for students taking test) (FR-S07) |
| `POST` | `/api/quizzes/:id/submit` | Student | Submit quiz answers; compute score & feedback (FR-S07, FR-AI04) |
| `GET` | `/api/quizzes/:id/results` | Lecturer, Admin, DeptHead | Review student quiz scores and analytics (FR-L06) |

### Assignments & Submissions (`/api/assignments` & `/api/submissions`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/assignments` | Authenticated | List published assignments and student submission status |
| `POST` | `/api/assignments` | Lecturer, Admin, DeptHead | Create assignment; broadcast alert to enrolled students (FR-L03) |
| `GET` | `/api/assignments/:id` | Authenticated | Get assignment details and instructions |
| `POST` | `/api/submissions/:assignmentId` | Student | Submit assignment file or text response (FR-S08) |
| `GET` | `/api/submissions/assignment/:id` | Lecturer, Admin, DeptHead | Review all student submissions for an assignment (FR-L04) |
| `POST` | `/api/submissions/:id/ai-grade-suggestion` | Lecturer, Admin | Generate AI grading score & feedback suggestion (FR-L04) |
| `POST` | `/api/submissions/:id/grade` | Lecturer, Admin | Commit final grade and feedback; notify student (FR-L04) |

### Course Announcements (`/api/announcements`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Authenticated | List announcements for enrolled courses |
| `POST` | `/api/announcements` | Lecturer, Admin, DeptHead | Post course announcement; notify enrolled students (FR-L05) |
| `DELETE`| `/api/announcements/:id` | Lecturer (Owner), Admin, DeptHead | Delete announcement |

### Course Enrollment (`/api/enrollments`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/enrollments` | Student, Registrar, Admin | Enroll in course with prerequisite and atomic capacity checks (FR-S08, FR-R03) |
| `GET` | `/api/enrollments` | Authenticated | View active semester course enrollments |
| `DELETE`| `/api/enrollments/:id` | Student, Registrar, Admin | Drop/withdraw course; atomically decrement capacity count |

### Academic Records & Transcripts (`/api/records` & `/api/reports`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/records/:studentId?` | Student (Self), Registrar, Staff | View student academic record, GPA, and CGPA (FR-S08, FR-R04) |
| `POST` | `/api/records/:studentId/semester` | Registrar, Admin, DeptHead | Commit semester course results; recalculate CGPA (FR-R04) |
| `GET` | `/api/reports/transcript/:studentId` | Student (Self), Registrar, Staff | Generate Official DDU Academic Transcript PDF (FR-R05) |
| `GET` | `/api/reports/enrollment-list/:courseId` | Registrar, Lecturer, Staff | Generate Course Enrollment Roster PDF (FR-R05) |
| `GET` | `/api/reports/students` | Registrar, Staff | Search directory of registered students (FR-R02, FR-R06) |

### Department Head Portal (`/api/department`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/department/performance` | DeptHead, Admin | Department pass rates, grade distribution & occupancy (FR-DH02, FR-DH04) |
| `GET` | `/api/department/instructors` | DeptHead, Admin | Review instructor activity status & grading progress (FR-DH03) |
| `PATCH`| `/api/department/materials/:id/approval` | DeptHead, Admin | Approve or flag course materials before publication (FR-DH05) |

### System Administration (`/api/admin`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Admin | Search, filter, and inspect user accounts (FR-A02) |
| `PATCH`| `/api/admin/users/:id/status`| Admin | Activate or deactivate user accounts (FR-A02) |
| `PATCH`| `/api/admin/users/:id/role` | Admin | Assign roles and permissions (FR-A03) |
| `DELETE`| `/api/admin/users/:id` | Admin | Permanently delete user account (FR-A02) |
| `GET` | `/api/admin/settings` | Admin | Retrieve global university settings (FR-A04) |
| `PUT` | `/api/admin/settings` | Admin | Update timeout, password policy, registration toggle (FR-A04) |
| `POST` | `/api/admin/backups/manual` | Admin | Trigger manual database snapshot (FR-A05) |
| `GET` | `/api/admin/backups` | Admin | List all manual & automated backup snapshots (FR-A05) |
| `POST` | `/api/admin/backups/:id/restore` | Admin | Restore database state from snapshot (FR-A05) |
| `GET` | `/api/admin/logs` | Admin | View security audit logs (FR-A06) |
| `GET` | `/api/admin/ai-health` | Admin | External AI Gateway health & latency status (FR-A06) |

---

## 5. Functional & Non-Functional Traceability Matrix

| Requirement | Code Implementation File(s) |
| :--- | :--- |
| **FR-S01** | `backend/models/User.js`, `backend/controllers/auth.controller.js:register`, `backend/services/email.service.js` |
| **FR-S02** | `backend/controllers/auth.controller.js:login, logout`, `web/src/pages/Login.jsx` |
| **FR-S03** | `backend/services/aiGateway.service.js:askAcademicQuestion`, `backend/controllers/ai.controller.js`, `web/src/pages/AIChat.jsx` |
| **FR-S04** | `backend/controllers/ai.controller.js:summarizeDocument`, `web/src/pages/DocumentSummarizer.jsx` |
| **FR-S05** | `backend/models/CourseMaterial.js`, `backend/controllers/material.controller.js`, `web/src/pages/MaterialsLibrary.jsx` |
| **FR-S06** | `backend/models/Task.js`, `backend/controllers/task.controller.js`, `backend/cron/jobs.js`, `web/src/pages/TaskManager.jsx` |
| **FR-S07** | `backend/controllers/quiz.controller.js:submitQuizAnswers`, `web/src/pages/QuizPlayer.jsx`, `mobile/src/screens/QuizScreen.js` |
| **FR-S08** | `backend/controllers/enrollment.controller.js`, `backend/controllers/student.controller.js`, `web/src/pages/StudentDashboard.jsx` |
| **FR-L01** | `backend/controllers/auth.controller.js:login`, role guard `authorize('lecturer')` |
| **FR-L02** | `backend/controllers/material.controller.js:uploadMaterial, deleteMaterial`, `web/src/pages/MaterialsLibrary.jsx` |
| **FR-L03** | `backend/controllers/quiz.controller.js:createQuiz`, `backend/controllers/assignment.controller.js:createAssignment` |
| **FR-L04** | `backend/controllers/submission.controller.js:getAIGradeSuggestion, gradeSubmission`, `web/src/pages/AssignmentsView.jsx` |
| **FR-L05** | `backend/controllers/announcement.controller.js:createAnnouncement`, `backend/services/notification.service.js` |
| **FR-L06** | `backend/controllers/quiz.controller.js:getQuizResultsForInstructor`, `backend/controllers/student.controller.js` |
| **FR-L07** | `backend/controllers/material.controller.js:generateMaterialSummary`, `backend/services/aiGateway.service.js` |
| **FR-R01** | `backend/controllers/auth.controller.js:login`, role guard `authorize('registrar')` |
| **FR-R02, R06** | `backend/controllers/report.controller.js:getStudentsDirectory`, `web/src/pages/RegistrarDashboard.jsx` |
| **FR-R03** | `backend/controllers/enrollment.controller.js:enrollCourse` (Atomic capacity `$expr: { $lt: ['$enrolledCount', '$capacity'] }` & prereq check) |
| **FR-R04** | `backend/controllers/record.controller.js:updateSemesterRecord`, `backend/models/AcademicRecord.js:calculateCGPA` |
| **FR-R05** | `backend/services/pdf.service.js:generateTranscriptPDF, generateCourseEnrollmentPDF`, `backend/controllers/report.controller.js` |
| **FR-DH01** | `backend/controllers/auth.controller.js:login`, role guard `authorize('deptHead')` |
| **FR-DH02** | `backend/controllers/department.controller.js:getDepartmentPerformance`, `web/src/pages/DeptHeadDashboard.jsx` |
| **FR-DH03** | `backend/controllers/department.controller.js:getInstructorActivities`, `web/src/pages/DeptHeadDashboard.jsx` |
| **FR-DH04** | `backend/controllers/department.controller.js`, `backend/controllers/report.controller.js` |
| **FR-DH05** | `backend/controllers/department.controller.js:reviewMaterialApproval`, `backend/models/SystemSetting.js` |
| **FR-A01** | `backend/controllers/auth.controller.js:login`, role guard `authorize('admin')` |
| **FR-A02** | `backend/controllers/admin.controller.js:getAllUsers, updateUserStatus, deleteUser` |
| **FR-A03** | `backend/controllers/admin.controller.js:assignUserRole`, `backend/middleware/rbac.middleware.js` |
| **FR-A04** | `backend/controllers/admin.controller.js:getSystemSettings, updateSystemSettings`, `backend/models/SystemSetting.js` |
| **FR-A05** | `backend/services/backup.service.js:runBackupJob, restoreBackup`, `backend/cron/jobs.js` |
| **FR-A06** | `backend/controllers/admin.controller.js:getSecurityLogs, getAIHealthStatus`, `backend/models/SecurityLog.js` |
| **FR-AI01** | `backend/services/aiGateway.service.js:askAcademicQuestion` (< 5s response) |
| **FR-AI02** | `backend/services/aiGateway.service.js:summarizeDocument` (< 10s response) |
| **FR-AI03** | `backend/services/aiGateway.service.js:generateQuiz` |
| **FR-AI04** | `backend/services/aiGateway.service.js:evaluateStudentAnswer` |
| **FR-AI05** | `backend/services/aiGateway.service.js` (Caching layer, retry, timeout, fallback response, health check) |
| **NFR Security** | `bcryptjs` (10 rounds), `helmet`, `cors`, `express-mongo-sanitize`, `express-rate-limit`, `restrictToSelfOrStaff` student data isolation |
| **NFR Reliability**| 24h scheduled downtime notice header (`backend/middleware/downtime.middleware.js`), maintenance mode lock |
| **NFR Performance**| 50-connection pool (`backend/config/db.js`), query caching (`backend/services/aiGateway.service.js`), text indexes |
| **NFR Usability** | WCAG 2.1 AA accessible contrast, keyboard navigation, min 52px mobile touch targets |

---

## 6. Installation & Execution Guide

### Prerequisites
- Node.js >= 18.x
- MongoDB instance (local or MongoDB Atlas connection URI)

### Step 1: Backend Setup
```bash
cd backend
npm install

# Seed verified role accounts, courses, and system settings
npm run seed

# Run automated test suites (28 tests covering auth, AI, enrollment, grading)
npm test

# Start backend server
npm start
# Server listens on http://localhost:5000
```

### Step 2: Web Client Setup (React + Vite)
```bash
cd ../web
npm install
npm run dev
# Web application available at http://localhost:5173
```

### Step 3: Mobile App Setup (React Native + Expo)
```bash
cd ../mobile
npm install
npx expo start
# Scan QR code with Expo Go on iOS/Android or press 'a' for Android Emulator
```

---

## 7. Production Deployment (PM2 & HTTPS)

To deploy the backend API in a production Linux/Windows server environment with process monitoring and SSL termination:

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Build and start backend with PM2 cluster mode
cd backend
pm2 start server.js --name "ddu-academic-api" -i max --env production

# 3. Save PM2 startup script
pm2 save
pm2 startup
```

### Nginx Reverse Proxy with HTTPS (SSL / Let's Encrypt)
```nginx
server {
    listen 80;
    server_name portal.ddu.edu.et;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name portal.ddu.edu.et;

    ssl_certificate /etc/letsencrypt/live/portal.ddu.edu.et/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.ddu.edu.et/privkey.pem;

    # Client Web Application
    location / {
        root /var/www/ddu-academic-assistant/web/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend Express REST API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads Static Assets
    location /uploads {
        proxy_pass http://127.0.0.1:5000/uploads;
    }
}
```
