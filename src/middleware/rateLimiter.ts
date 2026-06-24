import rateLimit from 'express-rate-limit';

export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: {
    success: false,
    error: {
      code: 'OTP_RATE_LIMIT',
      message: '১ মিনিটে একটির বেশি OTP রিকোয়েস্ট করা যাবে না।',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.phone || req.ip || 'unknown',
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'অনেক বেশি রিকোয়েস্ট। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
