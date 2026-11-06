const { SystemSetting } = require('../models');

/**
 * Middleware that checks if scheduled maintenance downtime is approaching (NFR: 24h notice)
 * or if maintenance mode is active.
 */
const checkMaintenanceAndDowntime = async (req, res, next) => {
  try {
    const settings = await SystemSetting.getSettings();

    // If maintenance mode is active, block non-admin requests
    if (settings && settings.maintenanceMode) {
      if (req.user && req.user.role === 'admin') {
        return next();
      }
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: 'The academic portal is temporarily in maintenance mode. Please check back shortly.',
      });
    }

    // If scheduled downtime notice is configured, attach header to every response
    if (settings && settings.scheduledDowntimeNotice && settings.scheduledDowntimeNotice.active) {
      res.setHeader('X-DDU-Downtime-Notice', encodeURIComponent(settings.scheduledDowntimeNotice.message));
      res.setHeader('X-DDU-Downtime-Time', settings.scheduledDowntimeNotice.scheduledTime ? settings.scheduledDowntimeNotice.scheduledTime.toISOString() : '');
    }

    next();
  } catch (error) {
    // Non-blocking in case of DB read error
    next();
  }
};

module.exports = {
  checkMaintenanceAndDowntime,
};
