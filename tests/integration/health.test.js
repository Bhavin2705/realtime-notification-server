jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  redis: {
    incr: jest.fn().mockResolvedValue(1),
    decr: jest.fn().mockResolvedValue(0),
    get: jest.fn().mockResolvedValue('1'),
    set: jest.fn().mockResolvedValue('OK'),
    expire: jest.fn().mockResolvedValue(1),
    publish: jest.fn().mockResolvedValue(1),
  },
  redisSub: {},
}));

const request = require('supertest');
const app = require('../../src/app');

describe('GET /health', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Unknown routes', () => {
  it('should return 404 for unknown GET routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
  });

  it('should return 401 for unauthenticated notification routes', async () => {
    const res = await request(app).get('/api/v1/notifications/unread');

    expect(res.status).toBe(401);
  });
});
