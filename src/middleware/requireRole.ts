import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !roles.includes(user.role)) {
      return ApiResponse.forbidden(res);
    }

    next();
  };
}

export function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (user.role === 'teacher' || user.role === 'admin') {
    return next();
  }

  const { prisma } = require('../config/database');

  prisma.subscription
    .findFirst({
      where: {
        studentId: user.studentProfileId,
        status: 'active',
        expiresAt: { gt: new Date() },
      },
    })
    .then((sub: any) => {
      if (!sub) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_EXPIRED',
            message:
              'আপনার সাবস্ক্রিপশন শেষ হয়ে গেছে। ক্লাসে জয়েন করতে রিনিউ করুন।',
          },
        });
      }
      (req as any).activeSubscription = sub;
      next();
    })
    .catch(next);
}
