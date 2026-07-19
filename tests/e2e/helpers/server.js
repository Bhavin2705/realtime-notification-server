// set env vars before anything loads
process.env.PORT = '0';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'super-secret-key-12345';
process.env.ADMIN_API_KEY = 'admin-api-key-12345';

const http = require('http');
const { Server } = require('socket.io');

// mock database - in-memory store
const notifications = [];
const dbMock = {
  query: async (text, params) => {
    if (text.includes('INSERT INTO notifications')) {
      const [user_id, type, title, body, data] = params;
      const notification = {
        id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id,
        type,
        title,
        body,
        data: JSON.parse(data),
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      notifications.push(notification);
      return { rows: [notification] };
    }

    if (text.includes('SELECT') && text.includes('is_read = false') && text.includes('ORDER BY')) {
      const userId = params[0];
      const limit = params[1] || 20;
      const offset = params[2] || 0;
      const rows = notifications
        .filter((n) => n.user_id === userId && !n.is_read)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(offset, offset + limit);
      return { rows };
    }

    if (text.includes('SELECT COUNT')) {
      const userId = params[0];
      const count = notifications.filter((n) => n.user_id === userId && !n.is_read).length;
      return { rows: [{ count: String(count) }] };
    }

    if (text.includes('UPDATE') && text.includes('WHERE id = $1')) {
      const id = params[0];
      const userId = params[1];
      const notif = notifications.find((n) => n.id === id && n.user_id === userId && !n.is_read);
      if (notif) {
        notif.is_read = true;
        notif.updated_at = new Date().toISOString();
        return { rowCount: 1, rows: [notif] };
      }
      return { rowCount: 0, rows: [] };
    }

    if (text.includes('UPDATE') && text.includes('WHERE user_id = $1')) {
      const userId = params[0];
      let count = 0;
      notifications.forEach((n) => {
        if (n.user_id === userId && !n.is_read) {
          n.is_read = true;
          count++;
        }
      });
      return { rowCount: count };
    }

    return { rows: [] };
  },
  end: async () => {},
};

// mock redis - in-memory
const redisStore = {};
const subscribers = [];
const redisMock = {
  incr: async (key) => { redisStore[key] = (parseInt(redisStore[key] || '0') + 1); return redisStore[key]; },
  decr: async (key) => { redisStore[key] = (parseInt(redisStore[key] || '0') - 1); return redisStore[key]; },
  get: async (key) => redisStore[key] !== undefined ? String(redisStore[key]) : null,
  set: async (key, value) => { redisStore[key] = value; return 'OK'; },
  expire: async () => 1,
  publish: async (channel, message) => {
    (subscribers || []).forEach((cb) => cb(channel, message));
    return 1;
  },
  disconnect: () => {},
};

const redisSubMock = {
  subscribe: (channel, cb) => { if (cb) cb(null); },
  on: (event, cb) => {
    if (event === 'message') subscribers.push(cb);
  },
  disconnect: () => {},
};

// inject CJS compliant module mocks into require cache BEFORE any app code loads
const dbModulePath = require.resolve('../../../src/config/database');
const redisModulePath = require.resolve('../../../src/config/redis');

require.cache[dbModulePath] = {
  id: dbModulePath,
  filename: dbModulePath,
  loaded: true,
  children: [],
  exports: dbMock,
};

require.cache[redisModulePath] = {
  id: redisModulePath,
  filename: redisModulePath,
  loaded: true,
  children: [],
  exports: { redis: redisMock, redisSub: redisSubMock },
};

// now load the app
const app = require('../../../src/app');
const socketService = require('../../../src/services/socket.service');
const setupSocket = require('../../../src/sockets/notification.socket');

let server;
let io;

const startServer = () => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

    socketService.init(io);
    setupSocket(io);

    redisSubMock.on('message', (channel, message) => {
      if (channel === 'channel:notifications') {
        const notification = JSON.parse(message);
        socketService.emitToUser(notification.user_id, 'notification:new', notification);
      }
    });

    server.listen(0, () => {
      const port = server.address().port;
      resolve(port);
    });
  });
};

const stopServer = () => {
  return new Promise((resolve) => {
    if (io) io.close();
    if (server) server.close(resolve);
    else resolve();
  });
};

const reset = () => {
  notifications.length = 0;
  if (redisStore) {
    Object.keys(redisStore).forEach((k) => delete redisStore[k]);
  }
};

module.exports = { startServer, stopServer, reset };
