import { Router } from 'express';
import {
  loginHandler,
  requestOtpHandler,
  verifyOtpHandler,
  refreshTokenHandler,
  logoutHandler,
  logoutAllHandler,
  getMeHandler,
} from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { otpRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/login', loginHandler);
router.post('/otp/request', otpRateLimiter, requestOtpHandler);
router.post('/otp/verify', verifyOtpHandler);
router.post('/refresh', refreshTokenHandler);
router.post('/logout', authenticate, logoutHandler);
router.post('/logout/all', authenticate, logoutAllHandler);
router.get('/me', authenticate, getMeHandler);

export default router;
