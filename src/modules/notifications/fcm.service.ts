import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

interface ClassNotificationData { title: string; body: string; classId: string; batchId: string; }
interface PaymentNotificationData { approved: boolean; reason?: string; }

async function sendFcm(tokens: string[], payload: object): Promise<void> {
  if (tokens.length === 0) return;

  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV FCM] Tokens: ${tokens.length} | Payload: ${JSON.stringify(payload)}`);
    return;
  }

  try {
    const { getMessaging } = await import('firebase-admin/messaging');
    await getMessaging().sendEachForMulticast({ tokens, ...(payload as any) });
  } catch (err) {
    logger.error('FCM send error:', err);
  }
}

export async function sendClassNotification(tokens: string[], data: ClassNotificationData) {
  await sendFcm(tokens, {
    notification: { title: data.title, body: data.body },
    data: { type: 'incoming_class_call', class_id: data.classId, batch_id: data.batchId },
    android: { priority: 'high' },
  });

  await prisma.notification.createMany({
    data: tokens.map(() => ({
      userId: 'system',
      type: 'incoming_class_call' as const,
      title: data.title,
      body: data.body,
      data: { classId: data.classId, batchId: data.batchId },
    })).slice(0, 0),
  });
}

export async function sendPaymentNotification(tokens: string[], data: PaymentNotificationData) {
  const title = data.approved ? 'পেমেন্ট অনুমোদিত ✅' : 'পেমেন্ট বাতিল ❌';
  const body = data.approved
    ? 'আপনার সাবস্ক্রিপশন সক্রিয় হয়েছে। এখন ক্লাসে জয়েন করুন!'
    : `পেমেন্ট গ্রহণ করা হয়নি। ${data.reason || 'অ্যাডমিনের সাথে যোগাযোগ করুন।'}`;

  await sendFcm(tokens, {
    notification: { title, body },
    data: { type: data.approved ? 'payment_approved' : 'payment_rejected' },
  });
}

export async function registerDeviceToken(userId: string, fcmToken: string, deviceInfo?: string) {
  return prisma.deviceToken.upsert({
    where: { userId_fcmToken: { userId, fcmToken } },
    update: {},
    create: { userId, fcmToken, deviceInfo },
  });
}
