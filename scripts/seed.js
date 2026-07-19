const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/notification_db';
const SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

const db = new Pool({ connectionString: DATABASE_URL });

const sampleNotifications = [
  { user_id: 'usr_1', type: 'ORDER_SHIPPED', title: 'Order Shipped!', body: 'Your package #8821 has been handed to the carrier.' },
  { user_id: 'usr_1', type: 'SYSTEM_ALERT', title: 'Security Notice', body: 'Your password was updated successfully.' },
  { user_id: 'usr_1', type: 'MENTION', title: 'You were mentioned', body: '@john tagged you in a comment on Project Alpha.' },
  { user_id: 'usr_2', type: 'ORDER_SHIPPED', title: 'Order Delivered', body: 'Your package #9912 was delivered at the front door.' },
  { user_id: 'usr_2', type: 'SYSTEM_ALERT', title: 'New Login Detected', body: 'Login from Chrome on Windows at 192.168.1.42.' },
];

const seed = async () => {
  console.log('Seeding database...\n');

  for (const n of sampleNotifications) {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, $2, $3, $4, $5)`,
      [n.user_id, n.type, n.title, n.body, '{}']
    );
    console.log(`  ✓ ${n.type}: "${n.title}" -> ${n.user_id}`);
  }

  const token = jwt.sign({ user_id: 'usr_1' }, SECRET, { expiresIn: '7d' });

  console.log(`\nSeeded ${sampleNotifications.length} notifications.`);
  console.log(`\nTest token for usr_1:\n${token}\n`);

  await db.end();
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
