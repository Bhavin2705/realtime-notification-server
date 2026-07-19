const Redis = require('ioredis');
const env = require('./env');

const redis = new Redis(env.REDIS_URL);
const redisSub = new Redis(env.REDIS_URL);

module.exports = { redis, redisSub };
