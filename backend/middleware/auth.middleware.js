const jwt = require('jsonwebtoken');
const { User, SystemSetting } = require('../models');

/**
 * Protect middleware: Ensures request has a valid JWT, active account, and active session
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ddu_super_secret_jwt_key_2026_academic_assistant_cs_iot');

    // Fetch user
    const user = await User.findById(decoded.id).populate('department', 'name code');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact the administrator.',
      });
    }

    // Check system session timeout configuration (NFR & FR-A04)
    const settings = await SystemSetting.getSettings();
    if (settings && settings.sessionTimeout && decoded.iat) {
      const issueTimeMs = decoded.iat * 1000;
      const timeoutMs = settings.sessionTimeout * 60 * 1000;
      if (Date.now() - issueTimeMs > timeoutMs) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired due to university inactivity policy. Please log in again.',
        });
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Your token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or forged token.',
    });
  }
};

module.exports = {
  protect,
};
