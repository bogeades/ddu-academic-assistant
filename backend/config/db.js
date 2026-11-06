const mongoose = require('mongoose');

/**
 * Connect to MongoDB with robust connection pooling and event listeners
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ddu_academic_assistant';
    
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 50, // Connection pooling for 500+ concurrent requests
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`[MongoDB Connected]: Host ${conn.connection.host}, Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    // Do not crash server in test environments; log error
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Proceeding with caution; MongoDB might be offline or starting up.');
    }
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Notice]: Database disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB Notice]: Database reconnected successfully.');
});

module.exports = connectDB;
