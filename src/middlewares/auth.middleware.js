const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === env.ADMIN_API_KEY) {
    req.user = { user_id: 'admin', role: 'admin' };
    return next();
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid token.' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
