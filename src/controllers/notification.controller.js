const jwt = require('jsonwebtoken');
const env = require('../config/env');
const notificationService = require('../services/notification.service');

const generateToken = async (req, res, next) => {
  try {
    const userId = req.query.user_id || 'usr_1';
    const token = jwt.sign({ user_id: userId }, env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user_id: userId });
  } catch (err) {
    next(err);
  }
};

const send = async (req, res, next) => {
  try {
    const { user_id, type, title, body, data } = req.body;

    if (!user_id || !type || !title || !body) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const notification = await notificationService.sendNotification({ user_id, type, title, body, data });

    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

const getUnread = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await notificationService.getUnreadNotifications(userId, page, limit);

    res.json({ success: true, unread_count: result.unread_count, data: result.data });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const updated = await notificationService.markAsRead(id, userId);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found or already read.' });
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    await notificationService.markAllAsRead(userId);

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { generateToken, send, getUnread, markRead, markAllRead };
