import bcrypt from 'bcryptjs';
import { redis, RedisKeys } from '../../config/redis';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSms(phone: string, message: string): Promise<void> {
  if (env.NODE_ENV === 'development') {
    logger.info(`[DEV SMS] To: ${phone} | Message: ${message}`);
    return;
  }

  const response = await fetch(env.SMS_GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_token: env.SMS_API_KEY,
      sid: env.SMS_SENDER_ID,
      sms: message,
      msisdn: phone,
    }),
  });

  if (!response.ok) {
    throw new AppError('SMS_FAILED', 'OTP পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
  }
}

export async function requestOtp(phone: string): Promise<void> {
  const hourlyKey = RedisKeys.otpHourlyCount(phone);
  const hourlyCount = await redis.incr(hourlyKey);

  if (hourlyCount === 1) {
    await redis.expire(hourlyKey, 3600);
  }

  if (hourlyCount > env.OTP_RATE_LIMIT_PER_HOUR) {
    throw new AppError(
      'OTP_RATE_LIMIT',
      `এক ঘণ্টায় সর্বোচ্চ ${env.OTP_RATE_LIMIT_PER_HOUR}টি OTP পাঠানো যাবে। পরে আবার চেষ্টা করুন।`,
      429
    );
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const ttlSeconds = env.OTP_EXPIRES_MINUTES * 60;

  await redis.setex(
    RedisKeys.otp(phone),
    ttlSeconds,
    JSON.stringify({ hash: otpHash, attempts: 0 })
  );

  await prisma.otpRequest.create({
    data: {
      phone,
      otpHash,
      purpose: 'login',
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    },
  });

  await sendSms(phone, `আপনার Smart Coaching OTP: ${otp}। মেয়াদ ${env.OTP_EXPIRES_MINUTES} মিনিট।`);
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const redisKey = RedisKeys.otp(phone);
  const stored = await redis.get(redisKey);

  if (!stored) {
    throw new AppError('OTP_EXPIRED', 'OTP মেয়াদ শেষ হয়ে গেছে। নতুন OTP নিন।', 400);
  }

  const data: { hash: string; attempts: number } = JSON.parse(stored);

  if (data.attempts >= env.OTP_MAX_ATTEMPTS) {
    await redis.del(redisKey);
    throw new AppError(
      'OTP_MAX_ATTEMPTS',
      'অনেকবার ভুল চেষ্টা করা হয়েছে। নতুন OTP নিন।',
      400
    );
  }

  const isValid = await bcrypt.compare(otp, data.hash);

  if (!isValid) {
    data.attempts += 1;
    const ttl = await redis.ttl(redisKey);
    if (ttl > 0) {
      await redis.setex(redisKey, ttl, JSON.stringify(data));
    }
    const remaining = env.OTP_MAX_ATTEMPTS - data.attempts;
    throw new AppError('OTP_INVALID', `ভুল OTP। আরও ${remaining}টি সুযোগ আছে।`, 400);
  }

  await redis.del(redisKey);
  return true;
}
