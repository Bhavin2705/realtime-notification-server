const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const db = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const initDatabase = async () => {
  try {
    const sqlPath = path.join(__dirname, '..', '..', 'init.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await db.query(sql);
      logger.info('Database schema initialized successfully');
    }
  } catch (err) {
    logger.error('Database schema initialization error', err);
  }
};

module.exports = db;
module.exports.initDatabase = initDatabase;
