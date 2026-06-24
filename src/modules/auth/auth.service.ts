import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError, NotFoundError } from '../../utils/errors';
import { verifyOtp } from './otp.service';
import { serializeUser } from '../users/user.serializer';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  role: string;
  jti: string;
}

function generateTokens(userId: string, role: string): TokenPair {
  const jti = uuidv4();

  const accessToken = jwt.sign(
    { sub: userId, role, jti } as JwtPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { sub: userId, role, jti: uuidv4() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken };
}

export async function loginWithPassword(
  phone: string,
  password: string,
  deviceInfo?: string
): Promise<{ tokens: TokenPair; user: object }> {
  const user = await prisma.user.findFirst({
    where: { phone, deletedAt: null },
    include: { teacherProfile: true, studentProfile: true, adminProfile: true },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('INVALID_CREDENTIALS', 'ফোন নম্বর বা পাসওয়ার্ড ভুল।', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('INVALID_CREDENTIALS', 'ফোন নম্বর বা পাসওয়ার্ড ভুল।', 401);
  }

  if (user.status === 'suspended') {
    throw new AppError('ACCOUNT_SUSPENDED', 'আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ করা হয়েছে।', 403);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = generateTokens(user.id, user.role);
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      deviceInfo: deviceInfo || null,
      expiresAt: refreshExpiresAt,
    },
  });

  return { tokens, user: serializeUser(user, user) };
}

export async function loginWithOtp(
  phone: string,
  otp: string,
  deviceInfo?: string
): Promise<{ tokens: TokenPair; user: object; isNewUser: boolean }> {
  await verifyOtp(phone, otp);

  let user = await prisma.user.findFirst({
    where: { phone, deletedAt: null },
    include: {
      teacherProfile: true,
      studentProfile: true,
      adminProfile: true,
    },
  });

  const isNewUser = !user;

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        phoneVerified: true,
        fullName: 'নতুন ব্যবহারকারী',
        role: 'student',
        status: 'pending_approval',
      },
      include: {
        teacherProfile: true,
        studentProfile: true,
        adminProfile: true,
      },
    });
  }

  if (user.status === 'suspended') {
    throw new AppError('ACCOUNT_SUSPENDED', 'আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ করা হয়েছে।', 403);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), phoneVerified: true },
  });

  const tokens = generateTokens(user.id, user.role);

  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      deviceInfo: deviceInfo || null,
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    tokens,
    user: serializeUser(user, user),
    isNewUser,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string }> {
  let payload: JwtPayload;

  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new AppError('INVALID_REFRESH_TOKEN', 'টোকেন অবৈধ বা মেয়াদ শেষ।', 401);
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
  });

  if (!user) throw new NotFoundError('ব্যবহারকারী পাওয়া যায়নি।');

  const storedTokens = await prisma.refreshToken.findMany({
    where: { userId: user.id, isRevoked: false, expiresAt: { gt: new Date() } },
  });

  const isValid = await Promise.any(
    storedTokens.map((t) => bcrypt.compare(refreshToken, t.tokenHash))
  ).catch(() => false);

  if (!isValid) {
    throw new AppError('INVALID_REFRESH_TOKEN', 'টোকেন ব্যবহার করা হয়েছে বা অবৈধ।', 401);
  }

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, jti: uuidv4() },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return { accessToken };
}

export async function logout(userId: string, deviceInfo?: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      ...(deviceInfo ? { deviceInfo } : {}),
      isRevoked: false,
    },
    data: { isRevoked: true },
  });
}

export async function logoutAllDevices(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}
