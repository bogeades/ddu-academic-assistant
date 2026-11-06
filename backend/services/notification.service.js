const { Notification } = require('../models');
const { sendNotificationEmail } = require('./email.service');

/**
 * Create an in-app notification and optionally trigger email alert
 * @param {Object} options - { user, title, message, type, link, sendEmail, emailAddress }
 */
const notifyUser = async ({
  user,
  title,
  message,
  type = 'system',
  link = '',
  sendEmail = false,
  emailAddress = null,
}) => {
  try {
    const notification = await Notification.create({
      user,
      title,
      message,
      type,
      link,
      read: false,
    });

    if (sendEmail && emailAddress) {
      sendNotificationEmail(emailAddress, `Dire Dawa University: ${title}`, title, message).catch(
        (err) => console.error('[Notification Email Error]:', err.message)
      );
    }

    return notification;
  } catch (error) {
    console.error(`[Notification Service Error]: ${error.message}`);
    return null;
  }
};

/**
 * Notify multiple users in batch (e.g. course announcements or new quiz)
 */
const notifyManyUsers = async (userIds, { title, message, type = 'announcement', link = '' }) => {
  try {
    const docs = userIds.map((userId) => ({
      user: userId,
      title,
      message,
      type,
      link,
      read: false,
    }));

    if (docs.length > 0) {
      await Notification.insertMany(docs);
    }
  } catch (error) {
    console.error(`[Batch Notification Error]: ${error.message}`);
  }
};

module.exports = {
  notifyUser,
  notifyManyUsers,
};
