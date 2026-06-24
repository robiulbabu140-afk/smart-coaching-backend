import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { prisma } from '../../config/database';
import { ApiResponse } from '../../utils/apiResponse';
import { serializeUserList } from '../users/user.serializer';

const r = Router();
r.use(authenticate, requireRole(['admin']));

r.get('/dashboard/summary', async (_req, res, next) => {
  try {
    const [totalStudents, totalTeachers, activeBatches, monthRevenue, pendingPayments, liveClasses] = await Promise.all([
      prisma.user.count({ where: { role: 'student', deletedAt: null } }),
      prisma.user.count({ where: { role: 'teacher', deletedAt: null } }),
      prisma.batch.count({ where: { status: 'active' } }),
      prisma.payment.aggregate({
        where: { status: 'success', createdAt: { gte: new Date(new Date().setDate(1)) } },
        _sum: { amountBdt: true },
      }),
      prisma.payment.count({ where: { status: 'pending', method: 'manual' } }),
      prisma.class.count({ where: { status: 'live' } }),
    ]);

    return ApiResponse.success(res, {
      totalStudents, totalTeachers, activeBatches,
      monthRevenueBdt: monthRevenue._sum.amountBdt || 0,
      pendingPayments, liveClasses,
    });
  } catch (e) { next(e); }
});

r.get('/users', async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(role ? { role: role as any } : {}),
        ...(status ? { status: status as any } : {}),
        ...(search ? { fullName: { contains: String(search), mode: 'insensitive' } } : {}),
      },
      include: { teacherProfile: true, studentProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const adminUser = (req as any).user;
    return ApiResponse.success(res, serializeUserList(users, adminUser));
  } catch (e) { next(e); }
});

r.get('/users/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { teacherProfile: true, studentProfile: true, subscriptions: { include: { plan: true } }, payments: true },
    });
    if (!user) return ApiResponse.notFound(res);
    const adminUser = (req as any).user;
    const { serializeUser } = await import('../users/user.serializer');
    return ApiResponse.success(res, serializeUser(user, adminUser));
  } catch (e) { next(e); }
});

r.patch('/users/:id', async (req, res, next) => {
  try {
    const data = z.object({
      fullName: z.string().optional(),
      status: z.enum(['active', 'suspended', 'pending_approval']).optional(),
      role: z.enum(['admin', 'teacher', 'student']).optional(),
    }).parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    return ApiResponse.success(res, user);
  } catch (e) { next(e); }
});

const normalizePhone = (p: string) => p.startsWith('01') ? '880' + p : p;

r.post('/teachers', async (req, res, next) => {
  try {
    const raw = z.object({
      phone: z.string().min(10),
      fullName: z.string().min(2),
      subjectExpertise: z.string().optional(),
      bio: z.string().optional(),
      qualification: z.string().optional(),
    }).parse(req.body);
    const { fullName, subjectExpertise, bio, qualification } = raw;
    const phone = normalizePhone(raw.phone);

    const user = await prisma.user.upsert({
      where: { phone },
      update: { role: 'teacher', status: 'active' },
      create: { phone, fullName, role: 'teacher', status: 'active', phoneVerified: false },
    });

    const profile = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: { subjectExpertise, bio, qualification },
      create: { userId: user.id, subjectExpertise, bio, qualification },
    });

    return ApiResponse.created(res, { user, profile });
  } catch (e) { next(e); }
});

r.post('/students', async (req, res, next) => {
  try {
    const raw = z.object({
      phone: z.string().min(10),
      fullName: z.string().min(2),
      institution: z.string().optional(),
      classLevel: z.string().optional(),
      address: z.string().optional(),
      guardianName: z.string().optional(),
      guardianPhone: z.string().optional(),
    }).parse(req.body);
    const { fullName, institution, classLevel, address, guardianName, guardianPhone } = raw;
    const phone = normalizePhone(raw.phone);

    const user = await prisma.user.upsert({
      where: { phone },
      update: { role: 'student', status: 'active' },
      create: { phone, fullName, role: 'student', status: 'active', phoneVerified: false },
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { institution, classLevel, address, guardianName, guardianPhone },
      create: { userId: user.id, institution, classLevel, address, guardianName, guardianPhone },
    });

    return ApiResponse.created(res, { user, profile });
  } catch (e) { next(e); }
});

// Set monthly fee for a student
r.patch('/students/:userId/fee', async (req, res, next) => {
  try {
    const { monthlyFee } = z.object({ monthlyFee: z.number().min(0) }).parse(req.body);
    const profile = await prisma.studentProfile.update({
      where: { userId: req.params.userId },
      data: { monthlyFee },
    });
    return ApiResponse.success(res, profile);
  } catch (e) { next(e); }
});

// Get all students with payment status for a month
r.get('/payments/monthly', async (req, res, next) => {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0, 7));
    const students = await prisma.studentProfile.findMany({
      include: {
        user: { select: { id: true, fullName: true, phone: true, status: true } },
        payments: { where: { monthLabel: month } },
      },
      orderBy: { user: { fullName: 'asc' } },
    });
    const result = students.map(s => ({
      userId: s.userId,
      studentProfileId: s.id,
      fullName: s.user.fullName,
      phone: s.user.phone,
      status: s.user.status,
      monthlyFee: s.monthlyFee ? Number(s.monthlyFee) : null,
      paid: s.payments.some(p => p.status === 'success'),
      payment: s.payments.find(p => p.status === 'success') || null,
    }));
    return ApiResponse.success(res, result);
  } catch (e) { next(e); }
});

// Record a payment for a student
r.post('/payments/record', async (req, res, next) => {
  try {
    const { userId, amount, month, note } = z.object({
      userId: z.string().uuid(),
      amount: z.number().min(0),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      note: z.string().optional(),
    }).parse(req.body);

    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) return ApiResponse.notFound(res);

    const existing = await prisma.payment.findFirst({
      where: { studentId: profile.id, monthLabel: month, status: 'success' },
    });
    if (existing) return res.status(400).json({ error: { message: 'এই মাসের পেমেন্ট আগেই রেকর্ড হয়েছে।' } });

    const payment = await prisma.payment.create({
      data: {
        studentId: profile.id,
        amountBdt: amount,
        method: 'manual',
        status: 'success',
        monthLabel: month,
        note,
        approvedBy: (req as any).user.id,
        approvedAt: new Date(),
      },
    });
    return ApiResponse.created(res, payment);
  } catch (e) { next(e); }
});

// Delete/cancel a payment
r.delete('/payments/:paymentId', async (req, res, next) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.paymentId } });
    return ApiResponse.success(res, { message: 'পেমেন্ট বাতিল করা হয়েছে।' });
  } catch (e) { next(e); }
});

r.get('/reports/attendance', async (req, res, next) => {
  try {
    const { batchId, from, to } = req.query;
    const data = await prisma.attendance.findMany({
      where: {
        ...(batchId ? { class: { batchId: String(batchId) } } : {}),
        ...(from && to ? { class: { startedAt: { gte: new Date(String(from)), lte: new Date(String(to)) } } } : {}),
      },
      include: {
        class: { include: { batch: { select: { name: true } } } },
        student: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { class: { startedAt: 'desc' } },
    });
    return ApiResponse.success(res, data);
  } catch (e) { next(e); }
});

r.get('/reports/revenue', async (req, res, next) => {
  try {
    const data = await prisma.payment.groupBy({
      by: ['method'],
      where: { status: 'success' },
      _sum: { amountBdt: true },
      _count: true,
    });
    return ApiResponse.success(res, data);
  } catch (e) { next(e); }
});

export default r;
