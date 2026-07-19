const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const userId = process.argv[2] || 'usr_1';

const token = jwt.sign({ user_id: userId }, SECRET, { expiresIn: '7d' });

console.log(`\nGenerated JWT for user: ${userId}\n`);
console.log(token);
console.log(`\nUse this in the demo client or with curl:\n`);
console.log(`curl http://localhost:3000/api/v1/notifications/unread -H "Authorization: Bearer ${token}"\n`);
