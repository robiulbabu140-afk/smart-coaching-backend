import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redis: Redis;

try {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.warn('Redis unavailable (OTP features disabled):', err.message));
} catch {
  logger.warn('Redis not configured — OTP rate limiting disabled');
  redis = null as any;
}

export { redis };

export const RedisKeys = {
  otp: (phone: string) => `otp:${phone}`,
  otpAttempts: (phone: string) => `otp:attempts:${phone}`,
  otpHourlyCount: (phone: string) => `otp:hourly:${phone}`,
  blacklistedToken: (jti: string) => `blacklist:${jti}`,
  rateLimit: (ip: string, route: string) => `rate:${ip}:${route}`,
};
