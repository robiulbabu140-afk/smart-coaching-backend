import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requestOtp } from './otp.service';
import { loginWithPassword, loginWithOtp, refreshAccessToken, logout, logoutAllDevices } from './auth.service';
import { ApiResponse } from '../../utils/apiResponse';
import { prisma } from '../../config/database';
import { serializeUser } from '../users/user.serializer';
import { AppError } from '../../utils/errors';

const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^8801[3-9]\d{8}$/, 'ফোন নম্বর সঠিক ফরম্যাটে দিন (8801XXXXXXXXX)'),
});

const otpVerifySchema = z.object({
  phone: z.string().regex(/^8801[3-9]\d{8}$/),
  otp: z.string().length(6, 'OTP ৬ সংখ্যার হতে হবে'),
  deviceInfo: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const loginSchema = z.object({
  phone: z.string().min(1, 'ফোন নম্বর দিন'),
  password: z.string().min(1, 'পাসওয়ার্ড দিন'),
  deviceInfo: z.string().optional(),
});

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, password, deviceInfo } = loginSchema.parse(req.body);
    const result = await loginWithPassword(phone, password, deviceInfo);
    return ApiResponse.success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function requestOtpHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = phoneSchema.parse(req.body);
    await requestOtp(phone);
    return ApiResponse.success(res, { message: `${phone} নম্বরে OTP পাঠানো হয়েছে।` });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtpHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, otp, deviceInfo } = otpVerifySchema.parse(req.body);
    const result = await loginWithOtp(phone, otp, deviceInfo);
    return ApiResponse.success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refreshTokenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await refreshAccessToken(refreshToken);
    return ApiResponse.success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const { deviceInfo } = req.body;
    await logout(user.id, deviceInfo);
    return ApiResponse.success(res, { message: 'সফলভাবে লগআউট হয়েছে।' });
  } catch (err) {
    next(err);
  }
}

export async function logoutAllHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    await logoutAllDevices(user.id);
    return ApiResponse.success(res, { message: 'সকল ডিভাইস থেকে লগআউট হয়েছে।' });
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const authUser = (req as any).user;

    const user = await prisma.user.findFirst({
      where: { id: authUser.id, deletedAt: null },
      include: { teacherProfile: true, studentProfile: true, adminProfile: true },
    });

    if (!user) throw new AppError('USER_NOT_FOUND', 'ব্যবহারকারী পাওয়া যায়নি।', 404);

    return ApiResponse.success(res, serializeUser(user, user));
  } catch (err) {
    next(err);
  }
}
