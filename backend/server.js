require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Initialize Scheduled Cron Jobs if present
try {
  const { initCronJobs } = require('./cron/jobs');
  initCronJobs();
} catch (e) {
  // Cron jobs to be populated in Phase 3/6
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🎓 DIRE DAWA UNIVERSITY - AI ACADEMIC ASSISTANT API`);
  console.log(`   IoT - Department of Computer Science`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection Error]:', err.message);
  // Keep server alive in production, or gracefully close
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err.message);
});
