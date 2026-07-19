const jwt = require('jsonwebtoken');

jest.mock('../../src/config/env', () => ({
  JWT_SECRET: 'test-secret',
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
}));

const setupSocket = require('../../src/sockets/notification.socket');
const logger = require('../../src/utils/logger');

const SECRET = 'test-secret';

const createMockSocket = (token) => {
  const listeners = {};
  return {
    handshake: { auth: { token } },
    user: null,
    join: jest.fn(),
    on: jest.fn((event, handler) => {
      listeners[event] = handler;
    }),
    _listeners: listeners,
  };
};

describe('notification.socket', () => {
  let authMiddleware;
  let connectionHandler;

  beforeEach(() => {
    const middlewares = [];
    const mockIO = {
      use: jest.fn((fn) => middlewares.push(fn)),
      on: jest.fn((event, handler) => {
        if (event === 'connection') connectionHandler = handler;
      }),
    };

    setupSocket(mockIO);
    authMiddleware = middlewares[0];
  });

  describe('handshake auth', () => {
    it('should accept valid JWT and attach user to socket', () => {
      const token = jwt.sign({ user_id: 'usr_1' }, SECRET);
      const socket = createMockSocket(token);
      const next = jest.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.user.user_id).toBe('usr_1');
    });

    it('should reject missing token', () => {
      const socket = createMockSocket(undefined);
      const next = jest.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
    });

    it('should reject invalid token', () => {
      const socket = createMockSocket('garbage-token');
      const next = jest.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Invalid token');
    });

    it('should reject expired token', () => {
      const token = jwt.sign({ user_id: 'usr_1' }, SECRET, { expiresIn: '-1s' });
      const socket = createMockSocket(token);
      const next = jest.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('connection handler', () => {
    it('should join user to correct room and log', () => {
      const token = jwt.sign({ user_id: 'usr_7' }, SECRET);
      const socket = createMockSocket(token);
      socket.user = { user_id: 'usr_7' };

      connectionHandler(socket);

      expect(socket.join).toHaveBeenCalledWith('user:usr_7');
      expect(logger.info).toHaveBeenCalledWith('User usr_7 connected, joined room user:usr_7');
    });

    it('should register notification:ack listener', () => {
      const socket = createMockSocket(null);
      socket.user = { user_id: 'usr_7' };

      connectionHandler(socket);

      expect(socket.on).toHaveBeenCalledWith('notification:ack', expect.any(Function));
    });

    it('should register disconnect listener', () => {
      const socket = createMockSocket(null);
      socket.user = { user_id: 'usr_7' };

      connectionHandler(socket);

      expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should log on notification:ack', () => {
      const socket = createMockSocket(null);
      socket.user = { user_id: 'usr_7' };

      connectionHandler(socket);

      const ackHandler = socket._listeners['notification:ack'];
      ackHandler({ id: 'ntf_99' });

      expect(logger.info).toHaveBeenCalledWith('Notification ntf_99 acknowledged by usr_7');
    });

    it('should log on disconnect', () => {
      const socket = createMockSocket(null);
      socket.user = { user_id: 'usr_7' };

      connectionHandler(socket);

      const disconnectHandler = socket._listeners['disconnect'];
      disconnectHandler();

      expect(logger.info).toHaveBeenCalledWith('User usr_7 disconnected');
    });
  });
});
