import { prisma } from '../../config/database';
import { NotFoundError, AppError } from '../../utils/errors';

export async function getPlans() {
  return prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceBdt: 'asc' } });
}

export async function getMySubscription(studentProfileId: string) {
  return prisma.subscription.findFirst({
    where: { studentId: studentProfileId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function subscribe(studentProfileId: string, planId: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('প্ল্যান পাওয়া যায়নি।');

  const existing = await prisma.subscription.findFirst({
    where: { studentId: studentProfileId, status: 'active', expiresAt: { gt: new Date() } },
  });
  if (existing) throw new AppError('ALREADY_SUBSCRIBED', 'আপনার সাবস্ক্রিপশন ইতোমধ্যে সক্রিয় আছে।');

  return prisma.subscription.create({
    data: { studentId: studentProfileId, planId, status: 'pending_payment' },
    include: { plan: true },
  });
}

export async function activateSubscription(subscriptionId: string) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } });
  if (!sub) throw new NotFoundError('সাবস্ক্রিপশন পাওয়া যায়নি।');

  const startsAt = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sub.plan.durationDays);

  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: 'active', startsAt, expiresAt },
  });
}

export async function getAllSubscriptions() {
  return prisma.subscription.findMany({
    include: {
      student: { include: { user: { select: { fullName: true, phone: true } } } },
      plan: { select: { name: true, priceBdt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createPlan(data: { name: string; priceBdt: number; durationDays: number; description?: string }) {
  return prisma.subscriptionPlan.create({ data });
}
