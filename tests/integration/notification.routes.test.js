const jwt = require('jsonwebtoken');

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
const db = require('../../src/config/database');

const SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const token = jwt.sign({ user_id: 'usr_1' }, SECRET);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/v1/notifications/send', () => {
  it('should create a notification', async () => {
    const mockNotification = {
      id: 'ntf_123',
      user_id: 'usr_1',
      type: 'SYSTEM_ALERT',
      title: 'Test',
      body: 'Test body',
      data: {},
      is_read: false,
      created_at: new Date().toISOString(),
    };

    db.query.mockResolvedValue({ rows: [mockNotification] });

    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('Authorization', `Bearer ${token}`)
      .send({
        user_id: 'usr_1',
        type: 'SYSTEM_ALERT',
        title: 'Test',
        body: 'Test body',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('ntf_123');
  });

  it('should return 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 'usr_1' });

    expect(res.status).toBe(400);
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .send({ user_id: 'usr_1', type: 'ALERT', title: 'T', body: 'B' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/notifications/unread', () => {
  it('should fetch unread notifications', async () => {
    const mockRows = [{ id: 'ntf_1', title: 'Test', is_read: false }];
    db.query.mockResolvedValue({ rows: mockRows });

    const res = await request(app)
      .get('/api/v1/notifications/unread')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('PATCH /api/v1/notifications/:id/read', () => {
  it('should mark notification as read', async () => {
    db.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 'ntf_1' }] });

    const res = await request(app)
      .patch('/api/v1/notifications/ntf_1/read')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Notification marked as read.');
  });

  it('should return 404 for non-existent notification', async () => {
    db.query.mockResolvedValue({ rowCount: 0, rows: [] });

    const res = await request(app)
      .patch('/api/v1/notifications/ntf_999/read')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/notifications/read-all', () => {
  it('should mark all notifications as read', async () => {
    db.query.mockResolvedValue({ rowCount: 5 });

    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('All notifications marked as read.');
  });
});
