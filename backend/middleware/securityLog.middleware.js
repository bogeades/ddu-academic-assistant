const mongoose = require('mongoose');
const { SecurityLog } = require('../models');

/**
 * Log a security event to MongoDB
 * @param {Object} options - { req, action, user, status, details }
 */
const logSecurityEvent = async ({ req, action, user = null, status = 'success', details = {} }) => {
  try {
    let ip = '127.0.0.1';
    let userAgent = 'System / Internal';

    if (req) {
      if (req.headers && req.headers['x-forwarded-for']) {
        ip = String(req.headers['x-forwarded-for']).split(',')[0].trim();
      } else if (req.socket && req.socket.remoteAddress) {
        ip = String(req.socket.remoteAddress);
      } else if (req.ip) {
        ip = String(req.ip);
      }

      if (req.headers && req.headers['user-agent']) {
        userAgent = String(req.headers['user-agent']);
      }
    }

    let userId = null;
    if (user && mongoose.Types.ObjectId.isValid(user)) {
      userId = user;
    } else if (req && req.user && req.user._id) {
      userId = req.user._id;
    }

    await SecurityLog.create({
      user: userId,
      action: action || 'SECURITY_EVENT',
      ip: ip || '127.0.0.1',
      userAgent,
      details: typeof details === 'object' ? details : { raw: details },
      status,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error(`[Security Logging Error]: ${error.message}`);
  }
};

module.exports = {
  logSecurityEvent,
};
