const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');

const setupSocket = (io) => {
  // verify JWT on every socket connection attempt
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.user_id;
    const room = `user:${userId}`;

    // each user gets their own room so we can target notifications
    socket.join(room);
    logger.info(`User ${userId} connected, joined room ${room}`);

    socket.on('notification:ack', (data) => {
      logger.info(`Notification ${data.id} acknowledged by ${userId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected`);
    });
  });
};

module.exports = setupSocket;
