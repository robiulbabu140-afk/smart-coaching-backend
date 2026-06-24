import { prisma } from '../../config/database';
import { AppError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { serializeUserList } from '../users/user.serializer';

export async function createBatch(adminId: string, data: {
  name: string; subject?: string; teacherId?: string;
  scheduleDays?: string[]; scheduleTime?: string;
  maxStudents?: number; minStudents?: number;
}) {
  if (data.teacherId) {
    const teacher = await prisma.teacherProfile.findUnique({ where: { id: data.teacherId } });
    if (!teacher) throw new NotFoundError('শিক্ষক পাওয়া যায়নি।');
  }
  return prisma.batch.create({
    data: {
      name: data.name,
      subject: data.subject,
      teacherId: data.teacherId,
      scheduleDays: data.scheduleDays || [],
      maxStudents: data.maxStudents || 7,
      minStudents: data.minStudents || 5,
      createdBy: adminId,
    },
    include: { teacher: { include: { user: true } } },
  });
}

export async function getBatches(requestingUser: { id: string; role: string; teacherProfileId?: string; studentProfileId?: string }) {
  let where: any = { status: { not: 'archived' } };

  if (requestingUser.role === 'teacher') {
    where.teacherId = requestingUser.teacherProfileId;
  } else if (requestingUser.role === 'student') {
    where.members = { some: { studentId: requestingUser.studentProfileId, removedAt: null } };
  }

  return prisma.batch.findMany({
    where,
    include: {
      teacher: { include: { user: { select: { id: true, fullName: true, profilePhotoUrl: true } } } },
      _count: { select: { members: { where: { removedAt: null } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBatchById(batchId: string, requestingUser: { id: string; role: string }) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      teacher: { include: { user: true } },
      members: {
        where: { removedAt: null },
        include: { student: { include: { user: true } } },
      },
    },
  });

  if (!batch) throw new NotFoundError('ব্যাচ পাওয়া যায়নি।');

  const serializedMembers = batch.members.map(m => ({
    id: m.id,
    joinedAt: m.joinedAt,
    student: {
      id: m.student.id,
      user: requestingUser.role === 'admin'
        ? m.student.user
        : { id: m.student.user.id, fullName: m.student.user.fullName, profilePhotoUrl: m.student.user.profilePhotoUrl, role: m.student.user.role },
    },
  }));

  return { ...batch, members: serializedMembers };
}

export async function addStudentToBatch(batchId: string, studentUserId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { _count: { select: { members: { where: { removedAt: null } } } } },
  });
  if (!batch) throw new NotFoundError('ব্যাচ পাওয়া যায়নি।');
  if (batch._count.members >= batch.maxStudents) {
    throw new AppError('BATCH_FULL', `এই ব্যাচে সর্বোচ্চ ${batch.maxStudents} জন স্টুডেন্ট থাকতে পারে।`);
  }

  const student = await prisma.studentProfile.findFirst({ where: { userId: studentUserId } });
  if (!student) throw new NotFoundError('স্টুডেন্ট প্রোফাইল পাওয়া যায়নি।');

  const existing = await prisma.batchMember.findFirst({
    where: { batchId, studentId: student.id, removedAt: null },
  });
  if (existing) throw new AppError('ALREADY_MEMBER', 'এই স্টুডেন্ট ইতোমধ্যে এই ব্যাচে আছে।');

  return prisma.batchMember.upsert({
    where: { batchId_studentId: { batchId, studentId: student.id } },
    update: { removedAt: null },
    create: { batchId, studentId: student.id },
  });
}

export async function removeStudentFromBatch(batchId: string, studentProfileId: string) {
  const member = await prisma.batchMember.findFirst({
    where: { batchId, studentId: studentProfileId, removedAt: null },
  });
  if (!member) throw new NotFoundError('এই স্টুডেন্ট এই ব্যাচে নেই।');
  return prisma.batchMember.update({
    where: { id: member.id },
    data: { removedAt: new Date() },
  });
}

export async function assignTeacher(batchId: string, teacherUserId: string) {
  const teacher = await prisma.teacherProfile.findFirst({ where: { userId: teacherUserId } });
  if (!teacher) throw new NotFoundError('শিক্ষক প্রোফাইল পাওয়া যায়নি।');
  return prisma.batch.update({ where: { id: batchId }, data: { teacherId: teacher.id } });
}

export async function updateBatch(batchId: string, data: any) {
  return prisma.batch.update({ where: { id: batchId }, data });
}

export async function archiveBatch(batchId: string) {
  return prisma.batch.update({ where: { id: batchId }, data: { status: 'archived' } });
}
