import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));

export const RedisKeys = {
  otp: (phone: string) => `otp:${phone}`,
  otpAttempts: (phone: string) => `otp:attempts:${phone}`,
  otpHourlyCount: (phone: string) => `otp:hourly:${phone}`,
  blacklistedToken: (jti: string) => `blacklist:${jti}`,
  rateLimit: (ip: string, route: string) => `rate:${ip}:${route}`,
};
