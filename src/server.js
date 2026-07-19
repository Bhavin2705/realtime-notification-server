const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/env');
const db = require('./config/database');
const { redis, redisSub } = require('./config/redis');
const socketService = require('./services/socket.service');
const setupSocket = require('./sockets/notification.socket');
const logger = require('./utils/logger');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

socketService.init(io);
setupSocket(io);

// subscribe to redis so we can broadcast across multiple server instances
redisSub.subscribe('channel:notifications', (err) => {
  if (err) {
    logger.error('Failed to subscribe to Redis channel', err);
    return;
  }
  logger.info('Subscribed to channel:notifications');
});

// when a notification is published to redis, push it to the user's socket room
redisSub.on('message', (channel, message) => {
  if (channel === 'channel:notifications') {
    const notification = JSON.parse(message);
    socketService.emitToUser(notification.user_id, 'notification:new', notification);
  }
});

const PORT = parseInt(env.PORT, 10);

server.listen(PORT, async () => {
  await db.initDatabase();
  logger.info(`Server running on port ${PORT}`);
});

const shutdown = async () => {
  logger.info('Shutting down...');
  server.close();
  await db.end();
  redis.disconnect();
  redisSub.disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
