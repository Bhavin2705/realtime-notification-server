jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  redis: {
    incr: jest.fn(),
    decr: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    expire: jest.fn(),
    publish: jest.fn(),
  },
  redisSub: {},
}));

const db = require('../../src/config/database');
const { redis } = require('../../src/config/redis');
const {
  sendNotification,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
} = require('../../src/services/notification.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendNotification', () => {
  it('should insert notification and publish to redis', async () => {
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
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
    redis.publish.mockResolvedValue(1);

    const result = await sendNotification({
      user_id: 'usr_1',
      type: 'SYSTEM_ALERT',
      title: 'Test',
      body: 'Test body',
      data: {},
    });

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(redis.incr).toHaveBeenCalledWith('unread_count:usr_1');
    expect(redis.publish).toHaveBeenCalledWith(
      'channel:notifications',
      JSON.stringify(mockNotification)
    );
    expect(result).toEqual(mockNotification);
  });
});

describe('getUnreadNotifications', () => {
  it('should return unread notifications with cached count', async () => {
    const mockRows = [{ id: 'ntf_1', title: 'Test' }];
    db.query.mockResolvedValue({ rows: mockRows });
    redis.get.mockResolvedValue('5');

    const result = await getUnreadNotifications('usr_1', 1, 20);

    expect(result.unread_count).toBe(5);
    expect(result.data).toEqual(mockRows);
  });

  it('should fallback to db count when cache is empty', async () => {
    const mockRows = [{ id: 'ntf_1', title: 'Test' }];
    db.query
      .mockResolvedValueOnce({ rows: mockRows })
      .mockResolvedValueOnce({ rows: [{ count: '3' }] });
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');

    const result = await getUnreadNotifications('usr_1', 1, 20);

    expect(result.unread_count).toBe(3);
    expect(redis.set).toHaveBeenCalledWith('unread_count:usr_1', 3, 'EX', 86400);
  });
});

describe('markAsRead', () => {
  it('should mark notification as read and decrement cache', async () => {
    db.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 'ntf_1' }] });
    redis.decr.mockResolvedValue(4);

    const result = await markAsRead('ntf_1', 'usr_1');

    expect(result).toBe(true);
    expect(redis.decr).toHaveBeenCalledWith('unread_count:usr_1');
  });

  it('should return false if notification not found', async () => {
    db.query.mockResolvedValue({ rowCount: 0, rows: [] });

    const result = await markAsRead('ntf_999', 'usr_1');

    expect(result).toBe(false);
    expect(redis.decr).not.toHaveBeenCalled();
  });
});

describe('markAllAsRead', () => {
  it('should mark all as read and reset cache', async () => {
    db.query.mockResolvedValue({ rowCount: 5 });
    redis.set.mockResolvedValue('OK');

    await markAllAsRead('usr_1');

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith('unread_count:usr_1', 0, 'EX', 86400);
  });
});
