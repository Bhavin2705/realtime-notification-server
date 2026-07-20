const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/notification_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('super-secret-key-12345'),
  ADMIN_API_KEY: z.string().default('admin-api-key-12345'),
});

const rawEnv = {
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGURL || 'postgres://postgres:postgres@localhost:5432/notification_db',
  REDIS_URL: process.env.REDIS_URL || process.env.REDISURL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-12345',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'admin-api-key-12345',
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
