import { User, UserRole } from '@prisma/client';

type RequestingUser = { id: string; role: UserRole };

export function serializeUser(target: User & { [key: string]: any }, requesting: RequestingUser) {
  const canSeePhone =
    requesting.role === 'admin' || requesting.id === target.id;

  const base: Record<string, any> = {
    id: target.id,
    fullName: target.fullName,
    profilePhotoUrl: target.profilePhotoUrl,
    role: target.role,
    status: target.status,
    createdAt: target.createdAt,
  };

  if (canSeePhone) {
    base.phone = target.phone;
    base.phoneVerified = target.phoneVerified;
    base.lastLoginAt = target.lastLoginAt;
  }

  if (target.teacherProfile) {
    base.teacherProfile = {
      id: target.teacherProfile.id,
      subjectExpertise: target.teacherProfile.subjectExpertise,
      bio: target.teacherProfile.bio,
      qualification: target.teacherProfile.qualification,
      joiningDate: target.teacherProfile.joiningDate,
      isActive: target.teacherProfile.isActive,
    };
  }

  if (target.studentProfile) {
    base.studentProfile = {
      id: target.studentProfile.id,
      institution: target.studentProfile.institution,
      classLevel: target.studentProfile.classLevel,
      dateOfBirth: target.studentProfile.dateOfBirth,
      ...(canSeePhone && {
        guardianName: target.studentProfile.guardianName,
        guardianPhone: target.studentProfile.guardianPhone,
        address: target.studentProfile.address,
      }),
    };
  }

  return base;
}

export function serializeUserList(
  users: (User & { [key: string]: any })[],
  requesting: RequestingUser
) {
  return users.map((u) => serializeUser(u, requesting));
}
