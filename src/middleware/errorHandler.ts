import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(', ');
    return res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  logger.error('Unhandled error:', err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।',
    },
  });
}
