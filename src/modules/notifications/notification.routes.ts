import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { registerDeviceToken } from './fcm.service';
import { prisma } from '../../config/database';
import { ApiResponse } from '../../utils/apiResponse';

const r = Router();
r.use(authenticate);

r.post('/devices/register', async (req, res, next) => {
  try {
    const { fcmToken, deviceInfo } = z.object({ fcmToken: z.string(), deviceInfo: z.string().optional() }).parse(req.body);
    await registerDeviceToken((req as any).user.id, fcmToken, deviceInfo);
    return ApiResponse.success(res, { message: 'ডিভাইস টোকেন রেজিস্টার হয়েছে।' });
  } catch (e) { next(e); }
});

r.get('/me', async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId: (req as any).user.id },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    return ApiResponse.success(res, notifs);
  } catch (e) { next(e); }
});

r.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() },
    });
    return ApiResponse.success(res, { message: 'পড়া হিসেবে চিহ্নিত করা হয়েছে।' });
  } catch (e) { next(e); }
});

export default r;
