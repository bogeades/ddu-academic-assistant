const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const path = require('path');

const { errorHandler, notFound } = require('./middleware/error.middleware');
const { checkMaintenanceAndDowntime } = require('./middleware/downtime.middleware');

// Route imports
const authRoutes = require('./routes/auth.routes');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows web & mobile clients to access uploaded materials
}));
app.use(cors({
  origin: '*', // Allow web (Vite) and mobile (Expo) clients
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-DDU-Downtime-Notice', 'X-DDU-Downtime-Time'],
}));

// Body parsers with size limit
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// NoSQL injection sanitizer
app.use(mongoSanitize());

// HTTP request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Scheduled downtime notice & maintenance check (NFR: 24h downtime notice)
app.use(checkMaintenanceAndDowntime);

// Note: Raw /uploads static folder is intentionally NOT served publicly
// (Security requirement: files are only accessible via authenticated endpoints with access control)

// Health check endpoint
app.get('/health', (req, res) => res.redirect('/api/health'));
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    university: 'Dire Dawa University',
    department: 'Institute of Technology - Department of Computer Science',
    service: 'AI-Based Smart Academic Assistant Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);

// Dynamic/modular route loaders for subsequent phases
const mountOptionalRoute = (mountPath, routeModulePath) => {
  try {
    const route = require(routeModulePath);
    app.use(mountPath, route);
  } catch (err) {
    console.error(`[Route Load Error] Failed to load ${mountPath} (${routeModulePath}):`, err);
    // If not yet implemented in Phase 1, placeholder fallback
    app.use(mountPath, (req, res) => {
      res.status(501).json({
        success: false,
        message: `Endpoint ${mountPath} failed to load or is not yet implemented.`,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    });
  }
};

mountOptionalRoute('/api/students', './routes/student.routes');
mountOptionalRoute('/api/materials', './routes/material.routes');
mountOptionalRoute('/api/ai', './routes/ai.routes');
mountOptionalRoute('/api/tasks', './routes/task.routes');
mountOptionalRoute('/api/quizzes', './routes/quiz.routes');
mountOptionalRoute('/api/assignments', './routes/assignment.routes');
mountOptionalRoute('/api/submissions', './routes/submission.routes');
mountOptionalRoute('/api/announcements', './routes/announcement.routes');
mountOptionalRoute('/api/notifications', './routes/notification.routes');
mountOptionalRoute('/api/lecturer', './routes/lecturer.routes');
mountOptionalRoute('/api/enrollments', './routes/enrollment.routes');
mountOptionalRoute('/api/records', './routes/record.routes');
mountOptionalRoute('/api/reports', './routes/report.routes');
mountOptionalRoute('/api/registrar', './routes/registrar.routes');
mountOptionalRoute('/api/department', './routes/department.routes');
mountOptionalRoute('/api/admin', './routes/admin.routes');
mountOptionalRoute('/api/learning', './routes/learning.routes');

// 404 Handler & Centralized Error Handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
