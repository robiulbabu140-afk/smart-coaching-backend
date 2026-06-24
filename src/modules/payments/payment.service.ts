import { prisma } from '../../config/database';
import { NotFoundError, AppError } from '../../utils/errors';
import { activateSubscription } from '../subscriptions/subscription.service';
import { sendPaymentNotification } from '../notifications/fcm.service';

export async function submitManualPayment(studentProfileId: string, data: {
  subscriptionId: string;
  amountBdt: number;
  senderMsisdn: string;
  gatewayTxnId?: string;
  manualProofUrl?: string;
}) {
  const sub = await prisma.subscription.findFirst({
    where: { id: data.subscriptionId, studentId: studentProfileId },
  });
  if (!sub) throw new NotFoundError('সাবস্ক্রিপশন পাওয়া যায়নি।');

  const dupCheck = await prisma.payment.findFirst({
    where: { gatewayTxnId: data.gatewayTxnId, status: { not: 'failed' } },
  });
  if (dupCheck && data.gatewayTxnId) {
    throw new AppError('DUPLICATE_PAYMENT', 'এই ট্রানজেকশন ID আগেই ব্যবহার হয়েছে।');
  }

  return prisma.payment.create({
    data: {
      studentId: studentProfileId,
      subscriptionId: data.subscriptionId,
      amountBdt: data.amountBdt,
      method: 'manual',
      status: 'pending',
      senderMsisdn: data.senderMsisdn,
      gatewayTxnId: data.gatewayTxnId,
      manualProofUrl: data.manualProofUrl,
    },
  });
}

export async function approvePayment(paymentId: string, adminId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { include: { user: { include: { deviceTokens: true } } } } },
  });
  if (!payment) throw new NotFoundError('পেমেন্ট পাওয়া যায়নি।');
  if (payment.status !== 'pending') throw new AppError('PAYMENT_NOT_PENDING', 'এই পেমেন্ট ইতোমধ্যে প্রসেস করা হয়েছে।');

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'success', approvedBy: adminId, approvedAt: new Date() },
  });

  if (payment.subscriptionId) {
    await activateSubscription(payment.subscriptionId);
  }

  const tokens = payment.student.user.deviceTokens.map(d => d.fcmToken);
  if (tokens.length > 0) {
    await sendPaymentNotification(tokens, { approved: true });
  }

  return { message: 'পেমেন্ট অনুমোদন করা হয়েছে এবং সাবস্ক্রিপশন সক্রিয় হয়েছে।' };
}

export async function rejectPayment(paymentId: string, adminId: string, reason?: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { include: { user: { include: { deviceTokens: true } } } } },
  });
  if (!payment) throw new NotFoundError('পেমেন্ট পাওয়া যায়নি।');

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'failed', approvedBy: adminId, approvedAt: new Date() },
  });

  const tokens = payment.student.user.deviceTokens.map(d => d.fcmToken);
  if (tokens.length > 0) {
    await sendPaymentNotification(tokens, { approved: false, reason });
  }

  return { message: 'পেমেন্ট বাতিল করা হয়েছে।' };
}

export async function getMyPayments(studentProfileId: string) {
  return prisma.payment.findMany({
    where: { studentId: studentProfileId },
    include: { subscription: { include: { plan: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAllPayments(status?: string) {
  return prisma.payment.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      student: { include: { user: { select: { fullName: true, phone: true } } } },
      subscription: { include: { plan: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
