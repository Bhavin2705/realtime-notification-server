const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redisOptions = {
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  retryStrategy: (times) => Math.min(times * 200, 5000),
};

const redis = new Redis(env.REDIS_URL, redisOptions);
const redisSub = new Redis(env.REDIS_URL, redisOptions);

redis.on('error', (err) => {
  logger.error('Redis Client Error: ' + err.message);
});

redisSub.on('error', (err) => {
  logger.error('Redis Subscriber Error: ' + err.message);
});

redis.on('connect', () => {
  logger.info('Redis Client Connected');
});

redisSub.on('connect', () => {
  logger.info('Redis Subscriber Connected');
});

module.exports = { redis, redisSub };
