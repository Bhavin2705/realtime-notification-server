const db = require('../config/database');
const { redis } = require('../config/redis');

const CHANNEL = 'channel:notifications';

const sendNotification = async ({ user_id, type, title, body, data }) => {
  const result = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user_id, type, title, body, JSON.stringify(data || {})]
  );

  const notification = result.rows[0];

  // bump the cached unread count so badge updates are instant
  await redis.incr(`unread_count:${user_id}`);
  await redis.expire(`unread_count:${user_id}`, 86400);

  // publish to redis so all server instances can broadcast to the user
  await redis.publish(CHANNEL, JSON.stringify(notification));

  return notification;
};

const getUnreadNotifications = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const result = await db.query(
    `SELECT id, type, title, body, data, is_read, created_at
     FROM notifications
     WHERE user_id = $1 AND is_read = false
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  // try redis cache first for the count, fall back to db if cache is cold
  let unreadCount = await redis.get(`unread_count:${userId}`);

  if (unreadCount === null) {
    const countResult = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    unreadCount = parseInt(countResult.rows[0].count, 10);
    await redis.set(`unread_count:${userId}`, unreadCount, 'EX', 86400);
  }

  return { unread_count: parseInt(unreadCount, 10), data: result.rows };
};

const markAsRead = async (id, userId) => {
  const result = await db.query(
    `UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2 AND is_read = false
     RETURNING *`,
    [id, userId]
  );

  if (result.rowCount > 0) {
    await redis.decr(`unread_count:${userId}`);
  }

  return result.rowCount > 0;
};

const markAllAsRead = async (userId) => {
  await db.query(
    `UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );

  await redis.set(`unread_count:${userId}`, 0, 'EX', 86400);
};

module.exports = { sendNotification, getUnreadNotifications, markAsRead, markAllAsRead };
