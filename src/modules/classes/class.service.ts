import { prisma } from '../../config/database';
import { AppError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { sendClassNotification } from '../notifications/fcm.service';

const JITSI_BASE = process.env.JITSI_SERVER_URL || 'https://meet.jit.si';

function makeRoomName(batchId: string): string {
  const ts = Date.now();
  return `sc-${batchId.slice(0, 8)}-${ts}`;
}

export async function startClass(teacherUserId: string, batchId: string) {
  const teacher = await prisma.teacherProfile.findFirst({ where: { userId: teacherUserId } });
  if (!teacher) throw new ForbiddenError('শিক্ষক প্রোফাইল পাওয়া যায়নি।');

  const batch = await prisma.batch.findFirst({
    where: { id: batchId, teacherId: teacher.id, status: 'active' },
    include: { members: { where: { removedAt: null }, include: { student: { include: { user: { include: { deviceTokens: true } } } } } } },
  });
  if (!batch) throw new ForbiddenError('আপনি এই ব্যাচের শিক্ষক নন বা ব্যাচটি সক্রিয় নয়।');

  const existingLive = await prisma.class.findFirst({ where: { batchId, status: 'live' } });
  if (existingLive) {
    return { class: existingLive, roomUrl: `${JITSI_BASE}/${existingLive.livekitRoomName}` };
  }

  const roomName = makeRoomName(batchId);
  const newClass = await prisma.class.create({
    data: { batchId, teacherId: teacher.id, livekitRoomName: roomName, status: 'live', startedAt: new Date() },
  });

  const attendanceData = batch.members.map(m => ({
    classId: newClass.id, studentId: m.studentId, status: 'invited' as const, notifiedAt: new Date(),
  }));
  await prisma.attendance.createMany({ data: attendanceData, skipDuplicates: true });

  const fcmTokens = batch.members.flatMap(m => m.student.user.deviceTokens.map(d => d.fcmToken));
  if (fcmTokens.length > 0) {
    await sendClassNotification(fcmTokens, {
      title: 'ক্লাস শুরু হয়েছে! 📚',
      body: `${batch.name} ক্লাসে এখনই জয়েন করুন`,
      classId: newClass.id,
      batchId,
    });
  }

  return { class: newClass, roomUrl: `${JITSI_BASE}/${roomName}` };
}

export async function joinClass(classId: string, userId: string, role: string, studentProfileId?: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new NotFoundError('ক্লাস পাওয়া যায়নি।');
  if (cls.status !== 'live') throw new AppError('CLASS_NOT_LIVE', 'ক্লাসটি এখন সক্রিয় নয়।', 400);

  if (role === 'student' && studentProfileId) {
    const activeSub = await prisma.subscription.findFirst({
      where: { studentId: studentProfileId, status: 'active', expiresAt: { gt: new Date() } },
    });
    if (!activeSub) {
      throw new AppError('SUBSCRIPTION_EXPIRED', 'আপনার সাবস্ক্রিপশন শেষ হয়ে গেছে। ক্লাসে জয়েন করতে রিনিউ করুন।', 403);
    }
    await prisma.attendance.updateMany({
      where: { classId, studentId: studentProfileId },
      data: { status: 'joined', joinedAt: new Date() },
    });
  }

  return { roomUrl: `${JITSI_BASE}/${cls.livekitRoomName}`, roomName: cls.livekitRoomName };
}

export async function endClass(classId: string, teacherUserId: string) {
  const teacher = await prisma.teacherProfile.findFirst({ where: { userId: teacherUserId } });
  if (!teacher) throw new ForbiddenError();

  const cls = await prisma.class.findFirst({ where: { id: classId, teacherId: teacher.id, status: 'live' } });
  if (!cls) throw new NotFoundError('সক্রিয় ক্লাস পাওয়া যায়নি।');

  await prisma.attendance.updateMany({
    where: { classId, status: 'joined' },
    data: { status: 'joined', leftAt: new Date() },
  });

  return prisma.class.update({
    where: { id: classId },
    data: { status: 'ended', endedAt: new Date() },
  });
}

export async function respondToClass(classId: string, studentProfileId: string, response: 'accepted' | 'declined') {
  return prisma.attendance.updateMany({
    where: { classId, studentId: studentProfileId },
    data: { status: response === 'accepted' ? 'accepted' : 'declined', respondedAt: new Date() },
  });
}

export async function getClassHistory(userId: string, role: string, profileId?: string) {
  if (role === 'teacher') {
    return prisma.class.findMany({
      where: { teacherId: profileId },
      include: { batch: { select: { name: true, subject: true } }, _count: { select: { attendance: true } } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }
  if (role === 'student') {
    return prisma.attendance.findMany({
      where: { studentId: profileId },
      include: { class: { include: { batch: { select: { name: true } } } } },
      orderBy: { class: { startedAt: 'desc' } },
      take: 50,
    });
  }
  return prisma.class.findMany({
    include: { batch: { select: { name: true } }, teacher: { include: { user: { select: { fullName: true } } } } },
    orderBy: { startedAt: 'desc' },
    take: 100,
  });
}

export async function getAttendance(classId: string) {
  return prisma.attendance.findMany({
    where: { classId },
    include: { student: { include: { user: { select: { id: true, fullName: true, profilePhotoUrl: true } } } } },
  });
}
