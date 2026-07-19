const jwt = require('jsonwebtoken');

const SECRET = 'super-secret-key-12345';
const API_KEY = 'admin-api-key-12345';

jest.mock('../../src/config/env', () => ({
  JWT_SECRET: 'super-secret-key-12345',
  ADMIN_API_KEY: 'admin-api-key-12345',
}));

const authMiddleware = require('../../src/middlewares/auth.middleware');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authMiddleware', () => {
  it('should authenticate with valid JWT', () => {
    const token = jwt.sign({ user_id: 'usr_1' }, SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.user_id).toBe('usr_1');
  });

  it('should authenticate with valid API key', () => {
    const req = { headers: { 'x-api-key': API_KEY } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('admin');
  });

  it('should reject invalid API key and missing JWT', () => {
    const req = { headers: { 'x-api-key': 'wrong-key' } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject missing authorization header', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing or invalid token.',
    });
  });

  it('should reject malformed authorization header', () => {
    const req = { headers: { authorization: 'NotBearer abc' } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should reject expired JWT', () => {
    const token = jwt.sign({ user_id: 'usr_1' }, SECRET, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired token.',
    });
  });

  it('should reject JWT signed with wrong secret', () => {
    const token = jwt.sign({ user_id: 'usr_1' }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should prefer API key over JWT when both are present', () => {
    const token = jwt.sign({ user_id: 'usr_1' }, SECRET);
    const req = {
      headers: {
        'x-api-key': API_KEY,
        authorization: `Bearer ${token}`,
      },
    };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('admin');
  });
});
