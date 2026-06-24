import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',

  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  OTP_EXPIRES_MINUTES: parseInt(process.env.OTP_EXPIRES_MINUTES || '5'),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '5'),
  OTP_RATE_LIMIT_PER_HOUR: parseInt(process.env.OTP_RATE_LIMIT_PER_HOUR || '5'),

  SMS_API_KEY: process.env.SMS_API_KEY || '',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || 'SmartCoach',
  SMS_GATEWAY_URL: process.env.SMS_GATEWAY_URL || '',

  BKASH_APP_KEY: process.env.BKASH_APP_KEY || '',
  BKASH_APP_SECRET: process.env.BKASH_APP_SECRET || '',
  BKASH_USERNAME: process.env.BKASH_USERNAME || '',
  BKASH_PASSWORD: process.env.BKASH_PASSWORD || '',
  BKASH_BASE_URL: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',

  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || '',
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
  LIVEKIT_HOST: process.env.LIVEKIT_HOST || '',

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
};
