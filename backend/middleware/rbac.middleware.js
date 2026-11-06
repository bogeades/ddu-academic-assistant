/**
 * Role-Based Access Control (RBAC) middleware
 * Restricts route access to specified roles
 * Allowed roles: 'student', 'lecturer', 'registrar', 'deptHead', 'admin'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication is required before role check.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this academic resource.`,
      });
    }

    next();
  };
};

/**
 * Enforces student data isolation (NFR Security: students can access only their own data)
 * Non-student roles (registrar, lecturer, deptHead, admin) are allowed staff access.
 */
const restrictToSelfOrStaff = (paramKey = 'studentId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Staff roles have authorized access
    if (['admin', 'registrar', 'deptHead', 'lecturer'].includes(req.user.role)) {
      return next();
    }

    // If role is student, they can only view or modify their own resource
    const requestedId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey];
    if (requestedId && requestedId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Students are strictly permitted to access only their own academic data.',
      });
    }

    next();
  };
};

module.exports = {
  authorize,
  restrictToSelfOrStaff,
};
