import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { ApiResponse } from '../utils/apiResponse';

interface JwtPayload {
  sub: string;
  role: string;
  jti: string;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return ApiResponse.unauthorized(res);
  }

  const token = authHeader.split(' ')[1];

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  } catch {
    return ApiResponse.unauthorized(res, 'টোকেন অবৈধ বা মেয়াদ শেষ।');
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null, status: { not: 'suspended' } },
    select: {
      id: true,
      role: true,
      status: true,
      studentProfile: { select: { id: true } },
      teacherProfile: { select: { id: true } },
    },
  });

  if (!user) {
    return ApiResponse.unauthorized(res, 'ব্যবহারকারী পাওয়া যায়নি।');
  }

  (req as any).user = {
    id: user.id,
    role: user.role,
    status: user.status,
    studentProfileId: user.studentProfile?.id,
    teacherProfileId: user.teacherProfile?.id,
  };

  next();
}
